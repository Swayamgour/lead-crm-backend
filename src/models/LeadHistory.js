// src/models/LeadHistory.js
import mongoose from 'mongoose';

// src/models/LeadHistory.js (update the enum)
const leadHistorySchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        index: true
    },
    action: {
        type: String,
        enum: ['created', 'updated', 'assigned', 'status_changed', 'followup_updated', 'remarks_updated', 'remark_added', 'remark_edited', 'remark_deleted'],
        required: true
    },
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    changedByName: String,
    changes: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    ipAddress: String,
    userAgent: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// ... rest remains the same

// Compound index for efficient querying
leadHistorySchema.index({ leadId: 1, createdAt: -1 });
leadHistorySchema.index({ changedBy: 1, createdAt: -1 });

const LeadHistory = mongoose.model('LeadHistory', leadHistorySchema);
export default LeadHistory;