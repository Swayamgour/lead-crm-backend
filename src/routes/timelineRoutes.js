// src/routes/timelineRoutes.js
import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getLeadTimeline,
  getTimelineEntryById,
  createTimelineEntry,
  updateTimelineEntry,
  deleteTimelineEntry,
  getTimelineStats,
  addAttachment,
  removeAttachment,
  getTimelineByType,
  getTimelineByDate,
  searchTimeline,
  exportTimeline
} from '../controllers/timelineController.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Validation rules
const timelineValidation = [
  body('leadId').isMongoId().withMessage('Valid lead ID is required'),
  body('type').isIn(['lead', 'call', 'whatsapp', 'email', 'note', 'meeting', 'task', 'system', 'quotation'])
    .withMessage('Invalid timeline type'),
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('description').optional().isString().trim(),
  body('duration').optional().isString(),
  body('priority').optional().isIn(['high', 'medium', 'normal', 'low']),
  body('value').optional().isNumeric()
];

// Statistics route
router.get('/stats', 
  [
    query('leadId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  getTimelineStats
);

// Search timeline
router.get('/search',
  [
    query('q').notEmpty().withMessage('Search query required'),
    query('leadId').optional().isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  validate,
  searchTimeline
);

// Get timeline by type
router.get('/type/:type',
  param('type').isIn(['lead', 'call', 'whatsapp', 'email', 'note', 'meeting', 'task', 'system', 'quotation']),
  [
    query('leadId').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  validate,
  getTimelineByType
);

// Get timeline by date range
router.get('/date-range',
  [
    query('startDate').isISO8601().withMessage('Start date required'),
    query('endDate').isISO8601().withMessage('End date required'),
    query('leadId').optional().isMongoId()
  ],
  validate,
  getTimelineByDate
);

// Export timeline
router.get('/export',
  [
    query('leadId').isMongoId(),
    query('format').optional().isIn(['csv', 'pdf', 'excel']).default('csv')
  ],
  validate,
  exportTimeline
);

// Get timeline for a specific lead
router.get('/lead/:leadId',
  param('leadId').isMongoId(),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('type').optional().isIn(['lead', 'call', 'whatsapp', 'email', 'note', 'meeting', 'task', 'system', 'quotation'])
  ],
  validate,
  getLeadTimeline
);

// Get single timeline entry
router.get('/:id',
  param('id').isMongoId(),
  validate,
  getTimelineEntryById
);

// Create timeline entry
router.post('/',
  timelineValidation,
  validate,
  createTimelineEntry
);

// Add attachment to timeline entry
router.post('/:id/attachments',
  param('id').isMongoId(),
  upload.single('file'),
  addAttachment
);

// Update timeline entry
router.put('/:id',
  param('id').isMongoId(),
  timelineValidation.map(v => v.optional()),
  validate,
  updateTimelineEntry
);

// Remove attachment
router.delete('/:id/attachments/:attachmentId',
  [
    param('id').isMongoId(),
    param('attachmentId').isMongoId()
  ],
  validate,
  removeAttachment
);

// Delete timeline entry
router.delete('/:id',
  param('id').isMongoId(),
  validate,
  deleteTimelineEntry
);

export default router;