// src/controllers/pipelineController.js
import Lead from '../models/Lead.js';
import Pipeline from '../models/Pipeline.js';
import Timeline from '../models/Timeline.js';
import Notification from '../models/Notification.js';
import Executive from '../models/Executive.js';
import { PIPELINE_STAGES, PIPELINE_STAGES_ORDER } from '../config/constants.js';

// @desc    Get pipeline with leads
// @route   GET /api/pipeline
export const getPipeline = async (req, res) => {
    try {
        const { stage, assignedTo, priority, search } = req.query;
        const stages = Object.values(PIPELINE_STAGES);

        let leadQuery = {};
        if (stage) leadQuery.pipelineStage = stage;
        if (assignedTo) leadQuery.assignedTo = assignedTo;
        if (priority) leadQuery.priority = priority;
        if (search) {
            leadQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const pipeline = await Promise.all(
            stages.map(async (stage) => {
                const query = { ...leadQuery, pipelineStage: stage };

                const leads = await Lead.find(query)
                    .populate('assignedTo', 'name email avatar')
                    .populate('createdBy', 'name')
                    .sort({ updatedAt: -1 })
                    .limit(50);

                const totalValue = leads.reduce((sum, lead) =>
                    sum + (lead.expectedValue || 0), 0
                );

                const averageValue = leads.length ? totalValue / leads.length : 0;

                // Get stage metrics from pipeline model
                const stageMetrics = await Pipeline.aggregate([
                    { $match: { stage } },
                    {
                        $group: {
                            _id: null,
                            avgTimeInStage: { $avg: '$timeInStage' },
                            maxTimeInStage: { $max: '$timeInStage' },
                            totalMoved: { $sum: 1 }
                        }
                    }
                ]);

                return {
                    stage,
                    leads,
                    count: leads.length,
                    totalValue,
                    averageValue,
                    metrics: stageMetrics[0] || {
                        avgTimeInStage: 0,
                        maxTimeInStage: 0,
                        totalMoved: 0
                    }
                };
            })
        );

        // Calculate pipeline metrics
        const metrics = {
            totalLeads: pipeline.reduce((sum, stage) => sum + stage.count, 0),
            totalValue: pipeline.reduce((sum, stage) => sum + stage.totalValue, 0),
            byStage: pipeline.reduce((acc, stage) => {
                acc[stage.stage] = {
                    count: stage.count,
                    value: stage.totalValue
                };
                return acc;
            }, {})
        };

        res.json({
            success: true,
            data: {
                pipeline,
                metrics,
                stages: stages
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get specific pipeline stage
// @route   GET /api/pipeline/stage/:stage
export const getPipelineStage = async (req, res) => {
    try {
        const { stage } = req.params;
        const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const leads = await Lead.find({ pipelineStage: stage })
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name')
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Lead.countDocuments({ pipelineStage: stage });

        // Get stage analytics
        const analytics = await Pipeline.aggregate([
            { $match: { stage } },
            {
                $group: {
                    _id: null,
                    avgTimeInStage: { $avg: '$timeInStage' },
                    totalMoved: { $sum: 1 },
                    uniqueLeads: { $addToSet: '$leadId' }
                }
            }
        ]);

        const totalValue = leads.reduce((sum, lead) => sum + (lead.expectedValue || 0), 0);

        res.json({
            success: true,
            data: {
                stage,
                leads,
                count: leads.length,
                totalValue,
                averageValue: leads.length ? totalValue / leads.length : 0,
                analytics: analytics[0] || {
                    avgTimeInStage: 0,
                    totalMoved: 0
                },
                pagination: {
                    total,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page,
                    limit
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get stage metrics
// @route   GET /api/pipeline/stage/:stage/metrics
export const getStageMetrics = async (req, res) => {
    try {
        const { stage } = req.params;
        const { startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.movedAt = {};
            if (startDate) dateFilter.movedAt.$gte = new Date(startDate);
            if (endDate) dateFilter.movedAt.$lte = new Date(endDate);
        }

        const metrics = await Pipeline.aggregate([
            { $match: { stage, ...dateFilter } },
            {
                $facet: {
                    // Basic stats
                    basic: [
                        {
                            $group: {
                                _id: null,
                                totalEntries: { $sum: 1 },
                                avgTime: { $avg: '$timeInStage' },
                                maxTime: { $max: '$timeInStage' },
                                minTime: { $min: '$timeInStage' },
                                totalValue: { $sum: '$expectedValue' },
                                avgValue: { $avg: '$expectedValue' }
                            }
                        }
                    ],

                    // Movement over time
                    timeline: [
                        {
                            $group: {
                                _id: {
                                    year: { $year: '$movedAt' },
                                    month: { $month: '$movedAt' },
                                    day: { $dayOfMonth: '$movedAt' }
                                },
                                count: { $sum: 1 },
                                avgTime: { $avg: '$timeInStage' }
                            }
                        },
                        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
                        { $limit: 30 }
                    ],

                    // Top movers
                    topMovers: [
                        {
                            $group: {
                                _id: '$movedBy',
                                count: { $sum: 1 },
                                avgTime: { $avg: '$timeInStage' }
                            }
                        },
                        {
                            $lookup: {
                                from: 'executives',
                                localField: '_id',
                                foreignField: '_id',
                                as: 'executive'
                            }
                        },
                        {
                            $project: {
                                executiveName: { $arrayElemAt: ['$executive.name', 0] },
                                count: 1,
                                avgTime: 1
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ],

                    // Value distribution
                    valueDistribution: [
                        {
                            $bucket: {
                                groupBy: '$expectedValue',
                                boundaries: [0, 10000, 50000, 100000, 500000, 1000000],
                                default: 'Other',
                                output: {
                                    count: { $sum: 1 },
                                    totalValue: { $sum: '$expectedValue' }
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        // Get current leads in this stage
        const currentLeads = await Lead.find({ pipelineStage: stage })
            .select('name expectedValue assignedTo createdAt')
            .populate('assignedTo', 'name')
            .sort({ expectedValue: -1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                stage,
                metrics: metrics[0].basic[0] || {
                    totalEntries: 0,
                    avgTime: 0,
                    totalValue: 0
                },
                timeline: metrics[0].timeline,
                topMovers: metrics[0].topMovers,
                valueDistribution: metrics[0].valueDistribution,
                currentLeads
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Move lead between stages
// @route   POST /api/pipeline/move
export const moveLead = async (req, res) => {
    try {
        const { leadId, toStage, fromStage, remarks } = req.body;

        const lead = await Lead.findById(leadId)
            .populate('assignedTo', 'name email');

        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        // Calculate time in previous stage
        const timeInStage = lead.updatedAt ?
            Math.round((Date.now() - lead.updatedAt) / (1000 * 60 * 60)) : 0;

        // Check if this stage transition is valid
        const currentIndex = PIPELINE_STAGES_ORDER.indexOf(lead.pipelineStage);
        const targetIndex = PIPELINE_STAGES_ORDER.indexOf(toStage);

        if (targetIndex < currentIndex && !['Won', 'Lost'].includes(toStage)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot move lead backwards in pipeline'
            });
        }

        // Record pipeline movement
        const pipelineEntry = new Pipeline({
            leadId,
            stage: toStage,
            previousStage: fromStage || lead.pipelineStage,
            movedBy: req.user.id,
            timeInStage,
            remarks,
            expectedValue: lead.expectedValue,
            stageData: {
                before: lead.pipelineStage,
                after: toStage,
                leadName: lead.name,
                assignedTo: lead.assignedTo?.name,
                leadValue: lead.expectedValue
            },
            'stageDuration.enteredAt': new Date()
        });

        await pipelineEntry.save();

        // Update lead stage
        const previousStage = lead.pipelineStage;
        lead.pipelineStage = toStage;
        lead.probability = pipelineEntry.probability;

        // Update status if terminal stage
        if (toStage === PIPELINE_STAGES.WON) {
            lead.status = 'Won';
            lead.wonAt = new Date();

            // Update executive stats
            if (lead.assignedTo) {
                await Executive.findByIdAndUpdate(lead.assignedTo._id, {
                    $inc: { leadsWon: 1 }
                });
            }
        } else if (toStage === PIPELINE_STAGES.LOST) {
            lead.status = 'Lost';
            lead.lostAt = new Date();
            lead.lostReason = remarks;
        }

        await lead.save();

        // Create timeline entry
        await Timeline.create({
            leadId: lead._id,
            type: 'system',
            title: 'Lead Moved in Pipeline',
            description: `Moved from ${previousStage} to ${toStage}`,
            createdBy: req.user.id,
            createdByName: req.user.name,
            metadata: {
                fromStage: previousStage,
                toStage,
                timeInStage,
                remarks
            }
        });

        // Create notification for assigned executive
        if (lead.assignedTo) {
            await Notification.create({
                userId: lead.assignedTo._id,
                type: 'pipeline',
                title: 'Lead Stage Updated',
                message: `${lead.name} moved from ${previousStage} to ${toStage}`,
                priority: toStage === 'Won' ? 'high' : 'medium',
                relatedTo: {
                    model: 'Lead',
                    id: lead._id
                },
                metadata: {
                    fromStage: previousStage,
                    toStage,
                    leadName: lead.name
                }
            });
        }

        // Emit socket event
        const io = req.app.get('io');
        io.emit('pipeline-update', {
            leadId: lead._id,
            fromStage: previousStage,
            toStage,
            lead: lead
        });

        // Check for automation triggers
        if (toStage === 'Quotation Sent') {
            // Trigger quotation follow-up automation
            // await triggerQuotationFollowUp(lead);
        }

        res.json({
            success: true,
            message: 'Lead moved successfully',
            data: {
                lead,
                movement: {
                    fromStage: previousStage,
                    toStage,
                    timeInStage,
                    probability: pipelineEntry.probability
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Bulk move leads
// @route   POST /api/pipeline/bulk-move
export const bulkMoveLeads = async (req, res) => {
    try {
        const { leadIds, toStage, remarks } = req.body;
        const results = {
            successful: [],
            failed: []
        };

        for (const leadId of leadIds) {
            try {
                const lead = await Lead.findById(leadId);
                if (!lead) {
                    results.failed.push({
                        leadId,
                        error: 'Lead not found'
                    });
                    continue;
                }

                // Calculate time in previous stage
                const timeInStage = lead.updatedAt ?
                    Math.round((Date.now() - lead.updatedAt) / (1000 * 60 * 60)) : 0;

                // Record pipeline movement
                await Pipeline.create({
                    leadId,
                    stage: toStage,
                    previousStage: lead.pipelineStage,
                    movedBy: req.user.id,
                    timeInStage,
                    remarks,
                    expectedValue: lead.expectedValue
                });

                // Update lead stage
                lead.pipelineStage = toStage;

                if (toStage === PIPELINE_STAGES.WON) {
                    lead.status = 'Won';
                } else if (toStage === PIPELINE_STAGES.LOST) {
                    lead.status = 'Lost';
                }

                await lead.save();

                results.successful.push({
                    leadId,
                    fromStage: lead.pipelineStage,
                    toStage
                });
            } catch (error) {
                results.failed.push({
                    leadId,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Moved ${results.successful.length} leads, ${results.failed.length} failed`,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get pipeline analytics
// @route   GET /api/pipeline/analytics
export const getPipelineAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.movedAt = {};
            if (startDate) dateFilter.movedAt.$gte = new Date(startDate);
            if (endDate) dateFilter.movedAt.$lte = new Date(endDate);
        }

        const leads = await Lead.find();

        // Get pipeline movements
        const movements = await Pipeline.find(dateFilter)
            .populate('movedBy', 'name')
            .populate('leadId', 'name expectedValue')
            .sort({ movedAt: -1 })
            .limit(100);

        const analytics = await Pipeline.aggregate([
            { $match: dateFilter },
            {
                $facet: {
                    // Stage distribution
                    stageDistribution: [
                        {
                            $group: {
                                _id: '$stage',
                                count: { $sum: 1 },
                                totalValue: { $sum: '$expectedValue' },
                                avgTime: { $avg: '$timeInStage' }
                            }
                        },
                        { $sort: { '_id': 1 } }
                    ],

                    // Movement flow
                    movementFlow: [
                        {
                            $group: {
                                _id: {
                                    from: '$previousStage',
                                    to: '$stage'
                                },
                                count: { $sum: 1 },
                                avgTime: { $avg: '$timeInStage' }
                            }
                        },
                        { $match: { '_id.from': { $ne: null } } }
                    ],

                    // Time analysis
                    timeAnalysis: [
                        {
                            $group: {
                                _id: '$stage',
                                avgTime: { $avg: '$timeInStage' },
                                minTime: { $min: '$timeInStage' },
                                maxTime: { $max: '$timeInStage' },
                                medianTime: { $avg: '$timeInStage' } // Simplified
                            }
                        }
                    ],

                    // User activity
                    userActivity: [
                        {
                            $group: {
                                _id: '$movedBy',
                                moves: { $sum: 1 },
                                avgTime: { $avg: '$timeInStage' }
                            }
                        },
                        {
                            $lookup: {
                                from: 'executives',
                                localField: '_id',
                                foreignField: '_id',
                                as: 'user'
                            }
                        },
                        {
                            $project: {
                                userName: { $arrayElemAt: ['$user.name', 0] },
                                moves: 1,
                                avgTime: 1
                            }
                        },
                        { $sort: { moves: -1 } },
                        { $limit: 10 }
                    ],

                    // Daily trend
                    dailyTrend: [
                        {
                            $group: {
                                _id: {
                                    year: { $year: '$movedAt' },
                                    month: { $month: '$movedAt' },
                                    day: { $dayOfMonth: '$movedAt' }
                                },
                                count: { $sum: 1 },
                                totalValue: { $sum: '$expectedValue' }
                            }
                        },
                        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
                        { $limit: 30 }
                    ]
                }
            }
        ]);

        // Calculate conversion rates
        const stages = Object.values(PIPELINE_STAGES);
        const byStage = {};
        stages.forEach(stage => {
            byStage[stage] = leads.filter(l => l.pipelineStage === stage).length;
        });

        const totalProcessed = byStage[PIPELINE_STAGES.WON] + byStage[PIPELINE_STAGES.LOST];

        const conversionRates = {
            toWon: totalProcessed ?
                ((byStage[PIPELINE_STAGES.WON] / totalProcessed) * 100).toFixed(1) : 0,
            toLost: totalProcessed ?
                ((byStage[PIPELINE_STAGES.LOST] / totalProcessed) * 100).toFixed(1) : 0,
            overall: leads.length ?
                ((byStage[PIPELINE_STAGES.WON] / leads.length) * 100).toFixed(1) : 0
        };

        // Funnel data
        const funnel = stages.map(stage => ({
            stage,
            count: byStage[stage],
            value: leads
                .filter(l => l.pipelineStage === stage)
                .reduce((sum, l) => sum + (l.expectedValue || 0), 0)
        }));

        res.json({
            success: true,
            data: {
                summary: {
                    totalLeads: leads.length,
                    totalValue: leads.reduce((sum, l) => sum + (l.expectedValue || 0), 0),
                    conversionRates
                },
                funnel,
                analytics: analytics[0],
                recentMovements: movements
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get pipeline forecast
// @route   GET /api/pipeline/forecast
export const getPipelineForecast = async (req, res) => {
    try {
        const activeLeads = await Lead.find({
            pipelineStage: { $nin: [PIPELINE_STAGES.WON, PIPELINE_STAGES.LOST] }
        }).populate('assignedTo', 'name');

        // Get historical conversion data
        const historicalData = await Pipeline.aggregate([
            {
                $match: {
                    stage: { $in: [PIPELINE_STAGES.WON, PIPELINE_STAGES.LOST] }
                }
            },
            {
                $group: {
                    _id: {
                        stage: '$stage',
                        month: { $month: '$movedAt' },
                        year: { $year: '$movedAt' }
                    },
                    count: { $sum: 1 },
                    avgValue: { $avg: '$expectedValue' },
                    totalValue: { $sum: '$expectedValue' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        // Calculate weighted probabilities by stage
        const stageProbabilities = {
            'New Lead': 0.1,
            'Contacted': 0.2,
            'Requirement Identified': 0.4,
            'Quotation Sent': 0.6,
            'Follow-Up': 0.7,
            'Negotiation': 0.8
        };

        // Current pipeline value
        const currentValue = {
            total: 0,
            weighted: 0,
            byStage: {}
        };

        activeLeads.forEach(lead => {
            const value = lead.expectedValue || 0;
            const probability = stageProbabilities[lead.pipelineStage] || 0;

            currentValue.total += value;
            currentValue.weighted += value * probability;

            if (!currentValue.byStage[lead.pipelineStage]) {
                currentValue.byStage[lead.pipelineStage] = {
                    count: 0,
                    value: 0,
                    weighted: 0
                };
            }

            currentValue.byStage[lead.pipelineStage].count++;
            currentValue.byStage[lead.pipelineStage].value += value;
            currentValue.byStage[lead.pipelineStage].weighted += value * probability;
        });

        // Projection based on historical trends
        const avgMonthlyWon = historicalData
            .filter(d => d._id.stage === 'Won')
            .reduce((sum, d) => sum + d.count, 0) / 12 || 0;

        const avgMonthlyValue = historicalData
            .filter(d => d._id.stage === 'Won')
            .reduce((sum, d) => sum + d.totalValue, 0) / 12 || 0;

        const projection = {
            next30Days: {
                leads: Math.round(activeLeads.length * 0.1),
                value: currentValue.weighted * 0.1
            },
            next60Days: {
                leads: Math.round(activeLeads.length * 0.2),
                value: currentValue.weighted * 0.2
            },
            next90Days: {
                leads: Math.round(activeLeads.length * 0.3),
                value: currentValue.weighted * 0.3
            },
            monthlyAverage: {
                leads: Math.round(avgMonthlyWon),
                value: avgMonthlyValue
            }
        };

        res.json({
            success: true,
            data: {
                current: {
                    totalLeads: activeLeads.length,
                    ...currentValue
                },
                projection,
                historicalData,
                stageProbabilities
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get conversion rates
// @route   GET /api/pipeline/conversion-rates
export const getConversionRates = async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;

        let groupBy;
        if (period === 'daily') {
            groupBy = { year: { $year: '$movedAt' }, month: { $month: '$movedAt' }, day: { $dayOfMonth: '$movedAt' } };
        } else if (period === 'weekly') {
            groupBy = { year: { $year: '$movedAt' }, week: { $week: '$movedAt' } };
        } else if (period === 'quarterly') {
            groupBy = { year: { $year: '$movedAt' }, quarter: { $ceil: { $divide: [{ $month: '$movedAt' }, 3] } } };
        } else {
            groupBy = { year: { $year: '$movedAt' }, month: { $month: '$movedAt' } };
        }

        const conversionData = await Pipeline.aggregate([
            {
                $match: {
                    stage: { $in: ['Won', 'Lost'] }
                }
            },
            {
                $group: {
                    _id: groupBy,
                    won: {
                        $sum: { $cond: [{ $eq: ['$stage', 'Won'] }, 1, 0] }
                    },
                    lost: {
                        $sum: { $cond: [{ $eq: ['$stage', 'Lost'] }, 1, 0] }
                    },
                    wonValue: {
                        $sum: { $cond: [{ $eq: ['$stage', 'Won'] }, '$expectedValue', 0] }
                    },
                    lostValue: {
                        $sum: { $cond: [{ $eq: ['$stage', 'Lost'] }, '$expectedValue', 0] }
                    }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Calculate stage-wise conversion
        const stageConversion = await Pipeline.aggregate([
            {
                $group: {
                    _id: '$previousStage',
                    entered: { $sum: 1 },
                    converted: {
                        $sum: { $cond: [{ $eq: ['$stage', 'Won'] }, 1, 0] }
                    },
                    totalValue: {
                        $sum: { $cond: [{ $eq: ['$stage', 'Won'] }, '$expectedValue', 0] }
                    }
                }
            },
            {
                $project: {
                    stage: '$_id',
                    entered: 1,
                    converted: 1,
                    conversionRate: {
                        $multiply: [{ $divide: ['$converted', '$entered'] }, 100]
                    },
                    totalValue: 1,
                    avgValue: { $divide: ['$totalValue', '$converted'] }
                }
            },
            { $match: { stage: { $ne: null } } }
        ]);

        res.json({
            success: true,
            data: {
                period,
                timeline: conversionData,
                stageWise: stageConversion,
                overall: {
                    totalWon: conversionData.reduce((sum, d) => sum + d.won, 0),
                    totalLost: conversionData.reduce((sum, d) => sum + d.lost, 0),
                    totalValue: conversionData.reduce((sum, d) => sum + d.wonValue, 0)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get velocity metrics
// @route   GET /api/pipeline/velocity
export const getVelocityMetrics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.movedAt = {};
            if (startDate) dateFilter.movedAt.$gte = new Date(startDate);
            if (endDate) dateFilter.movedAt.$lte = new Date(endDate);
        }

        const velocity = await Pipeline.aggregate([
            { $match: dateFilter },
            {
                $facet: {
                    // Average time through pipeline
                    overallVelocity: [
                        {
                            $match: { stage: 'Won' }
                        },
                        {
                            $group: {
                                _id: null,
                                avgDaysToWin: { $avg: '$timeInStage' },
                                minDaysToWin: { $min: '$timeInStage' },
                                maxDaysToWin: { $max: '$timeInStage' },
                                totalWon: { $sum: 1 }
                            }
                        }
                    ],

                    // Stage-wise velocity
                    stageVelocity: [
                        {
                            $group: {
                                _id: '$stage',
                                avgTime: { $avg: '$timeInStage' },
                                minTime: { $min: '$timeInStage' },
                                maxTime: { $max: '$timeInStage' },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { '_id': 1 } }
                    ],

                    // Executive velocity
                    executiveVelocity: [
                        {
                            $group: {
                                _id: '$movedBy',
                                avgTime: { $avg: '$timeInStage' },
                                moves: { $sum: 1 },
                                totalValue: { $sum: '$expectedValue' }
                            }
                        },
                        {
                            $lookup: {
                                from: 'executives',
                                localField: '_id',
                                foreignField: '_id',
                                as: 'executive'
                            }
                        },
                        {
                            $project: {
                                executiveName: { $arrayElemAt: ['$executive.name', 0] },
                                avgTime: 1,
                                moves: 1,
                                totalValue: 1
                            }
                        },
                        { $sort: { avgTime: 1 } },
                        { $limit: 10 }
                    ],

                    // Velocity trend over time
                    velocityTrend: [
                        {
                            $group: {
                                _id: {
                                    year: { $year: '$movedAt' },
                                    month: { $month: '$movedAt' }
                                },
                                avgTime: { $avg: '$timeInStage' },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { '_id.year': 1, '_id.month': 1 } },
                        { $limit: 12 }
                    ]
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                overall: velocity[0].overallVelocity[0] || {
                    avgDaysToWin: 0,
                    totalWon: 0
                },
                stageWise: velocity[0].stageVelocity,
                executiveWise: velocity[0].executiveVelocity,
                trend: velocity[0].velocityTrend,
                period: { startDate, endDate }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get pipeline settings
// @route   GET /api/pipeline/settings
export const getPipelineSettings = async (req, res) => {
    try {
        // This could be stored in a separate Settings model
        const settings = {
            stages: PIPELINE_STAGES_ORDER,
            defaultProbabilities: {
                'New Lead': 10,
                'Contacted': 20,
                'Requirement Identified': 40,
                'Quotation Sent': 60,
                'Follow-Up': 70,
                'Negotiation': 80,
                'Won': 100,
                'Lost': 0
            },
            automation: {
                enableAutoMove: true,
                enableNotifications: true,
                enableReminders: true
            },
            validation: {
                requireRemarks: true,
                preventBackwardMove: true,
                requireChecklist: false
            },
            display: {
                showProbability: true,
                showExpectedValue: true,
                showTimeInStage: true
            }
        };

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Update pipeline settings
// @route   PUT /api/pipeline/settings
export const updatePipelineSettings = async (req, res) => {
    try {
        const settings = req.body;

        // Here you would save to database
        // For now, just return success

        res.json({
            success: true,
            message: 'Pipeline settings updated successfully',
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get stage history for a lead
// @route   GET /api/pipeline/lead/:leadId/history
export const getLeadPipelineHistory = async (req, res) => {
    try {
        const { leadId } = req.params;

        const history = await Pipeline.find({ leadId })
            .populate('movedBy', 'name email avatar')
            .sort({ movedAt: -1 });

        // Calculate time spent in each stage
        const stageTimes = {};
        let totalTime = 0;

        history.forEach((entry, index) => {
            if (entry.timeInStage) {
                stageTimes[entry.stage] = (stageTimes[entry.stage] || 0) + entry.timeInStage;
                totalTime += entry.timeInStage;
            }
        });

        res.json({
            success: true,
            data: {
                leadId,
                history,
                summary: {
                    totalMoves: history.length,
                    totalTimeInPipeline: totalTime,
                    stageTimes,
                    currentStage: history[0]?.stage
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export default {
    getPipeline,
    getPipelineStage,
    moveLead,
    getPipelineAnalytics,
    getLeadPipelineHistory,
    getPipelineForecast,
    getStageMetrics,
    bulkMoveLeads,
    getPipelineSettings,
    updatePipelineSettings,
    getConversionRates,
    getVelocityMetrics
};