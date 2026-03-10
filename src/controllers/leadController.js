// import Lead from "../models/Lead.js"
import Lead from "../models/Lead.js";
import FollowUp from "../models/FollowUp.js";
import Timeline from "../models/Timeline.js";
import FollowUpHistory from "../models/FollowUpHistory.js";

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
      createdBy: req.user.id
    });

    // timeline
    await Timeline.create({
      leadId: lead._id,
      type: "lead_created",
      title: "Lead Created",
      description: `${lead.name} lead created`,
      createdBy: req.user.id
    });

    // followup
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

export const getLeads = async (req, res) => {

  const leads = await Lead.find()
    .populate("assignedTo", "name email")

  res.json(leads)

}

export const getLeadById = async (req, res) => {

  const lead = await Lead.findById(req.params.id)

  res.json(lead)

}


export const updateLead = async (req, res) => {

  try {

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    // Lead timeline
    await Timeline.create({
      leadId: updatedLead._id,
      type: "lead_updated",
      title: "Lead Updated",
      description: `${updatedLead.name} lead updated`,
      createdBy: req.user.id
    });

    if (req.body.followUpDate) {

      const followUp = await FollowUp.findOne({
        leadId: updatedLead._id,
        status: "pending"
      });

      // EXISTING FOLLOWUP
      if (followUp) {

        const oldDate = followUp.followUpDate;

        followUp.followUpDate = req.body.followUpDate;

        await followUp.save();

        // FollowUp History
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

        // Timeline
        await Timeline.create({
          leadId: updatedLead._id,
          type: "followup_updated",
          title: "Follow Up Updated",
          description: `Follow up date changed from ${oldDate} to ${req.body.followUpDate}`,
          createdBy: req.user.id
        });

      }

      // CREATE NEW FOLLOWUP
      else {

        const newFollowUp = await FollowUp.create({
          leadId: updatedLead._id,
          assignedTo: updatedLead.assignedTo,
          followUpDate: req.body.followUpDate,
          type: "call",
          status: "pending",
          createdBy: req.user.id
        });

        // FollowUp History
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

        // Timeline
        await Timeline.create({
          leadId: updatedLead._id,
          type: "followup_created",
          title: "Follow Up Created",
          description: `Follow up scheduled for ${req.body.followUpDate}`,
          createdBy: req.user.id
        });

      }

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




export const deleteLead = async (req, res) => {

  try {

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // delete followups
    await FollowUp.deleteMany({ leadId: lead._id });

    // timeline entry
    await Timeline.create({
      leadId: lead._id,
      type: "lead_deleted",
      title: "Lead Deleted",
      description: `${lead.name} lead deleted`,
      createdBy: req.user.id
    });

    // delete lead
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

export const changeLeadStatus = async (req, res) => {

  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  await Timeline.create({
    leadId: lead._id,
    type: "status_changed",
    title: "Status Updated",
    description: `Lead status changed to ${req.body.status}`,
    createdBy: req.user.id
  });

  res.json(lead);

};