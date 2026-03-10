// src/controllers/executiveController.js
import Executive from '../models/Executive.js';
import Lead from '../models/Lead.js';
import FollowUp from '../models/FollowUp.js';
import Timeline from '../models/Timeline.js';
import Notification from '../models/Notification.js';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '../utils/emailService.js';

// @desc    Get all executives with filters
// @route   GET /api/executives
export const getExecutives = async (req, res) => {
  try {
    const {
      status,
      role,
      team,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = {};

    // Apply filters
    if (status) query.status = status;
    if (role) query.role = role;
    if (team) query.team = team;

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const executives = await Executive.find(query)
      .select('-password')
      // .populate('reportingManager', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get stats for each executive
    const executivesWithStats = await Promise.all(
      executives.map(async (exec) => {
        const leads = await Lead.find({ assignedTo: exec._id });
        const leadsWon = leads.filter(l => l.status === 'Won').length;
        const totalValue = leads.reduce((sum, l) => sum + (l.expectedValue || 0), 0);
        const wonValue = leads
          .filter(l => l.status === 'Won')
          .reduce((sum, l) => sum + (l.expectedValue || 0), 0);

        // Get today's followups
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayFollowUps = await FollowUp.countDocuments({
          assignedTo: exec._id,
          followUpDate: { $gte: today, $lt: tomorrow },
          status: 'pending'
        });

        return {
          ...exec.toObject(),
          stats: {
            totalLeads: leads.length,
            leadsWon,
            leadsLost: leads.filter(l => l.status === 'Lost').length,
            conversionRate: leads.length ? ((leadsWon / leads.length) * 100).toFixed(1) : 0,
            totalValue,
            wonValue,
            averageValue: leads.length ? totalValue / leads.length : 0,
            todayFollowUps
          }
        };
      })
    );

    const total = await Executive.countDocuments(query);

    res.json({
      executives: executivesWithStats,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get single executive by ID
// @route   GET /api/executives/:id
export const getExecutiveById = async (req, res) => {
  try {
    const { id } = req.params;

    const executive = await Executive.findById(id)
      .select('-password')
      .populate('reportingManager', 'name email phone');

    if (!executive) {
      return res.status(404).json({ error: 'Executive not found' });
    }

    // Get detailed stats
    const leads = await Lead.find({ assignedTo: id })
      .sort({ createdAt: -1 })
      .limit(100);

    const followUps = await FollowUp.find({ assignedTo: id })
      .populate('leadId', 'name phone')
      .sort({ followUpDate: -1 })
      .limit(50);

    const timeline = await Timeline.find({ createdBy: id })
      .sort({ date: -1 })
      .limit(50);

    // Calculate monthly performance
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyLeads = leads.filter(l => l.createdAt >= startOfMonth);
    const monthlyWon = monthlyLeads.filter(l => l.status === 'Won');

    const stats = {
      totalLeads: leads.length,
      monthlyLeads: monthlyLeads.length,
      monthlyWon: monthlyWon.length,
      monthlyTarget: executive.monthlyTarget || 0,
      monthlyAchievement: monthlyWon.reduce((sum, l) => sum + (l.expectedValue || 0), 0),
      leadsByStatus: {},
      leadsBySource: {}
    };

    // Group by status
    leads.forEach(lead => {
      stats.leadsByStatus[lead.status] = (stats.leadsByStatus[lead.status] || 0) + 1;
    });

    // Group by source
    leads.forEach(lead => {
      stats.leadsBySource[lead.source] = (stats.leadsBySource[lead.source] || 0) + 1;
    });

    res.json({
      executive,
      stats,
      recentLeads: leads.slice(0, 10),
      upcomingFollowUps: followUps.filter(f => f.status === 'pending').slice(0, 10),
      recentActivity: timeline.slice(0, 20)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Create new executive
// @route   POST /api/executives

export const createExecutive = async (req, res) => {
  try {
    const executiveData = req.body;

    // console.log(req.files, req.body);

    // Check if executive already exists
    const existingExecutive = await Executive.findOne({
      $or: [
        { email: executiveData.email },
        { phone: executiveData.phone }
      ]
    });

    if (existingExecutive) {
      return res.status(400).json({
        error: 'Executive with this email or phone already exists'
      });
    }

    // Generate employee ID if not provided
    if (!executiveData.employeeId) {
      const count = await Executive.countDocuments();
      executiveData.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
    }

    // Hash password
    executiveData.password = await bcrypt.hash(executiveData.password, 10);

    // Handle avatar upload
    if (req.file) {
      executiveData.avatar = `/uploads/${req.file.filename}`;
    }

    const executive = new Executive(executiveData);
    await executive.save();

    // Send welcome email
    try {
      await sendWelcomeEmail({
        name: executive.name,
        email: executive.email,
        tempPassword: executiveData.password // Note: Don't send actual hash
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    // Create notification for admin
    await Notification.create({
      userId: req.user.id,
      type: 'system',
      title: 'New Executive Added',
      message: `${executive.name} has been added as ${executive.role}`,
      relatedTo: {
        model: 'Executive',
        id: executive._id
      }
    });

    // Remove password from response
    const executiveResponse = executive.toObject();
    delete executiveResponse.password;

    res.status(201).json({
      message: 'Executive created successfully',
      executive: executiveResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update executive
// @route   PUT /api/executives/:id
export const updateExecutive = async (req, res) => {
  try {

    const { id } = req.params;
    const updates = req.body;

    // check executive exists
    const executive = await Executive.findById(id);

    if (!executive) {
      return res.status(404).json({
        success: false,
        message: "Executive not found"
      });
    }

    // email / phone uniqueness check
    if (updates.email || updates.phone) {

      const existing = await Executive.findOne({
        _id: { $ne: id },
        $or: [
          { email: updates.email },
          { phone: updates.phone }
        ]
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Email or phone already used by another executive"
        });
      }

    }

    // validate status
    if (updates.status) {

      if (!["active", "inactive"].includes(updates.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value"
        });
      }

    }

    // password hash
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // avatar upload
    if (req.file) {
      updates.avatar = `/uploads/${req.file.filename}`;
    }

    const updatedExecutive = await Executive.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    ).select("-password");

    // timeline log
    await Timeline.create({
      type: "system",
      title: "Executive Updated",
      description: `${updatedExecutive.name}'s profile was updated`,
      createdBy: req.user.id,
      createdByName: req.user.name,
      metadata: { executiveId: id }
    });

    res.json({
      success: true,
      message: "Executive updated successfully",
      executive: updatedExecutive
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

// @desc    Delete executive
// @route   DELETE /api/executives/:id
export const deleteExecutive = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if executive has assigned leads
    const assignedLeads = await Lead.countDocuments({ assignedTo: id });
    if (assignedLeads > 0) {
      return res.status(400).json({
        error: 'Cannot delete executive with assigned leads. Please reassign leads first.'
      });
    }

    await Executive.findByIdAndDelete(id);

    // Clean up related data
    await Notification.deleteMany({ userId: id });
    await Timeline.deleteMany({ createdBy: id });

    res.json({
      message: 'Executive deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get executive performance analytics
// @route   GET /api/executives/:id/performance
export const getExecutivePerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, period = 'monthly' } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const leads = await Lead.find({
      assignedTo: id,
      ...dateFilter
    });

    // Basic stats
    const stats = {
      totalLeads: leads.length,
      byStatus: {},
      bySource: {},
      byPipeline: {},
      wonLeads: leads.filter(l => l.status === 'Won').length,
      lostLeads: leads.filter(l => l.status === 'Lost').length,
      conversionRate: 0,
      totalValue: leads.reduce((sum, l) => sum + (l.expectedValue || 0), 0),
      averageValue: 0
    };

    // Calculate by status
    leads.forEach(lead => {
      stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
      stats.bySource[lead.source] = (stats.bySource[lead.source] || 0) + 1;
      stats.byPipeline[lead.pipelineStage] = (stats.byPipeline[lead.pipelineStage] || 0) + 1;
    });

    stats.conversionRate = leads.length ?
      ((stats.wonLeads / leads.length) * 100).toFixed(1) : 0;
    stats.averageValue = leads.length ?
      stats.totalValue / leads.length : 0;

    // Monthly/Weekly breakdown
    const breakdown = {};
    leads.forEach(lead => {
      const date = new Date(lead.createdAt);
      let key;

      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const week = Math.ceil(date.getDate() / 7);
        key = `Week ${week}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!breakdown[key]) {
        breakdown[key] = {
          leads: 0,
          won: 0,
          value: 0
        };
      }
      breakdown[key].leads++;
      if (lead.status === 'Won') {
        breakdown[key].won++;
        breakdown[key].value += lead.expectedValue || 0;
      }
    });

    // Get follow-up stats
    const followUps = await FollowUp.find({
      assignedTo: id,
      ...dateFilter
    });

    const followUpStats = {
      total: followUps.length,
      completed: followUps.filter(f => f.status === 'completed').length,
      pending: followUps.filter(f => f.status === 'pending').length,
      overdue: followUps.filter(f => f.status === 'overdue').length,
      byType: {}
    };

    followUps.forEach(f => {
      followUpStats.byType[f.type] = (followUpStats.byType[f.type] || 0) + 1;
    });

    res.json({
      executive: id,
      period,
      stats,
      breakdown,
      followUpStats,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get executive team
// @route   GET /api/executives/team/:managerId
export const getExecutiveTeam = async (req, res) => {
  try {
    const { managerId } = req.params;

    const team = await Executive.find({ reportingManager: managerId })
      .select('name email phone role status totalLeads leadsWon avatar');

    const teamStats = {
      total: team.length,
      active: team.filter(e => e.status === 'active').length,
      totalLeads: team.reduce((sum, e) => sum + (e.totalLeads || 0), 0),
      totalWon: team.reduce((sum, e) => sum + (e.leadsWon || 0), 0)
    };

    res.json({
      manager: managerId,
      team,
      stats: teamStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update executive status
// @route   PATCH /api/executives/:id/status
export const updateExecutiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'on-leave'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const executive = await Executive.findByIdAndUpdate(
      id,
      { status, updatedAt: Date.now() },
      { new: true }
    ).select('-password');

    res.json({
      message: `Executive status updated to ${status}`,
      executive
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Bulk import executives
// @route   POST /api/executives/bulk-import
export const bulkImportExecutives = async (req, res) => {
  try {
    const { executives } = req.body;
    const results = {
      successful: [],
      failed: []
    };

    for (const execData of executives) {
      try {
        // Generate password if not provided
        if (!execData.password) {
          execData.password = Math.random().toString(36).slice(-8);
        }

        // Hash password
        execData.password = await bcrypt.hash(execData.password, 10);

        // Generate employee ID
        const count = await Executive.countDocuments();
        execData.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;

        const executive = new Executive(execData);
        await executive.save();

        results.successful.push({
          name: execData.name,
          email: execData.email,
          id: executive._id
        });
      } catch (error) {
        results.failed.push({
          data: execData,
          error: error.message
        });
      }
    }

    res.json({
      message: `Imported ${results.successful.length} executives`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};