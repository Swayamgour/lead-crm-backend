// models/FollowUpHistory.js

import mongoose from "mongoose";

const schema = new mongoose.Schema({

    followUpId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FollowUp",
        required: true
    },

    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
        required: true
    },

    action: {
        type: String,
        enum: ["created", "updated", "completed", "missed"],
        required: true
    },

    oldDate: Date,
    newDate: Date,

    note: String,

    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    changes: mongoose.Schema.Types.Mixed

}, { timestamps: true });

export default mongoose.model("FollowUpHistory", schema);