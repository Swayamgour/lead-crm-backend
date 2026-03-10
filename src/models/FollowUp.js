// src/models/FollowUp.js
import mongoose from 'mongoose';
import { FOLLOW_UP_TYPES } from '../config/constants.js';

const followUpSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Executive',
    required: false
  },
  followUpDate: {
    type: Date,
    required: true
  },
  followUpTime: String,
  type: {
    type: String,
    enum: Object.values(FOLLOW_UP_TYPES),
    required: true
  },
  purpose: String,
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'overdue', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  reminder: {
    type: Boolean,
    default: true
  },
  reminderTime: Date,
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Executive'
  },
  outcome: String,
  nextFollowUp: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
});

followUpSchema.index({ followUpDate: 1, status: 1 });
followUpSchema.index({ leadId: 1, assignedTo: 1 });

const FollowUp = mongoose.model('FollowUp', followUpSchema);
export default FollowUp;