import Timeline from "../models/Timeline.js";
import mongoose from "mongoose";

/* ---------------------------
   GET ALL TIMELINES
----------------------------*/


export const getTimelineGrouped = async (req, res) => {
    try {

        let matchStage = {};

        if (req.user.role !== "admin") {
            matchStage = {
                assignedTo: new mongoose.Types.ObjectId(req.user.id)
            };
        }

        const timeline = await Timeline.aggregate([

            {
                $match: matchStage
            },

            {
                $lookup: {
                    from: "leads",
                    localField: "leadId",
                    foreignField: "_id",
                    as: "lead"
                }
            },

            { $unwind: "$lead" },

            {
                $lookup: {
                    from: "users",
                    localField: "createdBy",
                    foreignField: "_id",
                    as: "createdByUser"
                }
            },

            {
                $unwind: {
                    path: "$createdByUser",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $sort: { createdAt: -1 }
            },

            {
                $group: {
                    _id: "$leadId",

                    lead: {
                        $first: {
                            _id: "$lead._id",
                            name: "$lead.name",
                            phone: "$lead.phone"
                        }
                    },

                    timeline: {
                        $push: {
                            type: "$type",
                            title: "$title",
                            description: "$description",
                            createdAt: "$createdAt",
                            createdBy: "$createdByUser.name"
                        }
                    }
                }
            }

        ]);

        res.json(timeline);

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


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