import FollowUp from "../models/FollowUp.js"

export const createFollowUp = async (req, res) => {

    const follow = await FollowUp.create(req.body)

    res.json(follow)

}

export const getFollowUps = async (req, res) => {

    const data = await FollowUp.find()
        .populate("leadId", "name phone")

    res.json(data)

}

export const getTodayFollowUps = async (req, res) => {

    const start = new Date()
    start.setHours(0, 0, 0, 0)

    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const data = await FollowUp.find({
        followUpDate: {
            $gte: start,
            $lte: end
        }
    })

    res.json(data)

}

export const updateFollowUp = async (req, res) => {

    const data = await FollowUp.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    )

    res.json(data)

}


// controllers/followUpController.js
export const updateFollowUpStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        const followUp = await FollowUp.findById(id).populate('leadId');

        if (!followUp) {
            return res.status(404).json({
                success: false,
                message: "Follow-up not found"
            });
        }

        const oldStatus = followUp.status;
        const oldData = {
            status: followUp.status,
            note: followUp.note
        };

        // Update followup
        followUp.status = status;
        if (note) followUp.note = note;
        await followUp.save();

        // FOLLOWUP HISTORY
        await FollowUpHistory.create({
            followUpId: followUp._id,
            leadId: followUp.leadId._id,
            action: status === "completed" ? "completed" :
                status === "missed" ? "missed" : "updated",
            changes: {
                old: oldData,
                new: { status, note }
            },
            changedBy: req.user.id
        });

        // TIMELINE
        await Timeline.create({
            leadId: followUp.leadId._id,
            type: `followup_${status}`,
            title: `Follow-up ${status}`,
            description: `Follow-up ${status} for ${followUp.leadId.name}`,
            createdBy: req.user.id,
            createdByName: req.user.name,
            metadata: {
                followUpId: followUp._id,
                oldStatus,
                newStatus: status,
                note
            }
        });

        res.json({
            success: true,
            followUp
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteFollowUp = async (req, res) => {

    await FollowUp.findByIdAndDelete(req.params.id)

    res.json({ message: "FollowUp deleted" })

}