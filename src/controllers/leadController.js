import Lead from "../models/Lead.js";
import LeadHistory from "../models/LeadHistory.js";
import FollowUp from "../models/FollowUp.js";
import RemarkHistory from "../models/RemarkHistory.js";
import Timeline from "../models/Timeline.js";
import FollowUpHistory from "../models/FollowUpHistory.js";
import XLSX from "xlsx";
import fs from "fs";
import User from "../models/User.js";

// import axios from "axios"
// import Lead from "../models/Lead.js"


// ================= CREATE LEAD =================

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

    const user = await User.findById(req.user.id);

    const remarks = [];

    // agar remark diya gaya hai
    if (remark && remark.trim() !== "") {
      remarks.push({
        text: remark.trim(),
        createdBy: req.user.id,
        createdByName: user.name,
        createdAt: new Date(),
        isEdited: false
      });
    }

    const lead = await Lead.create({
      name,
      phone,
      email,
      source,
      status,
      assignedTo,
      remarks: remarks,
      followUpDate,
      expectedValue,
      tags,
      createdBy: req.user.id
    });

    // timeline
    await Timeline.create({
      leadId: lead._id,
      assignedTo: lead.assignedTo,
      type: "lead_created",
      title: "Lead Created",
      description: `${lead.name} lead created`,
      createdBy: req.user.id
    });

    // agar remark hai to timeline bhi
    if (remarks.length > 0) {
      await Timeline.create({
        leadId: lead._id,
        assignedTo: lead.assignedTo,
        type: "remark_added",
        title: "Remark Added",
        description: `${user.name} added remark while creating lead`,
        createdBy: req.user.id,
        createdByName: user.name,
        metadata: {
          text: remarks[0].text
        }
      });
    }

    // followup
    if (followUpDate) {
      await FollowUp.create({
        leadId: lead._id,
        assignedTo: lead.assignedTo,
        followUpDate,
        type: "call",
        status: "pending",
        createdBy: req.user.id
      });
    }

    res.json({
      success: true,
      lead
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};



// ================= UPLOAD EXCEL =================

export const uploadLeadsExcel = async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file required"
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const executives = await User.find({ role: "executive", isActive: true });

    if (!executives.length) {
      return res.status(400).json({
        success: false,
        message: "No executive found"
      });
    }

    let index = 0;

    const leads = rows.map((row) => {

      const assignedExecutive = executives[index % executives.length];
      index++;

      return {
        name: row.name,
        phone: row.phone,
        email: row.email || "",
        source: row.source || "excel",
        followUpDate: row.followUpDate || null,
        assignedTo: assignedExecutive._id,
        createdBy: req.user._id
      };

    });

    const result = await Lead.insertMany(leads);

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      total: rows.length,
      imported: result.length
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};



// ================= GET LEADS =================

export const getLeads = async (req, res) => {
  try {

    let filter = {};

    // If user is not admin, only show leads assigned to them
    if (req.user.role !== "admin") {
      filter.assignedTo = req.user.id;
    }

    // Filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.source) filter.source = req.query.source;
    if (req.query.pipelineStage) filter.pipelineStage = req.query.pipelineStage;

    if (req.query.assignedTo && req.user.role === "admin") {
      filter.assignedTo = req.query.assignedTo;
    }

    // Search
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { phone: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { companyName: { $regex: req.query.search, $options: "i" } },
        { "remarks.text": { $regex: req.query.search, $options: "i" } }
      ];
    }

    // Followup filter
    if (req.query.followUpDate) {

      if (req.query.followUpDate === "today") {

        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        filter.followUpDate = { $gte: start, $lte: end };

      } else if (req.query.followUpDate === "upcoming") {

        filter.followUpDate = { $gte: new Date() };

      } else if (req.query.followUpDate === "overdue") {

        filter.followUpDate = { $lt: new Date() };
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    let sort = { createdAt: -1 };

    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(":");
      sort = { [parts[0]]: parts[1] === "desc" ? -1 : 1 };
    }

    // Fetch leads with populated fields
    const leads = await Lead.find(filter)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate({
        path: "remarks.createdBy",
        select: "name email"
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get lead IDs
    const leadIds = leads.map(l => l._id);

    // Get history for remarks only
    const remarksHistories = await LeadHistory.find({
      leadId: { $in: leadIds },
      action: { $in: ["remark_added", "remark_edited", "remark_deleted"] }
    })
      .sort({ createdAt: -1 })
      .lean();

    // Get pending follow-ups
    const followUps = await FollowUp.find({
      leadId: { $in: leadIds },
      status: "pending"
    })
      .lean();

    // Process leads
    const leadsWithDetails = leads.map(lead => {

      // Sort remarks (newest first)
      const sortedRemarks = lead.remarks ?
        [...lead.remarks].sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        ) : [];

      // Get remarks history for this lead
      const leadRemarksHistory = remarksHistories.filter(
        h => h.leadId.toString() === lead._id.toString()
      );

      // Get follow-ups for this lead
      const leadFollowUps = followUps.filter(
        f => f.leadId.toString() === lead._id.toString()
      );

      return {
        ...lead,
        remarks: sortedRemarks,
        remarksCount: sortedRemarks.length,
        remarksHistory: leadRemarksHistory,
        pendingFollowUps: leadFollowUps,
        pendingFollowUpsCount: leadFollowUps.length,
        lastRemark: sortedRemarks.length > 0 ? sortedRemarks[0] : null
      };
    });

    // Total count
    const totalLeads = await Lead.countDocuments(filter);

    res.json(leadsWithDetails);

    // {
    //   success: true,
    //   leads: ,
    //   pagination: {
    //     total: totalLeads,
    //     page,
    //     limit,
    //     pages: Math.ceil(totalLeads / limit)
    //   }
    // }

  } catch (error) {

    console.error("Error in getLeads:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};



// Helper function to count occurrences in array
function countOccurrences(arr) {
  return arr.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {});
}



// ================= GET LEAD BY ID =================

export const getLeadById = async (req, res) => {

  const lead = await Lead.findById(req.params.id)
    .populate("assignedTo", "name email");

  res.json(lead);

};



// ================= UPDATE LEAD =================

export const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const user = await User.findById(req.user.id);
    const oldAssignedTo = lead.assignedTo?.toString();

    // Store old values for comparison
    const oldValues = {
      assignedTo: lead.assignedTo?.toString(),
      followUpDate: lead.followUpDate,
      status: lead.status,
      priority: lead.priority,
      pipelineStage: lead.pipelineStage,
      remarks: lead.remarks,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      product: lead.product,
      expectedValue: lead.expectedValue,
      city: lead.city,
      state: lead.state,
      companyName: lead.companyName,
      tags: lead.tags ? [...lead.tags] : []
    };

    // Track which fields are being updated
    const updatedFields = [];
    const changes = {};

    // Compare and track changes for each field
    for (const [key, value] of Object.entries(req.body)) {
      if (key !== 'assignedTo' && key !== 'followUpDate' && key !== 'remarks') {
        if (JSON.stringify(oldValues[key]) !== JSON.stringify(value)) {
          updatedFields.push(key);
          changes[key] = {
            old: oldValues[key],
            new: value
          };
        }
      }
    }

    // Update the lead
    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    console.log(updatedLead, "jkhgfd")

    // ================= CREATE HISTORY FOR ALL UPDATES =================

    // Create history for regular field updates (including remarks)
    if (Object.keys(changes).length > 0) {
      await LeadHistory.create({
        leadId: updatedLead._id,
        action: 'updated',
        changedBy: req.user.id,
        changedByName: user.name,
        changes: changes,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      // Create timeline entry for the update
      await Timeline.create({
        leadId: updatedLead._id,
        assignedTo: updatedLead.assignedTo,
        type: "lead_updated",
        title: "Lead Updated",
        description: `${user.name} updated lead details: ${updatedFields.join(', ')}`,
        createdBy: req.user._id,
        createdByName: user.name,
        metadata: { updatedFields, changes }
      });
    }

    // ================= ASSIGNED USER CHANGE =================
    if (req.body.assignedTo && oldAssignedTo !== req.body.assignedTo) {
      await FollowUp.updateMany(
        { leadId: updatedLead._id, status: "pending" },
        { assignedTo: req.body.assignedTo }
      );

      // Create assignment history
      await LeadHistory.create({
        leadId: updatedLead._id,
        action: 'assigned',
        field: 'assignedTo',
        oldValue: oldAssignedTo,
        newValue: req.body.assignedTo,
        changedBy: req.user.id,
        changedByName: user.name,
        changes: {
          assignedTo: {
            old: oldAssignedTo,
            new: req.body.assignedTo
          }
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      await Timeline.create({
        leadId: updatedLead._id,
        assignedTo: req.body.assignedTo,
        type: "lead_assigned",
        title: "Lead Assigned",
        description: `${user.name} assigned this lead`,
        createdBy: req.user._id,
        createdByName: user.name
      });
    }

    // ================= FOLLOWUP DATE CHANGE =================
    if (req.body.followUpDate &&
      new Date(req.body.followUpDate).getTime() !== new Date(oldValues.followUpDate).getTime()) {

      const followUp = await FollowUp.findOne({
        leadId: updatedLead._id
      }).sort({ createdAt: -1 });

      if (followUp) {
        const oldDate = followUp.followUpDate;
        followUp.followUpDate = req.body.followUpDate;
        await followUp.save();

        // Create followup history
        await FollowUpHistory.create({
          followUpId: followUp._id,
          leadId: updatedLead._id,
          action: "updated",
          oldDate,
          newDate: req.body.followUpDate,
          changedBy: req.user.id,
          changes: {
            followUpDate: {
              old: oldDate,
              new: req.body.followUpDate
            }
          }
        });

        // Create lead history for followup update
        await LeadHistory.create({
          leadId: updatedLead._id,
          action: 'followup_updated',
          field: 'followUpDate',
          oldValue: oldDate,
          newValue: req.body.followUpDate,
          changedBy: req.user.id,
          changedByName: user.name,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        await Timeline.create({
          leadId: updatedLead._id,
          assignedTo: updatedLead.assignedTo,
          type: "followup_updated",
          title: "Follow Up Updated",
          description: `${user.name} changed follow up date from ${new Date(oldDate).toLocaleDateString()} to ${new Date(req.body.followUpDate).toLocaleDateString()}`,
          createdBy: req.user._id,
          createdByName: user.name
        });
      } else {
        const newFollowUp = await FollowUp.create({
          leadId: updatedLead._id,
          assignedTo: updatedLead.assignedTo,
          followUpDate: req.body.followUpDate,
          type: "call",
          status: "pending",
          createdBy: req.user._id
        });

        await FollowUpHistory.create({
          followUpId: newFollowUp._id,
          leadId: updatedLead._id,
          action: "created",
          newDate: req.body.followUpDate,
          changedBy: req.user.id,
          changes: {
            followUpDate: {
              new: req.body.followUpDate
            }
          }
        });

        await LeadHistory.create({
          leadId: updatedLead._id,
          action: 'followup_created',
          field: 'followUpDate',
          newValue: req.body.followUpDate,
          changedBy: req.user.id,
          changedByName: user.name,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        await Timeline.create({
          leadId: updatedLead._id,
          assignedTo: updatedLead.assignedTo,
          type: "followup_created",
          title: "Follow Up Created",
          description: `${user.name} scheduled follow up for ${new Date(req.body.followUpDate).toLocaleDateString()}`,
          createdBy: req.user._id,
          createdByName: user.name
        });
      }
    }

    // ===== SPECIAL HANDLING FOR REMARKS (if you want extra tracking) =====


    // ================= REMARKS HISTORY =================





    res.json({
      success: true,
      lead: updatedLead,
      updatedFields: Object.keys(changes),
      message: Object.keys(changes).length > 0 ? 'Lead updated successfully' : 'No changes detected'
    });

  } catch (error) {
    console.error('Error in updateLead:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ================= DELETE LEAD =================

export const deleteLead = async (req, res) => {

  try {

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    await FollowUp.deleteMany({ leadId: lead._id });

    await Timeline.create({
      leadId: lead._id,
      assignedTo: lead.assignedTo,
      type: "lead_deleted",
      title: "Lead Deleted",
      description: `${lead.name} lead deleted`,
      createdBy: req.user._id
    });

    await Lead.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Lead deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};



// ================= CHANGE STATUS =================

export const changeLeadStatus = async (req, res) => {

  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  await Timeline.create({
    leadId: lead._id,
    assignedTo: lead.assignedTo,
    type: "status_changed",
    title: "Status Updated",
    description: `Lead status changed to ${req.body.status}`,
    createdBy: req.user._id
  });

  res.json(lead);

};






// ================= REMARK MANAGEMENT =================

// Add a new remark
// In your backend leadController.js

export const addRemark = async (req, res) => {
  try {
    console.log("=== ADD REMARK DEBUG ===");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    console.log("Request user:", req.user?.id);

    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      console.log("Error: No text provided");
      return res.status(400).json({
        success: false,
        message: "Remark text is required"
      });
    }

    console.log("Looking for lead with ID:", id);
    const lead = await Lead.findById(id);
    if (!lead) {
      console.log("Error: Lead not found");
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    console.log("Looking for user with ID:", req.user.id);
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("Error: User not found");
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const userId = req.user?.id || req.user?._id;

    console.log("User ID:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Create new remark object with createdBy from authenticated user
    const newRemark = {
      text: text.trim(),
      createdBy: userId,
      createdByName: user.name,
      createdAt: new Date(),
      isEdited: false
    };

    console.log("New remark object:", newRemark);


    // Add remark to lead
    lead.remarks.push(newRemark);

    lead.updatedAt = new Date();

    await lead.save();

    const addedRemark = lead.remarks[lead.remarks.length - 1];

    await Timeline.create({
      leadId: lead._id,
      assignedTo: lead.assignedTo,
      type: "remark_added",
      title: "Remark Added",
      description: `${user.name} added a remark`,
      createdBy: req.user.id,
      createdByName: user.name,
      metadata: {
        remarkId: addedRemark._id,
        text: addedRemark.text
      }
    });



    console.log("Added remark successfully:", addedRemark);
    console.log("Added remark successfully:", addedRemark);

    res.json({
      success: true,
      message: "Remark added successfully",
      remark: addedRemark
    });

  } catch (error) {
    console.error('Error in addRemark:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Edit an existing remark
export const editRemark = async (req, res) => {
  try {
    const { id, remarkId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Remark text is required"
      });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // Find the remark
    const remark = lead.remarks.id(remarkId);
    if (!remark) {
      return res.status(404).json({
        success: false,
        message: "Remark not found"
      });
    }

    const user = await User.findById(req.user.id);
    const oldText = remark.text;

    // Update the remark
    remark.text = text.trim();
    remark.updatedAt = new Date();
    remark.isEdited = true;
    lead.updatedAt = new Date();

    await lead.save();

    // Create history entry in LeadHistory
    await LeadHistory.create({
      leadId: lead._id,
      action: "remark_edited",
      field: "remarks",
      oldValue: oldText,
      newValue: text.trim(),
      changedBy: req.user.id,
      changedByName: user.name,
      changes: {
        remark: {
          remarkId: remark._id,
          oldText,
          newText: text.trim()
        }
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    // Create timeline entry
    await Timeline.create({
      leadId: lead._id,
      assignedTo: lead.assignedTo,
      type: "remark_edited",
      title: "Remark Edited",
      description: `${user.name} edited a remark`,
      createdBy: req.user.id,
      createdByName: user.name,
      metadata: {
        remarkId: remark._id,
        oldText,
        newText: text.trim()
      }
    });

    // Create detailed remark history
    if (RemarkHistory) {
      await RemarkHistory.create({
        leadId: lead._id,
        remarkId: remark._id,
        action: 'updated',
        oldText,
        newText: text.trim(),
        changedBy: req.user.id,
        changedByName: user.name,
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
    }

    res.json({
      success: true,
      message: "Remark updated successfully",
      remark,
      allRemarks: lead.remarks
    });

  } catch (error) {
    console.error('Error in editRemark:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a remark
export const deleteRemark = async (req, res) => {
  try {
    const { id, remarkId } = req.params;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // Find the remark
    const remark = lead.remarks.id(remarkId);
    if (!remark) {
      return res.status(404).json({
        success: false,
        message: "Remark not found"
      });
    }

    const user = await User.findById(req.user.id);
    const deletedText = remark.text;

    // Remove the remark
    remark.remove();
    lead.updatedAt = new Date();
    await lead.save();

    // Create history entry in LeadHistory
    await LeadHistory.create({
      leadId: lead._id,
      action: "remark_deleted",
      field: "remarks",
      oldValue: deletedText,
      changedBy: req.user.id,
      changedByName: user.name,
      changes: {
        remark: {
          remarkId,
          deletedText
        }
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    // Create timeline entry
    await Timeline.create({
      leadId: lead._id,
      assignedTo: lead.assignedTo,
      type: "remark_deleted",
      title: "Remark Deleted",
      description: `${user.name} deleted a remark`,
      createdBy: req.user._id,
      createdByName: user.name,
      metadata: {
        remarkId,
        deletedText
      }
    });

    // Create detailed remark history
    if (RemarkHistory) {
      await RemarkHistory.create({
        leadId: lead._id,
        remarkId,
        action: 'deleted',
        oldText: deletedText,
        changedBy: req.user.id,
        changedByName: user.name,
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
    }

    res.json({
      success: true,
      message: "Remark deleted successfully",
      allRemarks: lead.remarks
    });

  } catch (error) {
    console.error('Error in deleteRemark:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all remarks for a lead with history
export const getLeadRemarks = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id)
      .populate('remarks.createdBy', 'name email')
      .select('remarks');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // Get remark history if you're using RemarkHistory model
    let remarkHistory = [];
    if (RemarkHistory) {
      remarkHistory = await RemarkHistory.find({ leadId: id })
        .populate('changedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();
    }

    // Sort remarks by createdAt descending (newest first)
    const sortedRemarks = lead.remarks.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      remarks: sortedRemarks,
      history: remarkHistory,
      totalRemarks: sortedRemarks.length
    });

  } catch (error) {
    console.error('Error in getLeadRemarks:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};