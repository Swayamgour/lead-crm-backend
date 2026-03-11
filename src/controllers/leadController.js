import Lead from "../models/Lead.js";
import FollowUp from "../models/FollowUp.js";
import Timeline from "../models/Timeline.js";
import FollowUpHistory from "../models/FollowUpHistory.js";
import XLSX from "xlsx";
import fs from "fs";
import User from "../models/User.js";


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

    const lead = await Lead.create({
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
      createdBy: req.user._id
    });

    // timeline
    await Timeline.create({
      leadId: lead._id,
      assignedTo: lead.assignedTo,
      type: "lead_created",
      title: "Lead Created",
      description: `${lead.name} lead created`,
      createdBy: req.user._id
    });

    // followup
    if (followUpDate) {

      await FollowUp.create({
        leadId: lead._id,
        assignedTo: lead.assignedTo,
        followUpDate,
        type: "call",
        status: "pending",
        createdBy: req.user._id
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

    if (req.user.role !== "admin") {
      filter.assignedTo = req.user.id;
    }

    const leads = await Lead.find(filter)
      .populate("assignedTo", "name email");

    res.json(leads);

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};



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

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );


    // ================= ASSIGNED USER CHANGE =================

    if (req.body.assignedTo && oldAssignedTo !== req.body.assignedTo) {

      await FollowUp.updateMany(
        { leadId: updatedLead._id, status: "pending" },
        { assignedTo: req.body.assignedTo }
      );

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

    if (req.body.followUpDate) {

      const followUp = await FollowUp.findOne({
        leadId: updatedLead._id
      }).sort({ createdAt: -1 });


      // ===== UPDATE EXISTING FOLLOWUP =====

      if (followUp) {

        const oldDate = followUp.followUpDate;

        followUp.followUpDate = req.body.followUpDate;

        await followUp.save();

        await FollowUpHistory.create({
          followUpId: followUp._id,
          leadId: updatedLead._id,
          action: "updated",
          oldDate,
          newDate: req.body.followUpDate,
          changedBy: req.user._id,
          changes: {
            followUpDate: {
              old: oldDate,
              new: req.body.followUpDate
            }
          }
        });

        await Timeline.create({
          leadId: updatedLead._id,
          assignedTo: updatedLead.assignedTo,
          type: "followup_updated",
          title: "Follow Up Updated",
          description: `${user.name} changed follow up date`,
          createdBy: req.user._id,
          createdByName: user.name
        });

      }


      // ===== CREATE NEW FOLLOWUP =====

      else {

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
          changedBy: req.user._id,
          changes: {
            followUpDate: {
              new: req.body.followUpDate
            }
          }
        });

        await Timeline.create({
          leadId: updatedLead._id,
          assignedTo: updatedLead.assignedTo,
          type: "followup_created",
          title: "Follow Up Created",
          description: `${user.name} scheduled follow up`,
          createdBy: req.user._id,
          createdByName: user.name
        });

      }

    }



    // ================= NORMAL LEAD UPDATE =================

    if (!req.body.followUpDate && !req.body.assignedTo) {

      await Timeline.create({
        leadId: updatedLead._id,
        assignedTo: updatedLead.assignedTo,
        type: "lead_updated",
        title: "Lead Updated",
        description: `${user.name} updated lead details`,
        createdBy: req.user._id,
        createdByName: user.name
      });

    }



    res.json({
      success: true,
      lead: updatedLead
    });

  } catch (error) {

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