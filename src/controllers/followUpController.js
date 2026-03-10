// src/controllers/followUpController.js
import FollowUp from '../models/FollowUp.js';
import Lead from '../models/Lead.js';
import Executive from '../models/Executive.js';
import Notification from '../models/Notification.js';
import Timeline from '../models/Timeline.js';

// @desc    Get all follow-ups
// @route   GET /api/followups
export const getFollowUps = async (req, res) => {
    try {

        const {
            status,
            type,
            assignedTo,
            leadId,
            startDate,
            endDate
        } = req.query;

        let query = {};

        if (status) query.status = status;
        if (type) query.type = type;
        if (assignedTo) query.assignedTo = assignedTo;
        if (leadId) query.leadId = leadId;

        if (startDate || endDate) {
            query.followUpDate = {};
            if (startDate) query.followUpDate.$gte = new Date(startDate);
            if (endDate) query.followUpDate.$lte = new Date(endDate);
        }

        const followUps = await FollowUp.find(query)
            .populate("leadId", "name phone email status priority")
            .populate("assignedTo", "name email")
            .sort({ followUpDate: 1 });

        // group by lead
        const grouped = {};

        followUps.forEach((f) => {

            const leadKey = f.leadId._id.toString();

            if (!grouped[leadKey]) {
                grouped[leadKey] = {
                    lead: f.leadId,
                    history: []
                };
            }

            grouped[leadKey].history.push({
                id: f._id,
                followUpDate: f.followUpDate,
                type: f.type,
                status: f.status,
                assignedTo: f.assignedTo
            });

        });

        res.json(Object.values(grouped));

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }
};

// @desc    Get single follow-up by ID
// @route   GET /api/followups/:id
export const getFollowUpById = async (req, res) => {
    try {
        const { id } = req.params;

        const followUp = await FollowUp.findById(id)
            .populate('leadId', 'name phone email product status priority expectedValue')
            .populate('assignedTo', 'name email phone avatar')
            .populate('completedBy', 'name email')
            .populate('createdBy', 'name email')
            .populate('nextFollowUp');

        if (!followUp) {
            return res.status(404).json({
                success: false,
                error: 'Follow-up not found'
            });
        }

        // Get related timeline entries
        const timeline = await Timeline.find({
            'metadata.followUpId': id
        }).sort({ createdAt: -1 }).limit(10);

        res.json({
            success: true,
            data: {
                ...followUp.toObject(),
                timeline
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get today's follow-ups
// @route   GET /api/followups/today
export const getTodaysFollowUps = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const followUps = await FollowUp.find({
            followUpDate: { $gte: today, $lt: tomorrow },
            status: { $in: ['pending', 'overdue'] }
        })
            .populate('leadId', 'name phone email product priority expectedValue')
            .populate('assignedTo', 'name email avatar')
            .sort({ followUpTime: 1 });

        // Group by time slots
        const grouped = {
            morning: [], // Before 12 PM
            afternoon: [], // 12 PM - 5 PM
            evening: [] // After 5 PM
        };

        followUps.forEach(f => {
            const time = f.followUpTime || '00:00';
            const hour = parseInt(time.split(':')[0]);

            if (hour < 12) {
                grouped.morning.push(f);
            } else if (hour < 17) {
                grouped.afternoon.push(f);
            } else {
                grouped.evening.push(f);
            }
        });

        // Get counts by executive
        const byExecutive = await FollowUp.aggregate([
            {
                $match: {
                    followUpDate: { $gte: today, $lt: tomorrow },
                    status: { $in: ['pending', 'overdue'] }
                }
            },
            {
                $group: {
                    _id: '$assignedTo',
                    count: { $sum: 1 }
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
                    executive: { $arrayElemAt: ['$executive.name', 0] },
                    count: 1
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                date: today,
                total: followUps.length,
                grouped,
                byExecutive,
                followUps
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get upcoming follow-ups
// @route   GET /api/followups/upcoming
export const getUpcomingFollowUps = async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + parseInt(days));

        const followUps = await FollowUp.find({
            followUpDate: { $gte: today, $lte: endDate },
            status: 'pending'
        })
            .populate('leadId', 'name phone product priority expectedValue')
            .populate('assignedTo', 'name email avatar')
            .sort({ followUpDate: 1, followUpTime: 1 });

        // Group by date
        const grouped = {};
        followUps.forEach(f => {
            const dateStr = f.followUpDate.toISOString().split('T')[0];
            if (!grouped[dateStr]) {
                grouped[dateStr] = [];
            }
            grouped[dateStr].push(f);
        });

        // Get daily counts
        const dailyCounts = Object.keys(grouped).map(date => ({
            date,
            count: grouped[date].length,
            totalValue: grouped[date].reduce((sum, f) => sum + (f.leadId?.expectedValue || 0), 0)
        }));

        res.json({
            success: true,
            data: {
                range: {
                    start: today,
                    end: endDate,
                    days: parseInt(days)
                },
                total: followUps.length,
                grouped,
                dailyCounts,
                followUps
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get overdue follow-ups
// @route   GET /api/followups/overdue
export const getOverdueFollowUps = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const followUps = await FollowUp.find({
            followUpDate: { $lt: today },
            status: 'pending'
        })
            .populate('leadId', 'name phone product priority expectedValue')
            .populate('assignedTo', 'name email avatar')
            .sort({ followUpDate: 1 });

        // Calculate delay and categorize
        const withDelay = followUps.map(f => {
            const delayDays = Math.floor((today - f.followUpDate) / (1000 * 60 * 60 * 24));
            let severity = 'low';
            if (delayDays > 7) severity = 'critical';
            else if (delayDays > 3) severity = 'high';
            else if (delayDays > 1) severity = 'medium';

            return {
                ...f.toObject(),
                delayDays,
                severity
            };
        });

        // Group by severity
        const bySeverity = {
            critical: withDelay.filter(f => f.severity === 'critical').length,
            high: withDelay.filter(f => f.severity === 'high').length,
            medium: withDelay.filter(f => f.severity === 'medium').length,
            low: withDelay.filter(f => f.severity === 'low').length
        };

        res.json({
            success: true,
            data: {
                total: followUps.length,
                bySeverity,
                followUps: withDelay
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get follow-ups by executive
// @route   GET /api/followups/executive/:executiveId
export const getFollowUpsByExecutive = async (req, res) => {
    try {
        const { executiveId } = req.params;
        const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

        let query = { assignedTo: executiveId };
        if (status) query.status = status;

        if (startDate || endDate) {
            query.followUpDate = {};
            if (startDate) query.followUpDate.$gte = new Date(startDate);
            if (endDate) query.followUpDate.$lte = new Date(endDate);
        }

        const followUps = await FollowUp.find(query)
            .populate('leadId', 'name phone product priority expectedValue')
            .sort({ followUpDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await FollowUp.countDocuments(query);

        // Get statistics for this executive
        const stats = await FollowUp.aggregate([
            { $match: { assignedTo: executiveId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                executive: executiveId,
                followUps,
                stats,
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

// @desc    Get follow-ups by lead
// @route   GET /api/followups/lead/:leadId
export const getFollowUpsByLead = async (req, res) => {
    try {

        const { leadId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;

        let query = { leadId };
        if (status) query.status = status;

        const followUps = await FollowUp.find(query)
            .populate("leadId", "name phone email status priority expectedValue")
            .populate("assignedTo", "name email avatar")
            .populate("completedBy", "name")
            .populate("createdBy", "name email")
            .sort({ followUpDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await FollowUp.countDocuments(query);

        // format followUps with readable date
        const formattedFollowUps = followUps.map(f => ({
            ...f.toObject(),
            followUpDateFormatted: f.followUpDate
                ? new Date(f.followUpDate).toLocaleDateString("en-IN")
                : null
        }));

        // next follow up
        const nextFollowUp = await FollowUp.findOne({
            leadId,
            status: "pending",
            followUpDate: { $gte: new Date() }
        })
            .populate("leadId", "name phone email")
            .populate("assignedTo", "name email avatar")
            .sort({ followUpDate: 1 });

        res.json({
            success: true,
            data: {
                lead: followUps[0]?.leadId || null,
                nextFollowUp,
                followUps: formattedFollowUps,
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

// @desc    Create follow-up
// @route   POST /api/followups
export const createFollowUp = async (req, res) => {
    try {
        const followUpData = req.body;

        // Check if lead exists
        const lead = await Lead.findById(followUpData.leadId);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        // Check if executive exists
        const executive = await Executive.findById(followUpData.assignedTo);
        if (!executive) {
            return res.status(404).json({
                success: false,
                error: 'Executive not found'
            });
        }

        // Set reminder time if not provided
        if (!followUpData.reminderTime && followUpData.followUpDate) {
            const reminderDate = new Date(followUpData.followUpDate);
            reminderDate.setHours(reminderDate.getHours() - 1); // 1 hour before
            followUpData.reminderTime = reminderDate;
        }

        // Add created by
        followUpData.createdBy = req.user.id;

        const followUp = new FollowUp(followUpData);
        await followUp.save();

        // Update lead with follow-up date
        await Lead.findByIdAndUpdate(followUpData.leadId, {
            followUpDate: followUpData.followUpDate,
            followUpTime: followUpData.followUpTime,
            lastContactDate: new Date(),
            $push: {
                followUpHistory: {
                    date: followUpData.followUpDate,
                    type: followUpData.type,
                    assignedTo: followUpData.assignedTo
                }
            }
        });

        // Create timeline entry
        await Timeline.create({
            leadId: followUp.leadId,
            type: 'task',
            title: 'Follow-up Scheduled',
            description: `${followUp.type} follow-up scheduled for ${new Date(followUp.followUpDate).toLocaleDateString()}`,
            createdBy: req.user.id,
            createdByName: req.user.name,
            metadata: {
                followUpId: followUp._id,
                followUpDate: followUp.followUpDate,
                followUpType: followUp.type
            }
        });

        // Create notification
        await Notification.create({
            userId: followUp.assignedTo,
            type: 'follow-up',
            title: 'New Follow-up Scheduled',
            message: `Follow-up scheduled for ${lead.name} on ${new Date(followUp.followUpDate).toLocaleDateString()}`,
            priority: followUp.priority || 'medium',
            relatedTo: {
                model: 'FollowUp',
                id: followUp._id
            },
            actionUrl: `/followups/${followUp._id}`,
            metadata: {
                leadName: lead.name,
                leadId: lead._id,
                followUpDate: followUp.followUpDate,
                followUpType: followUp.type
            }
        });

        // Emit socket event
        const io = req.app.get('io');
        io.to(`executive-${followUp.assignedTo}`).emit('new-followup', {
            ...followUp.toObject(),
            leadName: lead.name
        });

        // Send email notification if enabled
        if (executive.email && followUpData.sendEmail) {
            // Queue email sending
            // await sendFollowUpEmail(executive.email, followUp, lead);
        }

        // Send SMS notification if enabled
        if (executive.phone && followUpData.sendSms) {
            // Queue SMS sending
            // await sendFollowUpSMS(executive.phone, followUp, lead);
        }

        res.status(201).json({
            success: true,
            message: 'Follow-up created successfully',
            data: followUp
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Update follow-up
// @route   PUT /api/followups/:id
export const updateFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const followUp = await FollowUp.findById(id);
        if (!followUp) {
            return res.status(404).json({
                success: false,
                error: 'Follow-up not found'
            });
        }

        // Check permissions
        if (followUp.assignedTo.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this follow-up'
            });
        }

        // If date changed, update reminder
        if (updates.followUpDate && updates.followUpDate !== followUp.followUpDate) {
            const reminderDate = new Date(updates.followUpDate);
            reminderDate.setHours(reminderDate.getHours() - 1);
            updates.reminderTime = reminderDate;
        }

        const updatedFollowUp = await FollowUp.findByIdAndUpdate(
            id,
            { ...updates, updatedAt: Date.now() },
            { new: true }
        ).populate('leadId', 'name phone');

        // Create timeline entry for update
        await Timeline.create({
            leadId: updatedFollowUp.leadId._id,
            type: 'system',
            title: 'Follow-up Updated',
            description: 'Follow-up details were updated',
            createdBy: req.user.id,
            createdByName: req.user.name,
            metadata: { followUpId: id }
        });

        // Emit socket event
        const io = req.app.get('io');
        io.to(`executive-${updatedFollowUp.assignedTo}`).emit('update-followup', updatedFollowUp);

        res.json({
            success: true,
            message: 'Follow-up updated successfully',
            data: updatedFollowUp
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Complete follow-up
// @route   PATCH /api/followups/:id/complete
export const completeFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const { outcome, notes, nextFollowUp, nextFollowUpTime, rating } = req.body;

        const followUp = await FollowUp.findById(id)
            .populate('leadId', 'name phone expectedValue')
            .populate('assignedTo', 'name email');

        if (!followUp) {
            return res.status(404).json({
                success: false,
                error: 'Follow-up not found'
            });
        }

        // Update follow-up
        followUp.status = 'completed';
        followUp.completedAt = new Date();
        followUp.completedBy = req.user.id;
        followUp.outcome = outcome;
        followUp.notes = notes;
        if (rating) followUp.rating = rating;

        await followUp.save();

        // Update lead
        const leadUpdate = {
            lastContactDate: new Date(),
            $inc: { totalFollowUps: 1 }
        };

        if (nextFollowUp) {
            leadUpdate.followUpDate = nextFollowUp;
            leadUpdate.followUpTime = nextFollowUpTime;
        }

        await Lead.findByIdAndUpdate(followUp.leadId._id, leadUpdate);

        // Create timeline entry
        await Timeline.create({
            leadId: followUp.leadId._id,
            type: followUp.type,
            title: `${followUp.type.charAt(0).toUpperCase() + followUp.type.slice(1)} Completed`,
            description: outcome || 'Follow-up completed successfully',
            createdBy: req.user.id,
            createdByName: req.user.name,
            metadata: {
                followUpId: id,
                outcome,
                rating
            }
        });

        // Create next follow-up if scheduled
        let newFollowUp = null;
        if (nextFollowUp) {
            newFollowUp = await FollowUp.create({
                leadId: followUp.leadId._id,
                assignedTo: followUp.assignedTo._id,
                followUpDate: nextFollowUp,
                followUpTime: nextFollowUpTime,
                type: followUp.type,
                purpose: 'Follow-up from previous conversation',
                status: 'pending',
                createdBy: req.user.id
            });

            followUp.nextFollowUp = newFollowUp._id;
            await followUp.save();

            // Create notification for next follow-up
            await Notification.create({
                userId: followUp.assignedTo._id,
                type: 'follow-up',
                title: 'New Follow-up Scheduled',
                message: `Follow-up scheduled for ${followUp.leadId.name} on ${new Date(nextFollowUp).toLocaleDateString()}`,
                relatedTo: {
                    model: 'FollowUp',
                    id: newFollowUp._id
                }
            });
        }

        // Check for achievement
        const completedCount = await FollowUp.countDocuments({
            assignedTo: followUp.assignedTo._id,
            status: 'completed',
            completedAt: { $gte: new Date().setHours(0, 0, 0, 0) }
        });

        if (completedCount === 5) {
            // Create achievement notification
            await Notification.create({
                userId: followUp.assignedTo._id,
                type: 'achievement',
                title: '🌟 Follow-up Champion!',
                message: 'You have completed 5 follow-ups today! Great job!',
                priority: 'high'
            });
        }

        // Emit socket event
        const io = req.app.get('io');
        io.to(`executive-${followUp.assignedTo._id}`).emit('complete-followup', {
            followUpId: id,
            nextFollowUp: newFollowUp
        });

        res.json({
            success: true,
            message: 'Follow-up completed successfully',
            data: {
                followUp,
                nextFollowUp: newFollowUp
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Reschedule follow-up
// @route   PATCH /api/followups/:id/reschedule
export const rescheduleFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const { followUpDate, followUpTime, reason } = req.body;

        const followUp = await FollowUp.findById(id)
            .populate('leadId', 'name')
            .populate('assignedTo', 'name');

        if (!followUp) {
            return res.status(404).json({
                success: false,
                error: 'Follow-up not found'
            });
        }

        // Store old date for history
        const oldDate = followUp.followUpDate;
        const oldTime = followUp.followUpTime;

        // Update follow-up
        followUp.followUpDate = followUpDate;
        followUp.followUpTime = followUpTime;
        followUp.status = 'rescheduled';
        followUp.rescheduleHistory = followUp.rescheduleHistory || [];
        followUp.rescheduleHistory.push({
            fromDate: oldDate,
            toDate: followUpDate,
            reason,
            rescheduledBy: req.user.id,
            rescheduledAt: new Date()
        });

        await followUp.save();

        // Update lead
        await Lead.findByIdAndUpdate(followUp.leadId._id, {
            followUpDate,
            followUpTime
        });

        // Create timeline entry
        await Timeline.create({
            leadId: followUp.leadId._id,
            type: 'system',
            title: 'Follow-up Rescheduled',
            description: `Follow-up rescheduled from ${new Date(oldDate).toLocaleDateString()} to ${new Date(followUpDate).toLocaleDateString()}`,
            createdBy: req.user.id,
            createdByName: req.user.name,
            metadata: {
                followUpId: id,
                oldDate,
                newDate: followUpDate,
                reason
            }
        });

        // Create notification
        await Notification.create({
            userId: followUp.assignedTo._id,
            type: 'follow-up',
            title: 'Follow-up Rescheduled',
            message: `Follow-up for ${followUp.leadId.name} has been rescheduled to ${new Date(followUpDate).toLocaleDateString()}`,
            priority: 'medium',
            relatedTo: {
                model: 'FollowUp',
                id: followUp._id
            }
        });

        // Emit socket event
        const io = req.app.get('io');
        io.to(`executive-${followUp.assignedTo._id}`).emit('reschedule-followup', followUp);

        res.json({
            success: true,
            message: 'Follow-up rescheduled successfully',
            data: followUp
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Delete follow-up
// @route   DELETE /api/followups/:id
export const deleteFollowUp = async (req, res) => {
    try {
        const { id } = req.params;

        const followUp = await FollowUp.findById(id);
        if (!followUp) {
            return res.status(404).json({
                success: false,
                error: 'Follow-up not found'
            });
        }

        // Check permissions
        if (followUp.assignedTo.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this follow-up'
            });
        }

        // Create timeline entry before deletion
        if (followUp.leadId) {
            await Timeline.create({
                leadId: followUp.leadId,
                type: 'system',
                title: 'Follow-up Deleted',
                description: 'Follow-up was deleted',
                createdBy: req.user.id,
                createdByName: req.user.name,
                metadata: { followUpId: id }
            });
        }

        await followUp.deleteOne();

        // Emit socket event
        const io = req.app.get('io');
        io.to(`executive-${followUp.assignedTo}`).emit('delete-followup', { id });

        res.json({
            success: true,
            message: 'Follow-up deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Bulk create follow-ups
// @route   POST /api/followups/bulk
export const bulkCreateFollowUps = async (req, res) => {
    try {
        const { followUps } = req.body;
        const results = {
            successful: [],
            failed: []
        };

        for (const followUpData of followUps) {
            try {
                // Validate lead exists
                const lead = await Lead.findById(followUpData.leadId);
                if (!lead) {
                    results.failed.push({
                        data: followUpData,
                        error: 'Lead not found'
                    });
                    continue;
                }

                // Validate executive exists
                const executive = await Executive.findById(followUpData.assignedTo);
                if (!executive) {
                    results.failed.push({
                        data: followUpData,
                        error: 'Executive not found'
                    });
                    continue;
                }

                // Set reminder time
                if (!followUpData.reminderTime && followUpData.followUpDate) {
                    const reminderDate = new Date(followUpData.followUpDate);
                    reminderDate.setHours(reminderDate.getHours() - 1);
                    followUpData.reminderTime = reminderDate;
                }

                followUpData.createdBy = req.user.id;

                const followUp = new FollowUp(followUpData);
                await followUp.save();

                // Update lead
                await Lead.findByIdAndUpdate(followUpData.leadId, {
                    followUpDate: followUpData.followUpDate,
                    lastContactDate: new Date()
                });

                results.successful.push(followUp);
            } catch (error) {
                results.failed.push({
                    data: followUpData,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            success: true,
            message: `Created ${results.successful.length} follow-ups, ${results.failed.length} failed`,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get follow-up statistics
// @route   GET /api/followups/stats
export const getFollowUpStats = async (req, res) => {
    try {
        const { executiveId, startDate, endDate, period = 'month' } = req.query;

        let query = {};
        if (executiveId) query.assignedTo = executiveId;

        if (startDate || endDate) {
            query.followUpDate = {};
            if (startDate) query.followUpDate.$gte = new Date(startDate);
            if (endDate) query.followUpDate.$lte = new Date(endDate);
        }

        // Get status distribution
        const byStatus = await FollowUp.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get type distribution
        const byType = await FollowUp.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get priority distribution
        const byPriority = await FollowUp.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get daily trend
        const dailyTrend = await FollowUp.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$followUpDate' },
                        month: { $month: '$followUpDate' },
                        day: { $dayOfMonth: '$followUpDate' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            { $limit: 30 }
        ]);

        // Get completion rate over time
        const completionRate = await FollowUp.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    overdue: {
                        $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
                    }
                }
            }
        ]);

        // Get average completion time
        const avgCompletionTime = await FollowUp.aggregate([
            {
                $match: {
                    ...query,
                    status: 'completed',
                    completedAt: { $exists: true }
                }
            },
            {
                $project: {
                    completionTime: {
                        $divide: [
                            { $subtract: ['$completedAt', '$followUpDate'] },
                            1000 * 60 * 60 // hours
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgHours: { $avg: '$completionTime' }
                }
            }
        ]);

        // Get executive performance
        const executivePerformance = await FollowUp.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$assignedTo',
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    overdue: {
                        $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
                    }
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
                    executive: { $arrayElemAt: ['$executive.name', 0] },
                    total: 1,
                    completed: 1,
                    overdue: 1,
                    completionRate: {
                        $multiply: [
                            { $divide: ['$completed', '$total'] },
                            100
                        ]
                    }
                }
            },
            { $sort: { completionRate: -1 } },
            { $limit: 10 }
        ]);

        // Get peak hours
        const peakHours = await FollowUp.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $hour: '$followUpDate' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            success: true,
            data: {
                summary: {
                    total: completionRate[0]?.total || 0,
                    completed: completionRate[0]?.completed || 0,
                    overdue: completionRate[0]?.overdue || 0,
                    completionRate: completionRate[0]
                        ? ((completionRate[0].completed / completionRate[0].total) * 100).toFixed(1)
                        : 0,
                    avgCompletionHours: avgCompletionTime[0]?.avgHours?.toFixed(1) || 0
                },
                distributions: {
                    byStatus,
                    byType,
                    byPriority
                },
                trends: {
                    daily: dailyTrend,
                    peakHours
                },
                performance: {
                    executive: executivePerformance
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

// @desc    Get follow-up calendar
// @route   GET /api/followups/calendar
export const getFollowUpCalendar = async (req, res) => {
    try {
        const { month, year, executiveId } = req.query;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        let query = {
            followUpDate: { $gte: startDate, $lte: endDate }
        };
        if (executiveId) query.assignedTo = executiveId;

        const followUps = await FollowUp.find(query)
            .populate('leadId', 'name phone product priority')
            .populate('assignedTo', 'name avatar')
            .sort({ followUpDate: 1 });

        // Group by date
        const calendar = {};
        followUps.forEach(f => {
            const dateStr = f.followUpDate.toISOString().split('T')[0];
            if (!calendar[dateStr]) {
                calendar[dateStr] = [];
            }
            calendar[dateStr].push(f);
        });

        res.json({
            success: true,
            data: {
                month,
                year,
                total: followUps.length,
                calendar
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
    getFollowUps,
    getFollowUpById,
    getTodaysFollowUps,
    getUpcomingFollowUps,
    getOverdueFollowUps,
    getFollowUpsByExecutive,
    getFollowUpsByLead,
    createFollowUp,
    updateFollowUp,
    completeFollowUp,
    deleteFollowUp,
    getFollowUpStats,
    rescheduleFollowUp,
    bulkCreateFollowUps,
    getFollowUpCalendar
};