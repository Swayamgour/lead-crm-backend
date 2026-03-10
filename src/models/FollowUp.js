

import mongoose from "mongoose"

const schema = new mongoose.Schema({

  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
    required: true
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  followUpDate: Date,

  type: {
    type: String,
    enum: ["call", "meeting", "whatsapp", "email"],
    default: "call"
  },

  status: {
    type: String,
    enum: ["pending", "completed", "missed"],
    default: "pending"
  },

  note: String,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

}, { timestamps: true })

export default mongoose.model("FollowUp", schema)