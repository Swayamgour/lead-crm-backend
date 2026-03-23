// src/models/Timeline.js
import mongoose from 'mongoose';
import { TIMELINE_TYPES } from '../config/constants.js';

const timelineSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,

    ref: 'Lead',
    required: false
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  type: {
    type: String,
    enum: [
      "lead_updated",
      "lead_created",
      "status_changed",
      "lead_assigned",
      "note_added",
      "followup_created",    // Add this
      "followup_updated",     // Add this
      "followup_completed",   // Optional
      "followup_missed",    // Optional
      "remark_added",
      "remark_edited",   // ✅ yaha add karo
      "remark_deleted",
      "followup_added",
      "lead_deleted"
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdByName: String,
  date: {
    type: Date,
    default: Date.now
  },
  time: String,
  duration: String,
  callDuration: Number,
  callRecording: String,
  messageContent: String,
  mediaUrls: [String],
  meetingLink: String,
  attachments: [{
    name: String,
    url: String,
    size: String,
    type: String
  }],
  status: {
    type: String,
    enum: ['completed', 'pending', 'upcoming', 'cancelled'],
    default: 'completed'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'normal', 'low'],
    default: 'normal'
  },
  value: Number,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

timelineSchema.index({ leadId: 1, date: -1 });

const Timeline = mongoose.model('Timeline', timelineSchema);
export default Timeline;