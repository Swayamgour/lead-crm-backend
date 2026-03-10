// src/models/Timeline.js
import mongoose from 'mongoose';
import { TIMELINE_TYPES } from '../config/constants.js';

const timelineSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  type: {
    type: String,
    enum: ["lead", "task", "system", "followup"]
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Executive'
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