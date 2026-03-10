// src/controllers/timelineController.js
import Timeline from '../models/Timeline.js';
import Lead from '../models/Lead.js';
import Executive from '../models/Executive.js';
import Notification from '../models/Notification.js';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

// @desc    Get timeline for a lead
// @route   GET /api/timeline/lead/:leadId
export const getLeadTimeline = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { page = 1, limit = 20, type, sortBy = 'date', sortOrder = 'desc' } = req.query;

        let query = { leadId };
        if (type) query.type = type;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const timeline = await Timeline.find(query)
            .populate('createdBy', 'name email avatar')
            .populate('leadId', 'name phone')
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Timeline.countDocuments(query);

        // Get summary statistics
        const summary = await Timeline.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalCalls: {
                        $sum: { $cond: [{ $eq: ['$type', 'call'] }, 1, 0] }
                    },
                    totalMessages: {
                        $sum: { $cond: [{ $in: ['$type', ['whatsapp', 'email']] }, 1, 0] }
                    },
                    totalMeetings: {
                        $sum: { $cond: [{ $eq: ['$type', 'meeting'] }, 1, 0] }
                    },
                    totalNotes: {
                        $sum: { $cond: [{ $eq: ['$type', 'note'] }, 1, 0] }
                    }
                }
            }
        ]);

        // Group by date for frontend display
        const grouped = {};
        timeline.forEach(item => {
            const dateStr = item.date.toISOString().split('T')[0];
            if (!grouped[dateStr]) {
                grouped[dateStr] = [];
            }
            grouped[dateStr].push(item);
        });

        res.json({
            success: true,
            data: {
                leadId,
                summary: summary[0] || { totalCalls: 0, totalMessages: 0, totalMeetings: 0, totalNotes: 0 },
                grouped,
                timeline,
                pagination: {
                    total,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page,
                    limit,
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
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

// @desc    Get single timeline entry by ID
// @route   GET /api/timeline/:id
export const getTimelineEntryById = async (req, res) => {
    try {
        const { id } = req.params;

        const entry = await Timeline.findById(id)
            .populate('createdBy', 'name email avatar')
            .populate('leadId', 'name phone email product');

        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Timeline entry not found'
            });
        }

        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Create timeline entry
// @route   POST /api/timeline
export const createTimelineEntry = async (req, res) => {
    try {
        const entryData = req.body;

        // Check if lead exists
        const lead = await Lead.findById(entryData.leadId);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        // Format time if not provided
        if (!entryData.time) {
            entryData.time = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }

        const entry = new Timeline({
            ...entryData,
            createdBy: req.user.id,
            createdByName: req.user.name,
            date: entryData.date || new Date()
        });

        await entry.save();

        // Update lead's last contact date
        await Lead.findByIdAndUpdate(entryData.leadId, {
            lastContactDate: new Date(),
            $inc: { totalInteractions: 1 }
        });

        // Create notification for assigned executive if relevant
        if (lead.assignedTo && ['call', 'meeting', 'task'].includes(entryData.type)) {
            await Notification.create({
                userId: lead.assignedTo,
                type: 'timeline',
                title: `New ${entryData.type} logged`,
                message: `New ${entryData.type} activity logged for ${lead.name}`,
                priority: entryData.priority || 'medium',
                relatedTo: {
                    model: 'Timeline',
                    id: entry._id
                },
                metadata: {
                    leadName: lead.name,
                    leadId: lead._id,
                    activityType: entryData.type
                }
            });
        }

        // Emit socket event
        const io = req.app.get('io');
        io.to(`lead-${entryData.leadId}`).emit('new-timeline-entry', {
            ...entry.toObject(),
            leadName: lead.name
        });

        // If this is a call activity, update call stats
        if (entryData.type === 'call' && entryData.duration) {
            await Lead.findByIdAndUpdate(entryData.leadId, {
                $inc: { totalCallDuration: parseInt(entryData.duration) || 0 }
            });
        }

        res.status(201).json({
            success: true,
            message: 'Timeline entry created successfully',
            data: entry
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Update timeline entry
// @route   PUT /api/timeline/:id
export const updateTimelineEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const entry = await Timeline.findById(id);
        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Timeline entry not found'
            });
        }

        // Check if user created this entry or is admin
        if (entry.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this entry'
            });
        }

        const updatedEntry = await Timeline.findByIdAndUpdate(
            id,
            { ...updates, updatedAt: Date.now() },
            { new: true }
        ).populate('createdBy', 'name email');

        // Emit socket event
        const io = req.app.get('io');
        io.to(`lead-${entry.leadId}`).emit('update-timeline-entry', updatedEntry);

        res.json({
            success: true,
            message: 'Timeline entry updated successfully',
            data: updatedEntry
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Delete timeline entry
// @route   DELETE /api/timeline/:id
export const deleteTimelineEntry = async (req, res) => {
    try {
        const { id } = req.params;

        const entry = await Timeline.findById(id);
        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Timeline entry not found'
            });
        }

        // Check if user created this entry or is admin
        if (entry.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this entry'
            });
        }

        await entry.deleteOne();

        // Emit socket event
        const io = req.app.get('io');
        io.to(`lead-${entry.leadId}`).emit('delete-timeline-entry', { id });

        res.json({
            success: true,
            message: 'Timeline entry deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get timeline statistics
// @route   GET /api/timeline/stats
export const getTimelineStats = async (req, res) => {
    try {
        const { leadId, executiveId, startDate, endDate, period = 'month' } = req.query;

        let query = {};
        if (leadId) query.leadId = leadId;
        if (executiveId) query.createdBy = executiveId;

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        // Get distribution by type
        const byType = await Timeline.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get daily activity trend
        const dailyActivity = await Timeline.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                        day: { $dayOfMonth: '$date' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
            { $limit: 30 }
        ]);

        // Get user activity ranking
        const userActivity = await Timeline.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$createdBy',
                    count: { $sum: 1 },
                    lastActive: { $max: '$date' }
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
                    userEmail: { $arrayElemAt: ['$user.email', 0] },
                    userAvatar: { $arrayElemAt: ['$user.avatar', 0] },
                    count: 1,
                    lastActive: 1
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get hourly distribution
        const hourlyDistribution = await Timeline.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $hour: '$date' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Get weekly distribution
        const weeklyDistribution = await Timeline.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $dayOfWeek: '$date' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Get call duration stats if available
        const callStats = await Timeline.aggregate([
            {
                $match: {
                    ...query,
                    type: 'call',
                    duration: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: null,
                    totalDuration: { $sum: { $toInt: '$duration' } },
                    avgDuration: { $avg: { $toInt: '$duration' } },
                    maxDuration: { $max: { $toInt: '$duration' } },
                    minDuration: { $min: { $toInt: '$duration' } }
                }
            }
        ]);

        // Get attachment stats
        const attachmentStats = await Timeline.aggregate([
            { $match: query },
            {
                $project: {
                    attachmentCount: { $size: { $ifNull: ['$attachments', []] } }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAttachments: { $sum: '$attachmentCount' },
                    entriesWithAttachments: { $sum: { $cond: [{ $gt: ['$attachmentCount', 0] }, 1, 0] } }
                }
            }
        ]);

        // Get monthly comparison
        const monthlyComparison = await Timeline.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        res.json({
            success: true,
            data: {
                summary: {
                    total: byType.reduce((sum, item) => sum + item.count, 0),
                    byType,
                    callStats: callStats[0] || { totalDuration: 0, avgDuration: 0 },
                    attachmentStats: attachmentStats[0] || { totalAttachments: 0, entriesWithAttachments: 0 }
                },
                trends: {
                    daily: dailyActivity,
                    hourly: hourlyDistribution,
                    weekly: weeklyDistribution,
                    monthly: monthlyComparison
                },
                userActivity,
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

// @desc    Add attachment to timeline
// @route   POST /api/timeline/:id/attachments
export const addAttachment = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const attachment = {
            name: req.file.originalname,
            filename: req.file.filename,
            url: `/uploads/${req.file.filename}`,
            size: (req.file.size / 1024).toFixed(2) + ' KB',
            type: req.file.mimetype,
            uploadedAt: new Date()
        };

        const entry = await Timeline.findByIdAndUpdate(
            id,
            { $push: { attachments: attachment } },
            { new: true }
        );

        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Timeline entry not found'
            });
        }

        // Emit socket event
        const io = req.app.get('io');
        io.to(`lead-${entry.leadId}`).emit('attachment-added', {
            entryId: id,
            attachment
        });

        res.json({
            success: true,
            message: 'Attachment added successfully',
            data: {
                attachment,
                entry
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Remove attachment from timeline
// @route   DELETE /api/timeline/:id/attachments/:attachmentId
export const removeAttachment = async (req, res) => {
    try {
        const { id, attachmentId } = req.params;

        const entry = await Timeline.findById(id);
        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Timeline entry not found'
            });
        }

        // Check if user created this entry or is admin
        if (entry.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to remove attachments from this entry'
            });
        }

        // Find and remove attachment
        const attachment = entry.attachments.id(attachmentId);
        if (!attachment) {
            return res.status(404).json({
                success: false,
                error: 'Attachment not found'
            });
        }

        attachment.deleteOne();
        await entry.save();

        // Emit socket event
        const io = req.app.get('io');
        io.to(`lead-${entry.leadId}`).emit('attachment-removed', {
            entryId: id,
            attachmentId
        });

        res.json({
            success: true,
            message: 'Attachment removed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get timeline by type
// @route   GET /api/timeline/type/:type
export const getTimelineByType = async (req, res) => {
    try {
        const { type } = req.params;
        const { leadId, page = 1, limit = 20, startDate, endDate } = req.query;

        let query = { type };
        if (leadId) query.leadId = leadId;

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const entries = await Timeline.find(query)
            .populate('createdBy', 'name email avatar')
            .populate('leadId', 'name phone product')
            .sort({ date: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Timeline.countDocuments(query);

        // Get summary for this type
        const summary = await Timeline.aggregate([
            { $match: { type } },
            {
                $group: {
                    _id: null,
                    totalDuration: {
                        $sum: { $toInt: { $ifNull: ['$duration', 0] } }
                    },
                    avgDuration: {
                        $avg: { $toInt: { $ifNull: ['$duration', 0] } }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                type,
                entries,
                summary: summary[0] || {},
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

// @desc    Get timeline by date range
// @route   GET /api/timeline/date-range
export const getTimelineByDate = async (req, res) => {
    try {
        const { startDate, endDate, leadId, executiveId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Start date and end date are required'
            });
        }

        let query = {
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        if (leadId) query.leadId = leadId;
        if (executiveId) query.createdBy = executiveId;

        const entries = await Timeline.find(query)
            .populate('createdBy', 'name email')
            .populate('leadId', 'name phone product')
            .sort({ date: 1 });

        // Group by date
        const grouped = {};
        entries.forEach(entry => {
            const dateStr = entry.date.toISOString().split('T')[0];
            if (!grouped[dateStr]) {
                grouped[dateStr] = [];
            }
            grouped[dateStr].push(entry);
        });

        // Get type distribution for this period
        const typeDistribution = await Timeline.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                dateRange: { startDate, endDate },
                total: entries.length,
                grouped,
                typeDistribution,
                entries
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Search timeline entries
// @route   GET /api/timeline/search
export const searchTimeline = async (req, res) => {
    try {
        const { q, leadId, limit = 20 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        let query = {
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { 'metadata.value': { $regex: q, $options: 'i' } }
            ]
        };

        if (leadId) query.leadId = leadId;

        const entries = await Timeline.find(query)
            .populate('createdBy', 'name email')
            .populate('leadId', 'name phone')
            .sort({ date: -1 })
            .limit(limit * 1);

        // Highlight search terms
        const highlightedEntries = entries.map(entry => {
            const entryObj = entry.toObject();
            if (entryObj.title) {
                entryObj.title = entryObj.title.replace(
                    new RegExp(q, 'gi'),
                    match => `<mark>${match}</mark>`
                );
            }
            if (entryObj.description) {
                entryObj.description = entryObj.description.replace(
                    new RegExp(q, 'gi'),
                    match => `<mark>${match}</mark>`
                );
            }
            return entryObj;
        });

        res.json({
            success: true,
            data: {
                query: q,
                total: entries.length,
                entries: highlightedEntries
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Export timeline data
// @route   GET /api/timeline/export
export const exportTimeline = async (req, res) => {
    try {
        const { leadId, format = 'csv', startDate, endDate } = req.query;

        if (!leadId) {
            return res.status(400).json({
                success: false,
                error: 'Lead ID is required'
            });
        }

        let query = { leadId };
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const entries = await Timeline.find(query)
            .populate('createdBy', 'name email')
            .sort({ date: 1 });

        if (format === 'csv') {
            // Convert to CSV
            const fields = [
                'date',
                'time',
                'type',
                'title',
                'description',
                'createdByName',
                'duration',
                'value'
            ];

            const data = entries.map(entry => ({
                date: entry.date.toISOString().split('T')[0],
                time: entry.time,
                type: entry.type,
                title: entry.title,
                description: entry.description,
                createdByName: entry.createdByName,
                duration: entry.duration,
                value: entry.value
            }));

            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(data);

            res.header('Content-Type', 'text/csv');
            res.attachment(`timeline_${leadId}_${Date.now()}.csv`);
            return res.send(csv);
        }

        else if (format === 'excel') {
            // Create Excel file
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Timeline');

            // Add headers
            worksheet.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Time', key: 'time', width: 10 },
                { header: 'Type', key: 'type', width: 15 },
                { header: 'Title', key: 'title', width: 30 },
                { header: 'Description', key: 'description', width: 50 },
                { header: 'Created By', key: 'createdBy', width: 20 },
                { header: 'Duration', key: 'duration', width: 10 },
                { header: 'Value', key: 'value', width: 15 }
            ];

            // Add rows
            entries.forEach(entry => {
                worksheet.addRow({
                    date: entry.date.toISOString().split('T')[0],
                    time: entry.time,
                    type: entry.type,
                    title: entry.title,
                    description: entry.description,
                    createdBy: entry.createdByName,
                    duration: entry.duration,
                    value: entry.value
                });
            });

            // Style header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=timeline_${leadId}_${Date.now()}.xlsx`
            );

            await workbook.xlsx.write(res);
            return res.end();
        }

        else if (format === 'pdf') {
            // Create PDF
            const doc = new PDFDocument();
            const filename = `timeline_${leadId}_${Date.now()}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            doc.pipe(res);

            // Add title
            doc.fontSize(20).text('Timeline Export', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Lead ID: ${leadId}`, { align: 'center' });
            doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown();

            // Add entries
            entries.forEach((entry, index) => {
                doc.fontSize(14).text(`${index + 1}. ${entry.title}`, { continued: true });
                doc.fontSize(10).text(` (${entry.type})`, { align: 'right' });
                doc.fontSize(10).text(`Date: ${new Date(entry.date).toLocaleString()}`);
                if (entry.description) {
                    doc.fontSize(10).text(`Description: ${entry.description}`);
                }
                if (entry.createdByName) {
                    doc.fontSize(10).text(`Created By: ${entry.createdByName}`);
                }
                if (entry.duration) {
                    doc.fontSize(10).text(`Duration: ${entry.duration}`);
                }
                if (entry.value) {
                    doc.fontSize(10).text(`Value: ₹${entry.value}`);
                }
                doc.moveDown();
            });

            doc.end();
            return;
        }

        // Default JSON response
        res.json({
            success: true,
            data: entries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Bulk create timeline entries
// @route   POST /api/timeline/bulk
export const bulkCreateTimelineEntries = async (req, res) => {
    try {
        const { entries } = req.body;
        const results = {
            successful: [],
            failed: []
        };

        for (const entryData of entries) {
            try {
                // Check if lead exists
                const lead = await Lead.findById(entryData.leadId);
                if (!lead) {
                    results.failed.push({
                        data: entryData,
                        error: 'Lead not found'
                    });
                    continue;
                }

                const entry = new Timeline({
                    ...entryData,
                    createdBy: req.user.id,
                    createdByName: req.user.name,
                    date: entryData.date || new Date()
                });

                await entry.save();
                results.successful.push(entry);
            } catch (error) {
                results.failed.push({
                    data: entryData,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            success: true,
            message: `Created ${results.successful.length} entries, ${results.failed.length} failed`,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get recent timeline activity
// @route   GET /api/timeline/recent
export const getRecentActivity = async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const recent = await Timeline.find()
            .populate('leadId', 'name phone')
            .populate('createdBy', 'name avatar')
            .sort({ date: -1 })
            .limit(limit * 1);

        // Group by date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const grouped = {
            today: [],
            yesterday: [],
            earlier: []
        };

        recent.forEach(entry => {
            const entryDate = new Date(entry.date);
            entryDate.setHours(0, 0, 0, 0);

            if (entryDate.getTime() === today.getTime()) {
                grouped.today.push(entry);
            } else if (entryDate.getTime() === yesterday.getTime()) {
                grouped.yesterday.push(entry);
            } else {
                grouped.earlier.push(entry);
            }
        });

        res.json({
            success: true,
            data: {
                grouped,
                total: recent.length
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
    getLeadTimeline,
    getTimelineEntryById,
    createTimelineEntry,
    updateTimelineEntry,
    deleteTimelineEntry,
    getTimelineStats,
    addAttachment,
    removeAttachment,
    getTimelineByType,
    getTimelineByDate,
    searchTimeline,
    exportTimeline,
    bulkCreateTimelineEntries,
    getRecentActivity
};