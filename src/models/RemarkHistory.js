// src/models/RemarkHistory.js
import mongoose from 'mongoose';

const remarkHistorySchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        index: true
    },
    remarkId: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the remark in Lead model
        required: true
    },
    action: {
        type: String,
        enum: ['created', 'updated', 'deleted'],
        required: true
    },
    oldText: String,
    newText: String,
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    changedByName: String,
    ipAddress: String,
    userAgent: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
remarkHistorySchema.index({ leadId: 1, createdAt: -1 });
remarkHistorySchema.index({ remarkId: 1, createdAt: -1 });

const RemarkHistory = mongoose.model('RemarkHistory', remarkHistorySchema);
export default RemarkHistory;