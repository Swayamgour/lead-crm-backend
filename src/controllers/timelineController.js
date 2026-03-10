import Timeline from "../models/Timeline.js";

/* ---------------------------
   GET ALL TIMELINES
----------------------------*/

export const getAllTimelines = async (req, res) => {

    try {

        const timelines = await Timeline.find()
            .populate("leadId", "name phone")
            .populate("createdBy", "name")
            .sort({ createdAt: -1 });

        res.json(timelines);

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


/* ---------------------------
   GET TIMELINE BY LEAD
----------------------------*/

export const getLeadTimeline = async (req, res) => {

    try {

        const timelines = await Timeline.find({
            leadId: req.params.leadId
        })
            .populate("createdBy", "name")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            timelines
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


/* ---------------------------
   CREATE TIMELINE
----------------------------*/

export const createTimeline = async (req, res) => {

    try {

        const timeline = await Timeline.create({
            leadId: req.body.leadId,
            type: req.body.type,
            title: req.body.title,
            description: req.body.description,
            createdBy: req.body.createdBy
        });

        res.json({
            success: true,
            timeline
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


/* ---------------------------
   DELETE TIMELINE
----------------------------*/

export const deleteTimeline = async (req, res) => {

    try {

        await Timeline.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "Timeline deleted"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};