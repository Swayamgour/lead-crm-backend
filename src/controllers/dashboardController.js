// src/controllers/dashboardController.js
import Lead from '../models/Lead.js';
import Executive from '../models/Executive.js';
import FollowUp from '../models/FollowUp.js';
import Timeline from '../models/Timeline.js';
import Notification from '../models/Notification.js';
import Pipeline from '../models/Pipeline.js';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
export const getDashboardStats = async (req, res) => {
    try {
        const { period = 'month', startDate, endDate } = req.query;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        // Determine date range based on period
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
        }

        // Parallel queries for better performance
        const [
            totalLeads,
            newLeadsToday,
            newLeadsThisWeek,
            newLeadsThisMonth,
            newLeadsThisQuarter,
            newLeadsThisYear,
            activeLeads,
            wonLeads,
            lostLeads,
            totalExecutives,
            activeExecutives,
            executivesOnLeave,
            todayFollowUps,
            upcomingFollowUps,
            overdueFollowUps,
            completedFollowUpsToday,
            totalPipelineValue,
            monthlyRevenue,
            averageDealSize,
            averageConversionTime,
            leadResponseTime
        ] = await Promise.all([
            // Basic counts
            Lead.countDocuments(dateFilter),
            Lead.countDocuments({ createdAt: { $gte: today } }),
            Lead.countDocuments({ createdAt: { $gte: startOfWeek } }),
            Lead.countDocuments({ createdAt: { $gte: startOfMonth } }),
            Lead.countDocuments({ createdAt: { $gte: startOfQuarter } }),
            Lead.countDocuments({ createdAt: { $gte: startOfYear } }),

            // Status based
            Lead.countDocuments({
                status: { $in: ['Incoming', 'Interested', 'Ongoing'] }
            }),
            Lead.countDocuments({ status: 'Won' }),
            Lead.countDocuments({ status: 'Lost' }),

            // Executive stats
            Executive.countDocuments(),
            Executive.countDocuments({ status: 'active' }),
            Executive.countDocuments({ status: 'on-leave' }),

            // Follow-up stats
            FollowUp.countDocuments({
                followUpDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
                status: 'pending'
            }),
            FollowUp.countDocuments({
                followUpDate: { $gt: today },
                status: 'pending'
            }),
            FollowUp.countDocuments({
                followUpDate: { $lt: today },
                status: 'pending'
            }),
            FollowUp.countDocuments({
                followUpDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
                status: 'completed'
            }),

            // Value metrics
            Lead.aggregate([
                { $match: { pipelineStage: { $nin: ['Won', 'Lost'] } } },
                { $group: { _id: null, total: { $sum: '$expectedValue' } } }
            ]),

            // Monthly revenue
            Lead.aggregate([
                {
                    $match: {
                        status: 'Won',
                        createdAt: { $gte: startOfYear }
                    }
                },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        total: { $sum: '$expectedValue' }
                    }
                },
                { $sort: { '_id': 1 } }
            ]),

            // Average deal size
            Lead.aggregate([
                { $match: { status: 'Won' } },
                { $group: { _id: null, avgValue: { $avg: '$expectedValue' } } }
            ]),

            // Average conversion time
            Pipeline.aggregate([
                { $match: { stage: 'Won' } },
                { $group: { _id: null, avgTime: { $avg: '$timeInStage' } } }
            ]),

            // Average response time
            Timeline.aggregate([
                { $match: { type: 'call' } },
                { $group: { _id: null, avgResponseTime: { $avg: '$responseTime' } } }
            ])
        ]);

        // Get leads by status for charts
        const leadsByStatus = await Lead.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Get leads by source
        const leadsBySource = await Lead.aggregate([
            { $group: { _id: '$source', count: { $sum: 1 } } }
        ]);

        // Get recent activities
        const recentActivities = await Timeline.find(dateFilter)
            .populate('leadId', 'name')
            .populate('createdBy', 'name avatar')
            .sort({ date: -1 })
            .limit(20);

        // Get top performing executives
        const topExecutives = await Executive.aggregate([
            { $match: { status: 'active' } },
            {
                $lookup: {
                    from: 'leads',
                    localField: '_id',
                    foreignField: 'assignedTo',
                    as: 'leads'
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    avatar: 1,
                    totalLeads: { $size: '$leads' },
                    wonLeads: {
                        $size: {
                            $filter: {
                                input: '$leads',
                                cond: { $eq: ['$$this.status', 'Won'] }
                            }
                        }
                    },
                    totalValue: {
                        $sum: {
                            $map: {
                                input: '$leads',
                                as: 'lead',
                                in: { $ifNull: ['$$lead.expectedValue', 0] }
                            }
                        }
                    },
                    conversionRate: {
                        $multiply: [
                            {
                                $divide: [
                                    { $size: { $filter: { input: '$leads', cond: { $eq: ['$$this.status', 'Won'] } } } },
                                    { $size: '$leads' }
                                ]
                            },
                            100
                        ]
                    }
                }
            },
            { $sort: { wonLeads: -1 } },
            { $limit: 5 }
        ]);

        // Get pipeline distribution
        const pipelineDistribution = await Lead.aggregate([
            {
                $group: {
                    _id: '$pipelineStage',
                    count: { $sum: 1 },
                    value: { $sum: '$expectedValue' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Get weekly trends
        const weeklyTrends = await Lead.aggregate([
            { $match: { createdAt: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) } } },
            {
                $group: {
                    _id: { $dayOfWeek: '$createdAt' },
                    count: { $sum: 1 },
                    value: { $sum: '$expectedValue' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Get performance metrics
        const performanceMetrics = await Lead.aggregate([
            {
                $facet: {
                    daily: [
                        { $match: { createdAt: { $gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
                        {
                            $group: {
                                _id: { $dayOfMonth: '$createdAt' },
                                leads: { $sum: 1 },
                                value: { $sum: '$expectedValue' }
                            }
                        },
                        { $sort: { '_id': 1 } }
                    ],
                    monthly: [
                        { $match: { createdAt: { $gte: startOfYear } } },
                        {
                            $group: {
                                _id: { $month: '$createdAt' },
                                leads: { $sum: 1 },
                                value: { $sum: '$expectedValue' }
                            }
                        },
                        { $sort: { '_id': 1 } }
                    ]
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalLeads,
                    newLeads: {
                        today: newLeadsToday,
                        week: newLeadsThisWeek,
                        month: newLeadsThisMonth,
                        quarter: newLeadsThisQuarter,
                        year: newLeadsThisYear
                    },
                    activeLeads,
                    wonLeads,
                    lostLeads,
                    totalExecutives,
                    activeExecutives,
                    executivesOnLeave,
                    followUps: {
                        today: todayFollowUps,
                        upcoming: upcomingFollowUps,
                        overdue: overdueFollowUps,
                        completed: completedFollowUpsToday
                    },
                    conversionRate: totalLeads ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0,
                    totalPipelineValue: totalPipelineValue[0]?.total || 0,
                    averageDealSize: averageDealSize[0]?.avgValue || 0,
                    averageConversionTime: averageConversionTime[0]?.avgTime || 0,
                    averageResponseTime: leadResponseTime[0]?.avgResponseTime || 0
                },
                charts: {
                    leadsByStatus,
                    leadsBySource,
                    pipelineDistribution,
                    weeklyTrends,
                    monthlyRevenue,
                    performance: performanceMetrics[0]
                },
                topPerformers: topExecutives,
                recentActivities,
                period: { startDate, endDate, period }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get manager dashboard
// @route   GET /api/dashboard/manager
export const getManagerDashboard = async (req, res) => {
    try {
        const { teamId, period = 'month' } = req.query;

        let executiveQuery = {};
        if (teamId) {
            executiveQuery.team = teamId;
        } else if (req.user.role === 'manager') {
            // If manager, get their team
            executiveQuery.reportingManager = req.user.id;
        }

        const teamExecutives = await Executive.find(executiveQuery)
            .select('name email role status avatar');

        const executiveIds = teamExecutives.map(e => e._id);

        // Get date range for period
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate = new Date(today);
        if (period === 'week') startDate.setDate(today.getDate() - 7);
        else if (period === 'month') startDate.setMonth(today.getMonth() - 1);
        else if (period === 'quarter') startDate.setMonth(today.getMonth() - 3);

        const [
            teamLeads,
            teamFollowUps,
            teamPerformance,
            teamActivities,
            teamStats
        ] = await Promise.all([
            // Team leads with details
            Lead.find({
                assignedTo: { $in: executiveIds },
                createdAt: { $gte: startDate }
            })
                .populate('assignedTo', 'name')
                .sort({ createdAt: -1 })
                .limit(100),

            // Team follow-ups
            FollowUp.find({
                assignedTo: { $in: executiveIds },
                followUpDate: { $gte: startDate }
            })
                .populate('leadId', 'name')
                .populate('assignedTo', 'name')
                .sort({ followUpDate: 1 })
                .limit(50),

            // Executive performance metrics
            Executive.aggregate([
                { $match: { _id: { $in: executiveIds } } },
                {
                    $lookup: {
                        from: 'leads',
                        localField: '_id',
                        foreignField: 'assignedTo',
                        as: 'leads'
                    }
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        avatar: 1,
                        totalLeads: { $size: '$leads' },
                        wonLeads: {
                            $size: {
                                $filter: {
                                    input: '$leads',
                                    cond: { $eq: ['$$this.status', 'Won'] }
                                }
                            }
                        },
                        totalValue: {
                            $sum: {
                                $map: {
                                    input: '$leads',
                                    as: 'lead',
                                    in: { $ifNull: ['$$lead.expectedValue', 0] }
                                }
                            }
                        },
                        leadsThisPeriod: {
                            $size: {
                                $filter: {
                                    input: '$leads',
                                    cond: { $gte: ['$$this.createdAt', startDate] }
                                }
                            }
                        }
                    }
                }
            ]),

            // Team activities
            Timeline.find({
                createdBy: { $in: executiveIds },
                date: { $gte: startDate }
            })
                .populate('createdBy', 'name')
                .populate('leadId', 'name')
                .sort({ date: -1 })
                .limit(50),

            // Team statistics
            Promise.all([
                Lead.countDocuments({ assignedTo: { $in: executiveIds } }),
                Lead.countDocuments({
                    assignedTo: { $in: executiveIds },
                    status: 'Won'
                }),
                FollowUp.countDocuments({
                    assignedTo: { $in: executiveIds },
                    status: 'pending'
                }),
                Executive.countDocuments({
                    _id: { $in: executiveIds },
                    status: 'active'
                })
            ])
        ]);

        const teamSummary = {
            totalExecutives: teamExecutives.length,
            activeExecutives: teamStats[3],
            totalLeads: teamStats[0],
            wonLeads: teamStats[1],
            pendingFollowUps: teamStats[2],
            teamPerformance,
            recentActivities: teamActivities.slice(0, 20),
            recentFollowUps: teamFollowUps.slice(0, 10),
            recentLeads: teamLeads.slice(0, 10),
            conversionRate: teamStats[0] ? ((teamStats[1] / teamStats[0]) * 100).toFixed(1) : 0
        };

        // Calculate team averages
        const avgPerformance = {
            avgLeadsPerExecutive: teamStats[0] / teamExecutives.length || 0,
            avgWonPerExecutive: teamStats[1] / teamExecutives.length || 0,
            avgConversionRate: teamSummary.conversionRate
        };

        res.json({
            success: true,
            data: {
                team: teamExecutives,
                summary: teamSummary,
                averages: avgPerformance,
                period,
                startDate
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get executive dashboard
// @route   GET /api/dashboard/executive
export const getExecutiveDashboard = async (req, res) => {
    try {
        const executiveId = req.user.id;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [
            myLeads,
            myFollowUps,
            myActivities,
            myStats,
            myPerformance,
            upcomingDeadlines,
            recentWins
        ] = await Promise.all([
            // My leads
            Lead.find({ assignedTo: executiveId })
                .sort({ createdAt: -1 })
                .limit(10),

            // My follow-ups
            FollowUp.find({
                assignedTo: executiveId,
                followUpDate: { $gte: today },
                status: 'pending'
            })
                .populate('leadId', 'name phone product')
                .sort({ followUpDate: 1 })
                .limit(20),

            // My activities
            Timeline.find({ createdBy: executiveId })
                .populate('leadId', 'name')
                .sort({ date: -1 })
                .limit(20),

            // My statistics
            Lead.aggregate([
                { $match: { assignedTo: executiveId } },
                {
                    $group: {
                        _id: null,
                        totalLeads: { $sum: 1 },
                        wonLeads: {
                            $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] }
                        },
                        lostLeads: {
                            $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] }
                        },
                        totalValue: { $sum: '$expectedValue' },
                        wonValue: {
                            $sum: { $cond: [{ $eq: ['$status', 'Won'] }, '$expectedValue', 0] }
                        }
                    }
                }
            ]),

            // Performance metrics
            Promise.all([
                Lead.countDocuments({
                    assignedTo: executiveId,
                    createdAt: { $gte: startOfWeek }
                }),
                Lead.countDocuments({
                    assignedTo: executiveId,
                    status: 'Won',
                    createdAt: { $gte: startOfWeek }
                }),
                FollowUp.countDocuments({
                    assignedTo: executiveId,
                    status: 'completed',
                    completedAt: { $gte: today }
                }),
                FollowUp.countDocuments({
                    assignedTo: executiveId,
                    status: 'overdue'
                })
            ]),

            // Upcoming deadlines
            FollowUp.find({
                assignedTo: executiveId,
                followUpDate: { $gte: today, $lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
                status: 'pending'
            })
                .populate('leadId', 'name product')
                .sort({ followUpDate: 1 })
                .limit(5),

            // Recent wins
            Lead.find({
                assignedTo: executiveId,
                status: 'Won',
                wonAt: { $gte: startOfMonth }
            })
                .sort({ wonAt: -1 })
                .limit(5)
        ]);

        const stats = myStats[0] || {
            totalLeads: 0,
            wonLeads: 0,
            lostLeads: 0,
            totalValue: 0,
            wonValue: 0
        };

        stats.conversionRate = stats.totalLeads ?
            ((stats.wonLeads / stats.totalLeads) * 100).toFixed(1) : 0;

        stats.weeklyLeads = myPerformance[0] || 0;
        stats.weeklyWins = myPerformance[1] || 0;
        stats.todayCompleted = myPerformance[2] || 0;
        stats.overdueCount = myPerformance[3] || 0;

        // Calculate daily targets
        const workingDaysInMonth = 22;
        const dailyTarget = Math.ceil((stats.weeklyLeads / 5) * 100) / 100 || 0;

        res.json({
            success: true,
            data: {
                profile: req.user,
                stats,
                targets: {
                    daily: dailyTarget,
                    weekly: stats.weeklyLeads,
                    monthly: stats.totalLeads,
                    achievement: stats.totalLeads ?
                        ((stats.weeklyLeads / (stats.totalLeads / 4)) * 100).toFixed(1) : 0
                },
                myLeads,
                myFollowUps,
                myActivities,
                upcomingDeadlines,
                recentWins,
                today: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get KPI data
// @route   GET /api/dashboard/kpis
export const getKpiData = async (req, res) => {
    try {
        const { type, period = 'month' } = req.query;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate = new Date(today);
        if (period === 'week') startDate.setDate(today.getDate() - 7);
        else if (period === 'month') startDate.setMonth(today.getMonth() - 1);
        else if (period === 'quarter') startDate.setMonth(today.getMonth() - 3);
        else if (period === 'year') startDate.setFullYear(today.getFullYear() - 1);

        let kpis = {};

        switch (type) {
            case 'sales':
                const salesData = await Lead.aggregate([
                    {
                        $match: {
                            status: 'Won',
                            createdAt: { $gte: startDate }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' }
                            },
                            count: { $sum: 1 },
                            value: { $sum: '$expectedValue' },
                            avgValue: { $avg: '$expectedValue' }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
                ]);

                kpis = {
                    totalSales: salesData.reduce((sum, d) => sum + d.value, 0),
                    totalDeals: salesData.reduce((sum, d) => sum + d.count, 0),
                    averageDealValue: salesData.length ?
                        salesData.reduce((sum, d) => sum + d.avgValue, 0) / salesData.length : 0,
                    trend: salesData
                };
                break;

            case 'leads':
                const leadsData = await Lead.aggregate([
                    { $match: { createdAt: { $gte: startDate } } },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' }
                            },
                            count: { $sum: 1 },
                            bySource: { $push: '$source' },
                            byStatus: { $push: '$status' }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
                ]);

                kpis = {
                    totalLeads: leadsData.reduce((sum, d) => sum + d.count, 0),
                    averageDaily: leadsData.length ?
                        leadsData.reduce((sum, d) => sum + d.count, 0) / leadsData.length : 0,
                    trend: leadsData
                };
                break;

            case 'conversion':
                const conversionData = await Lead.aggregate([
                    { $match: { createdAt: { $gte: startDate } } },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' }
                            },
                            total: { $sum: 1 },
                            won: {
                                $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] }
                            },
                            lost: {
                                $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] }
                            }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
                ]);

                kpis = {
                    averageConversion: conversionData.length ?
                        (conversionData.reduce((sum, d) => sum + (d.won / d.total * 100), 0) / conversionData.length).toFixed(1) : 0,
                    totalWon: conversionData.reduce((sum, d) => sum + d.won, 0),
                    totalLost: conversionData.reduce((sum, d) => sum + d.lost, 0),
                    trend: conversionData
                };
                break;

            case 'revenue':
                const revenueData = await Lead.aggregate([
                    {
                        $match: {
                            status: 'Won',
                            createdAt: { $gte: startDate }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' }
                            },
                            revenue: { $sum: '$expectedValue' },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } }
                ]);

                kpis = {
                    totalRevenue: revenueData.reduce((sum, d) => sum + d.revenue, 0),
                    monthlyAverage: revenueData.length ?
                        revenueData.reduce((sum, d) => sum + d.revenue, 0) / revenueData.length : 0,
                    projectedAnnual: revenueData.length ?
                        (revenueData.reduce((sum, d) => sum + d.revenue, 0) / revenueData.length) * 12 : 0,
                    trend: revenueData
                };
                break;
        }

        res.json({
            success: true,
            data: {
                type,
                period,
                startDate,
                endDate: today,
                kpis
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get activity feed
// @route   GET /api/dashboard/activities
export const getActivityFeed = async (req, res) => {
    try {
        const { limit = 20, type = 'all', startDate, endDate } = req.query;

        let query = {};
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        let activities = [];

        if (type === 'all' || type === 'lead') {
            const leadActivities = await Lead.find({
                ...query,
                createdAt: query.date
            })
                .select('name status createdAt assignedTo')
                .populate('assignedTo', 'name')
                .limit(parseInt(limit));

            activities.push(...leadActivities.map(l => ({
                id: l._id,
                type: 'lead',
                title: 'New Lead Created',
                description: `${l.name} was added as a new lead`,
                user: l.assignedTo?.name || 'Unassigned',
                timestamp: l.createdAt,
                metadata: { status: l.status }
            })));
        }

        if (type === 'all' || type === 'followup') {
            const followupActivities = await FollowUp.find({
                ...query,
                createdAt: query.date
            })
                .populate('leadId', 'name')
                .populate('assignedTo', 'name')
                .limit(parseInt(limit));

            activities.push(...followupActivities.map(f => ({
                id: f._id,
                type: 'followup',
                title: 'Follow-up Scheduled',
                description: `Follow-up scheduled for ${f.leadId?.name}`,
                user: f.assignedTo?.name,
                timestamp: f.createdAt,
                metadata: { date: f.followUpDate, status: f.status }
            })));
        }

        if (type === 'all' || type === 'timeline') {
            const timelineActivities = await Timeline.find(query)
                .populate('leadId', 'name')
                .populate('createdBy', 'name')
                .limit(parseInt(limit));

            activities.push(...timelineActivities.map(t => ({
                id: t._id,
                type: t.type,
                title: t.title,
                description: t.description,
                user: t.createdBy?.name,
                timestamp: t.date,
                metadata: { leadName: t.leadId?.name }
            })));
        }

        // Sort by timestamp descending
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        activities = activities.slice(0, parseInt(limit));

        res.json({
            success: true,
            data: {
                total: activities.length,
                activities,
                filters: { type, startDate, endDate }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get chart data
// @route   GET /api/dashboard/charts/:chartType
export const getChartData = async (req, res) => {
    try {
        const { chartType } = req.params;
        const { period = 'monthly', startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
        }

        let data = [];

        switch (chartType) {
            case 'leads':
                data = await Lead.aggregate([
                    { $match: dateFilter },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
                ]);
                break;

            case 'revenue':
                data = await Lead.aggregate([
                    {
                        $match: {
                            status: 'Won',
                            ...dateFilter
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' }
                            },
                            revenue: { $sum: '$expectedValue' }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } }
                ]);
                break;

            case 'conversion':
                data = await Lead.aggregate([
                    { $match: dateFilter },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                            value: { $sum: '$expectedValue' }
                        }
                    }
                ]);
                break;

            case 'activities':
                data = await Timeline.aggregate([
                    { $match: dateFilter },
                    {
                        $group: {
                            _id: '$type',
                            count: { $sum: 1 }
                        }
                    }
                ]);
                break;

            case 'performance':
                data = await Executive.aggregate([
                    { $match: { status: 'active' } },
                    {
                        $lookup: {
                            from: 'leads',
                            localField: '_id',
                            foreignField: 'assignedTo',
                            as: 'leads'
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            leadCount: { $size: '$leads' },
                            wonCount: {
                                $size: {
                                    $filter: {
                                        input: '$leads',
                                        cond: { $eq: ['$$this.status', 'Won'] }
                                    }
                                }
                            }
                        }
                    },
                    { $sort: { wonCount: -1 } },
                    { $limit: 10 }
                ]);
                break;
        }

        res.json({
            success: true,
            data: {
                chartType,
                period,
                data
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get revenue chart
// @route   GET /api/dashboard/charts/revenue
export const getRevenueChart = async (req, res) => {
    try {
        const { period = 'monthly', startDate, endDate } = req.query;

        let groupBy;
        let dateFormat;

        if (period === 'daily') {
            groupBy = {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
            };
        } else if (period === 'weekly') {
            groupBy = {
                year: { $year: '$createdAt' },
                week: { $week: '$createdAt' }
            };
        } else if (period === 'monthly') {
            groupBy = {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
            };
        } else {
            groupBy = {
                year: { $year: '$createdAt' },
                quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } }
            };
        }

        const revenue = await Lead.aggregate([
            {
                $match: {
                    status: 'Won',
                    ...(startDate || endDate ? {
                        createdAt: {
                            ...(startDate && { $gte: new Date(startDate) }),
                            ...(endDate && { $lte: new Date(endDate) })
                        }
                    } : {})
                }
            },
            {
                $group: {
                    _id: groupBy,
                    revenue: { $sum: '$expectedValue' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        // Calculate growth rates
        const withGrowth = revenue.map((item, index) => {
            const prevRevenue = index > 0 ? revenue[index - 1].revenue : item.revenue;
            const growth = ((item.revenue - prevRevenue) / prevRevenue * 100).toFixed(1);
            return {
                ...item,
                growth: index === 0 ? 0 : growth,
                label: period === 'daily' ? `${item._id.day}/${item._id.month}` :
                    period === 'weekly' ? `Week ${item._id.week}` :
                        period === 'monthly' ? `${item._id.month}/${item._id.year}` :
                            `Q${item._id.quarter} ${item._id.year}`
            };
        });

        res.json({
            success: true,
            data: {
                period,
                total: withGrowth.reduce((sum, item) => sum + item.revenue, 0),
                average: withGrowth.length ?
                    withGrowth.reduce((sum, item) => sum + item.revenue, 0) / withGrowth.length : 0,
                trend: withGrowth
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get lead distribution
// @route   GET /api/dashboard/charts/lead-distribution
export const getLeadDistribution = async (req, res) => {
    try {
        const { groupBy = 'status' } = req.query;

        let groupField;
        if (groupBy === 'status') groupField = '$status';
        else if (groupBy === 'source') groupField = '$source';
        else if (groupBy === 'pipelineStage') groupField = '$pipelineStage';
        else groupField = '$status';

        const distribution = await Lead.aggregate([
            {
                $group: {
                    _id: groupField,
                    count: { $sum: 1 },
                    value: { $sum: '$expectedValue' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Calculate percentages
        const total = distribution.reduce((sum, item) => sum + item.count, 0);
        const withPercentage = distribution.map(item => ({
            category: item._id,
            count: item.count,
            value: item.value,
            percentage: ((item.count / total) * 100).toFixed(1)
        }));

        res.json({
            success: true,
            data: {
                groupBy,
                total,
                distribution: withPercentage
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get conversion funnel
// @route   GET /api/dashboard/charts/conversion-funnel
export const getConversionFunnel = async (req, res) => {
    try {
        const stages = [
            'New Lead',
            'Contacted',
            'Requirement Identified',
            'Quotation Sent',
            'Follow-Up',
            'Negotiation',
            'Won'
        ];

        const funnel = await Promise.all(
            stages.map(async (stage) => {
                const count = await Lead.countDocuments({ pipelineStage: stage });
                const value = await Lead.aggregate([
                    { $match: { pipelineStage: stage } },
                    { $group: { _id: null, total: { $sum: '$expectedValue' } } }
                ]);

                return {
                    stage,
                    count,
                    value: value[0]?.total || 0
                };
            })
        );

        // Calculate conversion rates
        const withRates = funnel.map((item, index) => {
            const previousCount = index > 0 ? funnel[index - 1].count : item.count;
            const conversionRate = previousCount > 0 ?
                ((item.count / previousCount) * 100).toFixed(1) : 100;

            return {
                ...item,
                conversionRate,
                dropoff: index > 0 ? previousCount - item.count : 0,
                dropoffRate: index > 0 ?
                    (((previousCount - item.count) / previousCount) * 100).toFixed(1) : 0
            };
        });

        res.json({
            success: true,
            data: {
                funnel: withRates,
                totalLeads: funnel[0]?.count || 0,
                totalWon: funnel[funnel.length - 1]?.count || 0,
                overallConversion: funnel[0]?.count ?
                    ((funnel[funnel.length - 1]?.count / funnel[0]?.count) * 100).toFixed(1) : 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get recent leads
// @route   GET /api/dashboard/recent-leads
export const getRecentLeads = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const recentLeads = await Lead.find()
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: recentLeads
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get upcoming activities
// @route   GET /api/dashboard/upcoming
export const getUpcomingActivities = async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endDate = new Date(today);
        endDate.setDate(today.getDate() + parseInt(days));

        const [followUps, deadlines] = await Promise.all([
            // Upcoming follow-ups
            FollowUp.find({
                followUpDate: { $gte: today, $lte: endDate },
                status: 'pending'
            })
                .populate('leadId', 'name phone product')
                .populate('assignedTo', 'name')
                .sort({ followUpDate: 1 }),

            // Upcoming lead deadlines
            Lead.find({
                followUpDate: { $gte: today, $lte: endDate },
                status: { $nin: ['Won', 'Lost'] }
            })
                .populate('assignedTo', 'name')
                .sort({ followUpDate: 1 })
        ]);

        // Combine and format activities
        const activities = [
            ...followUps.map(f => ({
                id: f._id,
                type: 'followup',
                title: 'Follow-up',
                description: `Follow-up with ${f.leadId?.name}`,
                date: f.followUpDate,
                time: f.followUpTime,
                assignedTo: f.assignedTo?.name,
                priority: f.priority,
                relatedId: f.leadId?._id
            })),
            ...deadlines.map(l => ({
                id: l._id,
                type: 'deadline',
                title: 'Lead Deadline',
                description: `Follow-up deadline for ${l.name}`,
                date: l.followUpDate,
                assignedTo: l.assignedTo?.name,
                priority: l.priority,
                relatedId: l._id
            }))
        ];

        // Sort by date
        activities.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Group by date
        const grouped = {};
        activities.forEach(activity => {
            const dateStr = activity.date.toISOString().split('T')[0];
            if (!grouped[dateStr]) {
                grouped[dateStr] = [];
            }
            grouped[dateStr].push(activity);
        });

        res.json({
            success: true,
            data: {
                total: activities.length,
                grouped,
                activities,
                dateRange: { start: today, end: endDate }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get team performance
// @route   GET /api/dashboard/team-performance
export const getTeamPerformance = async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate = new Date(today);
        if (period === 'week') startDate.setDate(today.getDate() - 7);
        else if (period === 'month') startDate.setMonth(today.getMonth() - 1);
        else if (period === 'quarter') startDate.setMonth(today.getMonth() - 3);

        const performance = await Executive.aggregate([
            { $match: { status: 'active' } },
            {
                $lookup: {
                    from: 'leads',
                    let: { executiveId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$assignedTo', '$$executiveId'] },
                                createdAt: { $gte: startDate }
                            }
                        }
                    ],
                    as: 'leads'
                }
            },
            {
                $lookup: {
                    from: 'followups',
                    let: { executiveId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$assignedTo', '$$executiveId'] },
                                createdAt: { $gte: startDate }
                            }
                        }
                    ],
                    as: 'followups'
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    avatar: 1,
                    leadCount: { $size: '$leads' },
                    wonCount: {
                        $size: {
                            $filter: {
                                input: '$leads',
                                cond: { $eq: ['$$this.status', 'Won'] }
                            }
                        }
                    },
                    followupCount: { $size: '$followups' },
                    completedFollowups: {
                        $size: {
                            $filter: {
                                input: '$followups',
                                cond: { $eq: ['$$this.status', 'completed'] }
                            }
                        }
                    },
                    totalValue: {
                        $sum: {
                            $map: {
                                input: '$leads',
                                as: 'lead',
                                in: { $ifNull: ['$$lead.expectedValue', 0] }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    conversionRate: {
                        $multiply: [
                            { $divide: ['$wonCount', { $max: ['$leadCount', 1] }] },
                            100
                        ]
                    },
                    completionRate: {
                        $multiply: [
                            { $divide: ['$completedFollowups', { $max: ['$followupCount', 1] }] },
                            100
                        ]
                    }
                }
            },
            { $sort: { wonCount: -1, totalValue: -1 } }
        ]);

        // Calculate team totals
        const teamTotals = {
            totalLeads: performance.reduce((sum, p) => sum + p.leadCount, 0),
            totalWon: performance.reduce((sum, p) => sum + p.wonCount, 0),
            totalValue: performance.reduce((sum, p) => sum + p.totalValue, 0),
            averageConversion: performance.length ?
                performance.reduce((sum, p) => sum + p.conversionRate, 0) / performance.length : 0
        };

        res.json({
            success: true,
            data: {
                period,
                startDate,
                endDate: today,
                teamTotals,
                performance
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get daily stats
// @route   GET /api/dashboard/daily
export const getDailyStats = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);

        const [
            newLeads,
            completedFollowUps,
            wonLeads,
            activities,
            executiveActivity
        ] = await Promise.all([
            // New leads created on this day
            Lead.countDocuments({
                createdAt: { $gte: targetDate, $lt: nextDay }
            }),

            // Follow-ups completed on this day
            FollowUp.countDocuments({
                completedAt: { $gte: targetDate, $lt: nextDay },
                status: 'completed'
            }),

            // Leads won on this day
            Lead.countDocuments({
                wonAt: { $gte: targetDate, $lt: nextDay },
                status: 'Won'
            }),

            // All activities on this day
            Timeline.find({
                date: { $gte: targetDate, $lt: nextDay }
            })
                .populate('createdBy', 'name')
                .populate('leadId', 'name')
                .sort({ date: 1 }),

            // Executive activity summary
            Timeline.aggregate([
                { $match: { date: { $gte: targetDate, $lt: nextDay } } },
                {
                    $group: {
                        _id: '$createdBy',
                        count: { $sum: 1 },
                        types: { $addToSet: '$type' }
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
                        types: 1
                    }
                },
                { $sort: { count: -1 } }
            ])
        ]);

        // Calculate hourly breakdown
        const hourlyBreakdown = await Timeline.aggregate([
            { $match: { date: { $gte: targetDate, $lt: nextDay } } },
            {
                $group: {
                    _id: { $hour: '$date' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.json({
            success: true,
            data: {
                date: targetDate,
                summary: {
                    newLeads,
                    completedFollowUps,
                    wonLeads,
                    totalActivities: activities.length
                },
                activities,
                executiveActivity,
                hourlyBreakdown
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get custom report
// @route   POST /api/dashboard/reports/custom
export const getCustomReport = async (req, res) => {
    try {
        const { metrics, dimensions, filters, startDate, endDate } = req.body;

        const dateFilter = {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        // Apply additional filters
        if (filters) {
            Object.keys(filters).forEach(key => {
                dateFilter[key] = filters[key];
            });
        }

        const reportData = {};

        // Fetch requested metrics
        for (const metric of metrics) {
            switch (metric) {
                case 'leadCount':
                    reportData.leadCount = await Lead.countDocuments(dateFilter);
                    break;

                case 'wonCount':
                    reportData.wonCount = await Lead.countDocuments({
                        ...dateFilter,
                        status: 'Won'
                    });
                    break;

                case 'revenue':
                    const revenue = await Lead.aggregate([
                        { $match: { ...dateFilter, status: 'Won' } },
                        { $group: { _id: null, total: { $sum: '$expectedValue' } } }
                    ]);
                    reportData.revenue = revenue[0]?.total || 0;
                    break;

                case 'conversionRate':
                    const total = await Lead.countDocuments(dateFilter);
                    const won = await Lead.countDocuments({ ...dateFilter, status: 'Won' });
                    reportData.conversionRate = total ? (won / total * 100).toFixed(1) : 0;
                    break;

                case 'followUpCount':
                    reportData.followUpCount = await FollowUp.countDocuments(dateFilter);
                    break;

                case 'activityCount':
                    reportData.activityCount = await Timeline.countDocuments(dateFilter);
                    break;
            }
        }

        // Group by dimensions if requested
        if (dimensions && dimensions.length > 0) {
            reportData.grouped = {};

            for (const dimension of dimensions) {
                let groupField;
                switch (dimension) {
                    case 'status':
                        groupField = '$status';
                        break;
                    case 'source':
                        groupField = '$source';
                        break;
                    case 'assignedTo':
                        groupField = '$assignedTo';
                        break;
                    case 'pipelineStage':
                        groupField = '$pipelineStage';
                        break;
                    default:
                        groupField = '$' + dimension;
                }

                const grouped = await Lead.aggregate([
                    { $match: dateFilter },
                    {
                        $group: {
                            _id: groupField,
                            count: { $sum: 1 },
                            value: { $sum: '$expectedValue' }
                        }
                    },
                    { $sort: { count: -1 } }
                ]);

                reportData.grouped[dimension] = grouped;
            }
        }

        res.json({
            success: true,
            data: {
                report: reportData,
                dateRange: { startDate, endDate },
                metrics,
                dimensions,
                filters
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Export dashboard data
// @route   GET /api/dashboard/export
export const exportDashboardData = async (req, res) => {
    try {
        const { format = 'pdf', period = 'month' } = req.query;

        // Get dashboard data
        const dashboardData = await getDashboardStats(req, {
            json: () => { },
            status: () => ({ json: () => { } })
        });

        if (format === 'csv') {
            // Export as CSV
            const fields = ['metric', 'value', 'period'];
            const data = [
                { metric: 'Total Leads', value: dashboardData.overview.totalLeads, period },
                { metric: 'Won Leads', value: dashboardData.overview.wonLeads, period },
                { metric: 'Conversion Rate', value: dashboardData.overview.conversionRate, period },
                { metric: 'Pipeline Value', value: dashboardData.overview.totalPipelineValue, period }
            ];

            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(data);

            res.header('Content-Type', 'text/csv');
            res.attachment(`dashboard_export_${Date.now()}.csv`);
            return res.send(csv);
        }

        else if (format === 'excel') {
            // Create Excel file
            const workbook = new ExcelJS.Workbook();

            // Overview sheet
            const overviewSheet = workbook.addWorksheet('Overview');
            overviewSheet.columns = [
                { header: 'Metric', key: 'metric', width: 30 },
                { header: 'Value', key: 'value', width: 20 }
            ];

            overviewSheet.addRow({ metric: 'Total Leads', value: dashboardData.overview.totalLeads });
            overviewSheet.addRow({ metric: 'New Leads Today', value: dashboardData.overview.newLeadsToday });
            overviewSheet.addRow({ metric: 'Won Leads', value: dashboardData.overview.wonLeads });
            overviewSheet.addRow({ metric: 'Conversion Rate', value: dashboardData.overview.conversionRate + '%' });

            // Leads by status sheet
            const statusSheet = workbook.addWorksheet('Leads by Status');
            statusSheet.columns = [
                { header: 'Status', key: 'status', width: 20 },
                { header: 'Count', key: 'count', width: 15 }
            ];

            dashboardData.charts.leadsByStatus.forEach(item => {
                statusSheet.addRow({ status: item._id, count: item.count });
            });

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=dashboard_export_${Date.now()}.xlsx`
            );

            await workbook.xlsx.write(res);
            return res.end();
        }

        else {
            // Default JSON response
            res.json({
                success: true,
                data: dashboardData
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export default {
    getDashboardStats,
    getManagerDashboard,
    getExecutiveDashboard,
    // getNotifications,
    // markNotificationRead,
    // markAllNotificationsRead,
    // getPerformanceMetrics,
    getActivityFeed,
    getChartData,
    getKpiData,
    getRecentLeads,
    getUpcomingActivities,
    getTeamPerformance,
    getRevenueChart,
    getLeadDistribution,
    getConversionFunnel,
    getDailyStats,
    exportDashboardData,
    getCustomReport
};