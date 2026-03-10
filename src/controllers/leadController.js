// src/controllers/leadController.js
import Lead from '../models/Lead.js';
import Timeline from '../models/Timeline.js';
import FollowUp from '../models/FollowUp.js';
// import Notification from '../models/Notification.js';

export const getLeads = async (req, res) => {
  try {
    const {
      status,
      source,
      assignedTo,
      priority,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10
    } = req.query;

    let query = {};

    if (status) query.status = status;
    if (source) query.source = source;
    if (assignedTo) query.assignedTo = assignedTo;
    if (priority) query.priority = priority;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { product: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments(query);

    res.json({
      leads,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id)
      .populate('assignedTo', 'name email phone')
      .populate('createdBy', 'name email');

    const timeline = await Timeline.find({ leadId: id })
      .sort({ date: -1 })
      .limit(50);

    const followUps = await FollowUp.find({ leadId: id })
      .sort({ followUpDate: -1 });

    res.json({
      lead,
      timeline,
      followUps
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export const getLeadsByExecutive = async (req, res) => {
  try {

    const { executiveId } = req.params;

    const leads = await Lead.find({ assignedTo: executiveId })
      .populate('assignedTo', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(leads);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const createLead = async (req, res) => {
  try {

    const {
      name,
      phone,
      email,
      source,
      status,
      assignedTo,
      remark,
      followUpDate,
      expectedValue,
      tags
    } = req.body;

    const lead = new Lead({
      name,
      phone,
      email,
      source,
      status,
      assignedTo,
      remarks: remark,
      followUpDate,
      expectedValue,
      tags,
      createdBy: req.user.id
    });

    await lead.save();

    if (followUpDate) {

      await FollowUp.create({
        leadId: lead._id,
        assignedTo,
        followUpDate,
        type: "call",
        status: "pending",
        createdBy: req.user.id
      });

    }

    await Timeline.create({
      leadId: lead._id,
      type: "lead",
      title: "Lead Created",
      description: `Lead created by ${req.user.name}`,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: "Lead Created Successfully",
      lead
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateLead = async (req, res) => {
  try {

    const { id } = req.params;

    const {
      name,
      phone,
      email,
      source,
      status,
      assignedTo,
      remark,
      followUpDate,
      expectedValue,
      tags
    } = req.body;

    // old lead
    const oldLead = await Lead.findById(id);

    if (!oldLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // update lead
    const lead = await Lead.findByIdAndUpdate(
      id,
      {
        name,
        phone,
        email,
        source,
        status,
        assignedTo: assignedTo || oldLead.assignedTo,
        remarks: remark,
        followUpDate,
        expectedValue,
        tags
      },
      { new: true }
    );

    // followUpDate change check
    if (
      followUpDate &&
      (
        !oldLead.followUpDate ||
        new Date(oldLead.followUpDate).getTime() !== new Date(followUpDate).getTime()
      )
    ) {

      await FollowUp.create({
        leadId: id,
        assignedTo: assignedTo || oldLead.assignedTo,
        followUpDate: followUpDate,
        type: "call",
        status: "pending",
        createdBy: req.user.id
      });

      await Timeline.create({
        leadId: id,
        type: "followup",
        title: "Follow-up Scheduled",
        description: `Next follow-up on ${new Date(followUpDate).toLocaleDateString()}`,
        createdBy: req.user.id,
        createdByName: req.user.name
      });

    }

    res.json({
      success: true,
      message: "Lead Updated",
      lead
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    await Lead.findByIdAndDelete(id);
    await Timeline.deleteMany({ leadId: id });
    await FollowUp.deleteMany({ leadId: id });

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeadsStats = async (req, res) => {
  try {
    const stats = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$expectedValue' }
        }
      }
    ]);

    const sourceStats = await Lead.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      byStatus: stats,
      bySource: sourceStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};