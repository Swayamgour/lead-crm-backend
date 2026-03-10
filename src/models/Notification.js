// src/models/Notification.js
import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../config/constants.js';

const notificationSchema = new mongoose.Schema({
  // Recipient
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Executive',
    required: true,
    index: true
  },
  
  // Notification Type
  type: {
    type: String,
    enum: [
      'lead-assigned',
      'lead-updated',
      'follow-up',
      'reminder',
      'system',
      'task',
      'mention',
      'comment',
      'achievement',
      'warning',
      'info',
      'success',
      'deadline',
      'meeting',
      'approval',
      'rejection',
      'payment',
      'quotation',
      'team-update',
      'performance'
    ],
    required: true
  },
  
  // Content
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    trim: true
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Category
  category: {
    type: String,
    enum: ['lead', 'executive', 'followup', 'task', 'system', 'achievement', 'reminder'],
    default: 'system'
  },
  
  // Related Entity
  relatedTo: {
    model: {
      type: String,
      enum: ['Lead', 'Executive', 'FollowUp', 'Task', 'Timeline', 'Pipeline']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.model'
    }
  },
  
  // Action URL/Link
  actionUrl: {
    type: String,
    trim: true
  },
  
  actionText: {
    type: String,
    default: 'View'
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // For grouped notifications
  groupId: {
    type: String,
    index: true
  },
  
  // Status flags
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  isPinned: {
    type: Boolean,
    default: false
  },
  
  isStarred: {
    type: Boolean,
    default: false
  },
  
  // Delivery status
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'sent'
  },
  
  // Read tracking
  readAt: {
    type: Date
  },
  
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Executive'
  },
  
  // Expiry
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days from now
  },
  
  // For recurring notifications
  recurring: {
    isRecurring: { type: Boolean, default: false },
    pattern: { type: String }, // daily, weekly, monthly
    nextTrigger: { type: Date }
  },
  
  // Attachments
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  
  // Icon/Emoji
  icon: {
    type: String,
    default: '🔔'
  },
  
  // Color theme
  color: {
    type: String,
    enum: ['blue', 'green', 'red', 'yellow', 'purple', 'orange', 'gray'],
    default: 'blue'
  },
  
  // Source
  source: {
    type: {
      type: String,
      enum: ['system', 'user', 'automation', 'integration']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Executive'
    }
  },
  
  // Timeline
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  deliveredAt: Date,
  
  // Push notification specific
  push: {
    sent: { type: Boolean, default: false },
    sentAt: Date,
    deviceTokens: [String]
  },
  
  // Email notification specific
  email: {
    sent: { type: Boolean, default: false },
    sentAt: Date,
    emailId: String
  },
  
  // SMS notification specific
  sms: {
    sent: { type: Boolean, default: false },
    sentAt: Date,
    messageId: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== INDEXES ==========

// Compound indexes for common queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Text search index
notificationSchema.index({
  title: 'text',
  message: 'text',
  description: 'text'
});

// ========== VIRTUALS ==========

// Time ago virtual
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return this.createdAt.toLocaleDateString();
});

// Is expired virtual
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Is urgent virtual
notificationSchema.virtual('isUrgent').get(function() {
  return this.priority === 'urgent' || this.priority === 'high';
});

// ========== METHODS ==========

/**
 * Mark notification as read
 * @param {string} userId - User marking as read
 */
notificationSchema.methods.markAsRead = async function(userId) {
  this.isRead = true;
  this.readAt = new Date();
  this.readBy = userId;
  await this.save();
};

/**
 * Mark notification as unread
 */
notificationSchema.methods.markAsUnread = async function() {
  this.isRead = false;
  this.readAt = null;
  this.readBy = null;
  await this.save();
};

/**
 * Archive notification
 */
notificationSchema.methods.archive = async function() {
  this.isArchived = true;
  await this.save();
};

/**
 * Pin notification
 */
notificationSchema.methods.pin = async function() {
  this.isPinned = true;
  await this.save();
};

/**
 * Unpin notification
 */
notificationSchema.methods.unpin = async function() {
  this.isPinned = false;
  await this.save();
};

/**
 * Star notification
 */
notificationSchema.methods.star = async function() {
  this.isStarred = true;
  await this.save();
};

/**
 * Unstar notification
 */
notificationSchema.methods.unstar = async function() {
  this.isStarred = false;
  await this.save();
};

/**
 * Soft delete
 */
notificationSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  await this.save();
};

/**
 * Restore from soft delete
 */
notificationSchema.methods.restore = async function() {
  this.isDeleted = false;
  await this.save();
};

/**
 * Add attachment
 * @param {Object} attachment - Attachment object
 */
notificationSchema.methods.addAttachment = async function(attachment) {
  this.attachments.push(attachment);
  await this.save();
};

/**
 * Remove attachment
 * @param {string} attachmentId - Attachment ID or name
 */
notificationSchema.methods.removeAttachment = async function(attachmentId) {
  this.attachments = this.attachments.filter(a => 
    a.name !== attachmentId && a.url !== attachmentId
  );
  await this.save();
};

// ========== STATICS ==========

/**
 * Get unread count for user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    userId,
    isRead: false,
    isDeleted: false,
    expiresAt: { $gt: new Date() }
  });
};

/**
 * Get notifications for user with pagination
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Notifications
 */
notificationSchema.statics.getForUser = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    priority,
    isRead,
    category,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const query = {
    userId,
    isDeleted: false,
    expiresAt: { $gt: new Date() }
  };

  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (isRead !== undefined) query.isRead = isRead;
  if (category) query.category = category;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const notifications = await this.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('relatedTo.id')
    .populate('source.createdBy', 'name email avatar');

  const total = await this.countDocuments(query);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount: await this.getUnreadCount(userId)
    }
  };
};

/**
 * Mark multiple notifications as read
 * @param {Array} notificationIds - Array of notification IDs
 * @param {string} userId - User marking as read
 */
notificationSchema.statics.markManyAsRead = async function(notificationIds, userId) {
  return await this.updateMany(
    { _id: { $in: notificationIds } },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
        readBy: userId
      }
    }
  );
};

/**
 * Delete old notifications
 * @param {number} days - Days to keep
 */
notificationSchema.statics.deleteOld = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
};

/**
 * Create system notification
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} options - Additional options
 */
notificationSchema.statics.createSystem = async function(userId, title, message, options = {}) {
  return await this.create({
    userId,
    type: 'system',
    title,
    message,
    category: 'system',
    priority: options.priority || 'medium',
    icon: options.icon || '🔔',
    color: options.color || 'blue',
    relatedTo: options.relatedTo,
    actionUrl: options.actionUrl,
    metadata: options.metadata,
    source: {
      type: 'system'
    }
  });
};

/**
 * Create lead assignment notification
 * @param {string} userId - User ID
 * @param {Object} lead - Lead object
 * @param {string} assignedBy - User who assigned
 */
notificationSchema.statics.createLeadAssignment = async function(userId, lead, assignedBy) {
  return await this.create({
    userId,
    type: 'lead-assigned',
    title: 'New Lead Assigned',
    message: `Lead ${lead.name} has been assigned to you`,
    category: 'lead',
    priority: 'high',
    icon: '👤',
    color: 'blue',
    relatedTo: {
      model: 'Lead',
      id: lead._id
    },
    actionUrl: `/leads/${lead._id}`,
    actionText: 'View Lead',
    metadata: {
      leadName: lead.name,
      leadPhone: lead.phone,
      assignedByName: assignedBy?.name || 'System'
    },
    source: {
      type: 'system'
    }
  });
};

/**
 * Create follow-up reminder notification
 * @param {string} userId - User ID
 * @param {Object} followUp - Follow-up object
 * @param {Object} lead - Lead object
 */
notificationSchema.statics.createFollowUpReminder = async function(userId, followUp, lead) {
  const followUpDate = new Date(followUp.followUpDate);
  const timeStr = followUp.followUpTime || '09:00';
  const [hours, minutes] = timeStr.split(':');
  followUpDate.setHours(parseInt(hours), parseInt(minutes), 0);

  return await this.create({
    userId,
    type: 'follow-up',
    title: 'Follow-up Reminder',
    message: `Follow-up with ${lead.name} scheduled for ${followUpDate.toLocaleString()}`,
    category: 'followup',
    priority: 'high',
    icon: '⏰',
    color: 'yellow',
    relatedTo: {
      model: 'FollowUp',
      id: followUp._id
    },
    actionUrl: `/followups/${followUp._id}`,
    actionText: 'View Follow-up',
    metadata: {
      leadName: lead.name,
      leadPhone: lead.phone,
      followUpType: followUp.type,
      followUpDate: followUp.followUpDate,
      followUpTime: followUp.followUpTime
    },
    expiresAt: followUpDate,
    recurring: {
      isRecurring: true,
      pattern: 'reminder',
      nextTrigger: followUpDate
    },
    source: {
      type: 'automation'
    }
  });
};

/**
 * Create achievement notification
 * @param {string} userId - User ID
 * @param {string} achievement - Achievement type
 * @param {Object} data - Achievement data
 */
notificationSchema.statics.createAchievement = async function(userId, achievement, data) {
  const achievements = {
    target_achieved: {
      title: '🎉 Target Achieved!',
      message: `Congratulations! You've achieved your monthly target of ₹${data.target}`,
      icon: '🏆',
      color: 'green'
    },
    lead_won: {
      title: '🎯 Lead Won!',
      message: `Great job! You've won a lead worth ₹${data.value}`,
      icon: '💰',
      color: 'green'
    },
    milestone: {
      title: '⭐ Milestone Reached!',
      message: `You've reached ${data.count} leads! Keep up the good work!`,
      icon: '⭐',
      color: 'purple'
    },
    perfect_week: {
      title: '🌟 Perfect Week!',
      message: 'You completed all your follow-ups this week!',
      icon: '✨',
      color: 'blue'
    }
  };

  const achievementData = achievements[achievement] || {
    title: 'Achievement Unlocked!',
    message: 'Congratulations on your achievement!',
    icon: '🏅',
    color: 'gold'
  };

  return await this.create({
    userId,
    type: 'achievement',
    title: achievementData.title,
    message: achievementData.message,
    category: 'achievement',
    priority: 'medium',
    icon: achievementData.icon,
    color: achievementData.color,
    metadata: data,
    isPinned: true,
    source: {
      type: 'system'
    }
  });
};

/**
 * Create task reminder
 * @param {string} userId - User ID
 * @param {Object} task - Task object
 */
notificationSchema.statics.createTaskReminder = async function(userId, task) {
  return await this.create({
    userId,
    type: 'task',
    title: 'Task Reminder',
    message: task.description || 'You have a pending task',
    category: 'task',
    priority: task.priority || 'medium',
    icon: '✅',
    color: 'blue',
    relatedTo: {
      model: 'Task',
      id: task._id
    },
    actionUrl: task.actionUrl,
    metadata: {
      taskName: task.name,
      dueDate: task.dueDate
    },
    source: {
      type: 'system'
    }
  });
};

/**
 * Create mention notification
 * @param {string} userId - User ID
 * @param {Object} mention - Mention data
 */
notificationSchema.statics.createMention = async function(userId, mention) {
  return await this.create({
    userId,
    type: 'mention',
    title: 'You were mentioned',
    message: `${mention.mentionedBy} mentioned you in a comment`,
    category: 'lead',
    priority: 'medium',
    icon: '@',
    color: 'purple',
    relatedTo: {
      model: mention.model,
      id: mention.documentId
    },
    actionUrl: mention.url,
    metadata: {
      mentionedBy: mention.mentionedBy,
      comment: mention.comment
    },
    source: {
      type: 'user',
      createdBy: mention.createdBy
    }
  });
};

/**
 * Get notification summary for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Summary
 */
notificationSchema.statics.getSummary = async function(userId) {
  const [
    total,
    unread,
    urgent,
    byType,
    todayCount
  ] = await Promise.all([
    this.countDocuments({ userId, isDeleted: false }),
    this.countDocuments({ userId, isRead: false, isDeleted: false }),
    this.countDocuments({ 
      userId, 
      priority: { $in: ['high', 'urgent'] },
      isRead: false,
      isDeleted: false
    }),
    this.aggregate([
      { $match: { userId, isDeleted: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    this.countDocuments({
      userId,
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      isDeleted: false
    })
  ]);

  return {
    total,
    unread,
    urgent,
    today: todayCount,
    byType: byType.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {})
  };
};

// ========== PRE-SAVE HOOK ==========

notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set color based on type/priority if not set
  if (!this.color) {
    const colorMap = {
      'lead-assigned': 'blue',
      'follow-up': 'yellow',
      'reminder': 'orange',
      'achievement': 'green',
      'warning': 'red',
      'system': 'gray'
    };
    this.color = colorMap[this.type] || 'blue';
  }

  // Set icon based on type if not set
  if (this.icon === '🔔') {
    const iconMap = {
      'lead-assigned': '👤',
      'lead-updated': '📝',
      'follow-up': '⏰',
      'reminder': '🔔',
      'achievement': '🏆',
      'warning': '⚠️',
      'meeting': '🤝',
      'payment': '💰',
      'quotation': '📄'
    };
    this.icon = iconMap[this.type] || '🔔';
  }

  next();
});

// Create the model
const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;