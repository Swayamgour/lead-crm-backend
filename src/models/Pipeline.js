// src/models/Pipeline.js
import mongoose from 'mongoose';
import { PIPELINE_STAGES, PIPELINE_STAGES_ORDER } from '../config/constants.js';

const pipelineSchema = new mongoose.Schema({
  // Lead reference
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true
  },

  // Current stage
  stage: {
    type: String,
    enum: [
      'New Lead',
      'Contacted',
      'Requirement Identified',
      'Quotation Sent',
      'Follow-Up',
      'Negotiation',
      'Won',
      'Lost'
    ],
    required: true,
    index: true
  },

  // Previous stage (for tracking movement)
  previousStage: {
    type: String,
    enum: [
      'New Lead',
      'Contacted',
      'Requirement Identified',
      'Quotation Sent',
      'Follow-Up',
      'Negotiation',
      'Won',
      'Lost'
    ]
  },

  // Who moved the lead
  movedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Executive',
    required: true
  },

  // Movement details
  movedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Time spent in previous stage (in hours)
  timeInStage: {
    type: Number,
    default: 0,
    min: 0
  },

  // Movement remarks
  remarks: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Stage-specific data
  stageData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Conversion probability (0-100%)
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: function() {
      // Set default probability based on stage
      const probabilities = {
        'New Lead': 10,
        'Contacted': 20,
        'Requirement Identified': 40,
        'Quotation Sent': 60,
        'Follow-Up': 70,
        'Negotiation': 80,
        'Won': 100,
        'Lost': 0
      };
      return probabilities[this.stage] || 10;
    }
  },

  // Expected deal value at this stage
  expectedValue: {
    type: Number,
    min: 0,
    default: 0
  },

  // Stage duration tracking
  stageDuration: {
    enteredAt: { type: Date, default: Date.now },
    exitedAt: Date,
    duration: Number // in hours
  },

  // Stage-specific notes
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Executive'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Stage attachments
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Executive'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Stage tasks
  tasks: [{
    title: String,
    description: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Executive'
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Executive'
    }
  }],

  // Stage requirements/checklist
  checklist: [{
    item: String,
    required: { type: Boolean, default: true },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Executive'
    }
  }],

  // Movement history
  movementHistory: [{
    fromStage: String,
    toStage: String,
    movedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Executive'
    },
    movedAt: Date,
    timeInStage: Number,
    remarks: String
  }],

  // Stage metrics
  metrics: {
    timeSpent: Number, // Total time in this stage
    revisits: { type: Number, default: 0 }, // Number of times lead returned to this stage
    interactions: { type: Number, default: 0 }, // Number of interactions in this stage
    lastInteractionAt: Date
  },

  // Automation flags
  automation: {
    triggered: { type: Boolean, default: false },
    triggeredAt: Date,
    actions: [{
      type: String,
      status: String,
      executedAt: Date
    }]
  },

  // System fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== INDEXES ==========

// Compound indexes for common queries
pipelineSchema.index({ leadId: 1, movedAt: -1 });
pipelineSchema.index({ stage: 1, movedAt: -1 });
pipelineSchema.index({ movedBy: 1, stage: 1 });
pipelineSchema.index({ probability: 1 });
pipelineSchema.index({ expectedValue: 1 });
pipelineSchema.index({ 'stageDuration.enteredAt': 1 });
pipelineSchema.index({ 'automation.triggered': 1 });

// ========== VIRTUALS ==========

// Time in current stage
pipelineSchema.virtual('currentStageDuration').get(function() {
  if (!this.stageDuration.enteredAt) return 0;
  const end = this.stageDuration.exitedAt || new Date();
  return Math.round((end - this.stageDuration.enteredAt) / (1000 * 60 * 60)); // hours
});

// Is lead active in pipeline
pipelineSchema.virtual('isActive').get(function() {
  return !['Won', 'Lost'].includes(this.stage);
});

// Days in current stage
pipelineSchema.virtual('daysInStage').get(function() {
  if (!this.stageDuration.enteredAt) return 0;
  const end = this.stageDuration.exitedAt || new Date();
  return Math.round((end - this.stageDuration.enteredAt) / (1000 * 60 * 60 * 24));
});

// Progress percentage through pipeline
pipelineSchema.virtual('progress').get(function() {
  const stages = PIPELINE_STAGES_ORDER;
  const currentIndex = stages.indexOf(this.stage);
  const totalStages = stages.length - 2; // Exclude Won/Lost
  return Math.round((currentIndex / totalStages) * 100);
});

// ========== METHODS ==========

/**
 * Move lead to new stage
 * @param {string} newStage - Target stage
 * @param {string} movedBy - User ID moving the lead
 * @param {string} remarks - Movement remarks
 */
pipelineSchema.methods.moveToStage = async function(newStage, movedBy, remarks = '') {
  const oldStage = this.stage;
  
  // Calculate time in previous stage
  const timeInStage = this.currentStageDuration;
  
  // Update stage duration
  this.stageDuration.exitedAt = new Date();
  this.stageDuration.duration = timeInStage;
  
  // Add to movement history
  this.movementHistory.push({
    fromStage: oldStage,
    toStage: newStage,
    movedBy,
    movedAt: new Date(),
    timeInStage,
    remarks
  });
  
  // Update current stage
  this.previousStage = oldStage;
  this.stage = newStage;
  this.movedBy = movedBy;
  this.movedAt = new Date();
  this.remarks = remarks;
  this.stageDuration.enteredAt = new Date();
  this.stageDuration.exitedAt = null;
  
  // Update probability based on new stage
  const probabilities = {
    'New Lead': 10,
    'Contacted': 20,
    'Requirement Identified': 40,
    'Quotation Sent': 60,
    'Follow-Up': 70,
    'Negotiation': 80,
    'Won': 100,
    'Lost': 0
  };
  this.probability = probabilities[newStage] || 10;
  
  // If terminal stage, record exit
  if (['Won', 'Lost'].includes(newStage)) {
    this.stageDuration.exitedAt = new Date();
  }
  
  await this.save();
  return this;
};

/**
 * Add note to current stage
 * @param {string} content - Note content
 * @param {string} createdBy - User ID
 */
pipelineSchema.methods.addNote = async function(content, createdBy) {
  this.notes.push({
    content,
    createdBy,
    createdAt: new Date()
  });
  
  this.metrics.interactions += 1;
  this.metrics.lastInteractionAt = new Date();
  
  await this.save();
  return this;
};

/**
 * Add attachment to stage
 * @param {Object} attachment - Attachment object
 */
pipelineSchema.methods.addAttachment = async function(attachment) {
  this.attachments.push({
    ...attachment,
    uploadedAt: new Date()
  });
  
  await this.save();
  return this;
};

/**
 * Add task to stage
 * @param {Object} taskData - Task data
 */
pipelineSchema.methods.addTask = async function(taskData) {
  this.tasks.push({
    ...taskData,
    status: 'pending'
  });
  
  await this.save();
  return this;
};

/**
 * Complete checklist item
 * @param {number} itemIndex - Checklist item index
 * @param {string} completedBy - User ID
 */
pipelineSchema.methods.completeChecklistItem = async function(itemIndex, completedBy) {
  if (this.checklist[itemIndex]) {
    this.checklist[itemIndex].completed = true;
    this.checklist[itemIndex].completedAt = new Date();
    this.checklist[itemIndex].completedBy = completedBy;
    await this.save();
  }
  return this;
};

/**
 * Update stage metrics
 */
pipelineSchema.methods.updateMetrics = async function() {
  this.metrics.timeSpent = this.currentStageDuration;
  this.metrics.revisits = this.movementHistory.length;
  await this.save();
};

/**
 * Check if stage requirements are met
 */
pipelineSchema.methods.requirementsMet = function() {
  return this.checklist
    .filter(item => item.required)
    .every(item => item.completed);
};

// ========== STATICS ==========

/**
 * Get pipeline overview
 * @returns {Promise<Object>} Pipeline overview
 */
pipelineSchema.statics.getPipelineOverview = async function() {
  const stages = PIPELINE_STAGES_ORDER;
  
  const overview = await this.aggregate([
    {
      $match: { stage: { $in: stages } }
    },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalValue: { $sum: '$expectedValue' },
        avgProbability: { $avg: '$probability' },
        avgTimeInStage: { $avg: '$timeInStage' }
      }
    },
    {
      $sort: { 
        _id: 1 
      }
    }
  ]);

  // Format as object with stage names as keys
  const result = {};
  stages.forEach(stage => {
    const stageData = overview.find(o => o._id === stage) || {
      count: 0,
      totalValue: 0,
      avgProbability: 0,
      avgTimeInStage: 0
    };
    result[stage] = stageData;
  });

  return result;
};

/**
 * Get pipeline analytics
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} Analytics data
 */
pipelineSchema.statics.getPipelineAnalytics = async function(filters = {}) {
  const matchStage = {};
  if (filters.startDate || filters.endDate) {
    matchStage.movedAt = {};
    if (filters.startDate) matchStage.movedAt.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.movedAt.$lte = new Date(filters.endDate);
  }

  const analytics = await this.aggregate([
    { $match: matchStage },
    {
      $facet: {
        // Stage distribution
        stageDistribution: [
          {
            $group: {
              _id: '$stage',
              count: { $sum: 1 },
              totalValue: { $sum: '$expectedValue' },
              avgTime: { $avg: '$timeInStage' }
            }
          }
        ],
        
        // Movement flow
        movementFlow: [
          {
            $group: {
              _id: {
                from: '$previousStage',
                to: '$stage'
              },
              count: { $sum: 1 }
            }
          },
          { $match: { '_id.from': { $ne: null } } }
        ],
        
        // Conversion rates
        conversionRates: [
          {
            $group: {
              _id: '$stage',
              entered: { $sum: 1 },
              converted: {
                $sum: {
                  $cond: [
                    { $in: ['$nextStage', ['Won', 'Lost']] },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ],
        
        // Time analysis
        timeAnalysis: [
          {
            $group: {
              _id: null,
              avgTimeToWon: {
                $avg: {
                  $cond: [
                    { $eq: ['$stage', 'Won'] },
                    '$timeInStage',
                    null
                  ]
                }
              },
              avgTimeToLost: {
                $avg: {
                  $cond: [
                    { $eq: ['$stage', 'Lost'] },
                    '$timeInStage',
                    null
                  ]
                }
              }
            }
          }
        ],
        
        // Probability distribution
        probabilityDistribution: [
          {
            $bucket: {
              groupBy: '$probability',
              boundaries: [0, 20, 40, 60, 80, 100],
              default: 'Other',
              output: {
                count: { $sum: 1 },
                value: { $sum: '$expectedValue' }
              }
            }
          }
        ]
      }
    }
  ]);

  return analytics[0];
};

/**
 * Get movement history for a lead
 * @param {string} leadId - Lead ID
 * @returns {Promise<Array>} Movement history
 */
pipelineSchema.statics.getLeadHistory = async function(leadId) {
  return await this.find({ leadId })
    .populate('movedBy', 'name email')
    .sort({ movedAt: -1 });
};

/**
 * Get stalled leads (no movement in X days)
 * @param {number} days - Days threshold
 * @returns {Promise<Array>} Stalled leads
 */
pipelineSchema.statics.getStalledLeads = async function(days = 7) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  return await this.find({
    stage: { $nin: ['Won', 'Lost'] },
    movedAt: { $lt: threshold },
    'stageDuration.enteredAt': { $lt: threshold }
  })
    .populate('leadId', 'name phone email')
    .populate('movedBy', 'name')
    .sort({ movedAt: 1 });
};

/**
 * Get hot leads (high probability)
 * @param {number} minProbability - Minimum probability
 * @returns {Promise<Array>} Hot leads
 */
pipelineSchema.statics.getHotLeads = async function(minProbability = 70) {
  return await this.find({
    stage: { $nin: ['Won', 'Lost'] },
    probability: { $gte: minProbability },
    expectedValue: { $gt: 0 }
  })
    .populate('leadId', 'name phone email expectedValue')
    .populate('movedBy', 'name')
    .sort({ probability: -1, expectedValue: -1 });
};

/**
 * Get pipeline velocity
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Velocity metrics
 */
pipelineSchema.statics.getPipelineVelocity = async function(options = {}) {
  const { startDate, endDate, stage } = options;
  
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.movedAt = {};
    if (startDate) matchStage.movedAt.$gte = new Date(startDate);
    if (endDate) matchStage.movedAt.$lte = new Date(endDate);
  }
  if (stage) matchStage.stage = stage;

  const velocity = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          stage: '$stage',
          month: { $month: '$movedAt' }
        },
        count: { $sum: 1 },
        avgTime: { $avg: '$timeInStage' },
        totalValue: { $sum: '$expectedValue' }
      }
    },
    { $sort: { '_id.month': 1 } }
  ]);

  return velocity;
};

/**
 * Get conversion funnel
 * @returns {Promise<Array>} Funnel data
 */
pipelineSchema.statics.getConversionFunnel = async function() {
  const stages = PIPELINE_STAGES_ORDER;
  const funnel = [];

  for (let i = 0; i < stages.length - 1; i++) {
    const currentStage = stages[i];
    const nextStage = stages[i + 1];

    const [stageData, nextStageData] = await Promise.all([
      this.countDocuments({ stage: currentStage }),
      this.countDocuments({ stage: nextStage })
    ]);

    const conversionRate = stageData > 0 
      ? (nextStageData / stageData) * 100 
      : 0;

    funnel.push({
      stage: currentStage,
      count: stageData,
      nextStage: nextStage,
      nextCount: nextStageData,
      conversionRate: Math.round(conversionRate * 10) / 10
    });
  }

  return funnel;
};

/**
 * Bulk update stage probabilities
 * @param {Array} updates - Probability updates
 */
pipelineSchema.statics.bulkUpdateProbabilities = async function(updates) {
  const bulkOps = updates.map(({ leadId, probability }) => ({
    updateOne: {
      filter: { leadId },
      update: { probability }
    }
  }));

  return await this.bulkWrite(bulkOps);
};

/**
 * Get stage metrics
 * @param {string} stage - Stage name
 * @returns {Promise<Object>} Stage metrics
 */
pipelineSchema.statics.getStageMetrics = async function(stage) {
  const [metrics] = await this.aggregate([
    { $match: { stage } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalValue: { $sum: '$expectedValue' },
        avgValue: { $avg: '$expectedValue' },
        avgTime: { $avg: '$timeInStage' },
        maxTime: { $max: '$timeInStage' },
        minTime: { $min: '$timeInStage' }
      }
    }
  ]);

  // Get leads in this stage
  const leads = await this.find({ stage })
    .populate('leadId', 'name phone expectedValue')
    .sort({ expectedValue: -1 })
    .limit(10);

  return {
    stage,
    metrics: metrics || { count: 0, totalValue: 0, avgValue: 0 },
    topLeads: leads
  };
};

// ========== PRE-SAVE HOOKS ==========

pipelineSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Update metrics
  if (this.isModified('stage')) {
    this.metrics.revisits += 1;
  }
  
  next();
});

// ========== POST-SAVE HOOKS ==========

pipelineSchema.post('save', async function(doc) {
  // Update lead's pipeline stage
  const Lead = mongoose.model('Lead');
  await Lead.findByIdAndUpdate(doc.leadId, {
    pipelineStage: doc.stage,
    probability: doc.probability,
    updatedAt: new Date()
  });
});

// ========== INSTANCE METHODS ==========

/**
 * Get next recommended stage
 */
pipelineSchema.methods.getRecommendedNextStage = function() {
  const stages = PIPELINE_STAGES_ORDER;
  const currentIndex = stages.indexOf(this.stage);
  
  if (currentIndex === -1 || currentIndex >= stages.length - 1) {
    return null;
  }
  
  // Check if requirements are met for next stage
  const requirementsMet = this.requirementsMet();
  
  return {
    stage: stages[currentIndex + 1],
    requirementsMet,
    remainingRequirements: this.checklist
      .filter(item => item.required && !item.completed)
      .map(item => item.item)
  };
};

/**
 * Get time metrics
 */
pipelineSchema.methods.getTimeMetrics = function() {
  return {
    currentStageDuration: this.currentStageDuration,
    daysInStage: this.daysInStage,
    totalTimeInPipeline: this.movementHistory.reduce(
      (total, move) => total + (move.timeInStage || 0), 
      0
    ),
    stageEntrance: this.stageDuration.enteredAt,
    lastMovement: this.movedAt
  };
};

// Create the model
const Pipeline = mongoose.model('Pipeline', pipelineSchema);

export default Pipeline;