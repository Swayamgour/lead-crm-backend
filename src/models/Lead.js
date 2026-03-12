// src/models/Lead.js
import mongoose from 'mongoose';
import { LEAD_STATUS, LEAD_SOURCES, PIPELINE_STAGES, PRIORITY } from '../config/constants.js';

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: String,
  
  source: {
    type: String,
    enum: Object.values(LEAD_SOURCES),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(LEAD_STATUS),
    default: LEAD_STATUS.INCOMING
  },
  priority: {
    type: String,
    enum: Object.values(PRIORITY),
    default: PRIORITY.MEDIUM
  },
  product: String,
  expectedValue: Number,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  followUpDate: Date,
  followUpTime: String,
  lastContactDate: Date,
  pipelineStage: {
    type: String,
    enum: Object.values(PIPELINE_STAGES),
    default: PIPELINE_STAGES.NEW_LEAD
  },
  remarks: String,
  tags: [String],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: Date
  }],
  city: String,
  state: String,
  companyName: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
}, {
  timestamps: true
});

// Indexes
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ pipelineStage: 1 });
leadSchema.index({ followUpDate: 1 });
leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);
export default Lead;


