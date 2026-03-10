// src/routes/followUpRoutes.js
import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getFollowUps,
  getFollowUpById,
  getTodaysFollowUps,
  getUpcomingFollowUps,
  getOverdueFollowUps,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  deleteFollowUp,
  getFollowUpStats,
  getFollowUpsByExecutive,
  getFollowUpsByLead,
  rescheduleFollowUp,
  bulkCreateFollowUps
} from '../controllers/followUpController.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
// import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Validation rules
const followUpValidation = [
  body('leadId').isMongoId().withMessage('Valid lead ID is required'),
  body('assignedTo').isMongoId().withMessage('Valid executive ID is required'),
  body('followUpDate').isISO8601().withMessage('Valid date is required'),
  body('type').isIn(['call', 'meeting', 'whatsapp', 'email', 'visit']).withMessage('Invalid follow-up type'),
  body('purpose').optional().isString().trim(),
  body('priority').optional().isIn(['high', 'medium', 'low']),
  body('reminder').optional().isBoolean()
];

const dateValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
];

// Statistics route - must come before /:id routes
router.get('/stats', getFollowUpStats);

// Today's follow-ups
router.get('/today', getTodaysFollowUps);

// Upcoming follow-ups
router.get('/upcoming', getUpcomingFollowUps);

// Overdue follow-ups
router.get('/overdue', getOverdueFollowUps);

// Get follow-ups by executive
router.get('/executive/:executiveId',
  param('executiveId').isMongoId(),
  validate,
  getFollowUpsByExecutive
);

// Get follow-ups by lead
router.get('/lead/:leadId',
  param('leadId').isMongoId(),
  validate,
  getFollowUpsByLead
);

// Main routes with pagination and filtering
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['pending', 'completed', 'overdue', 'cancelled']),
    query('type').optional().isIn(['call', 'meeting', 'whatsapp', 'email', 'visit']),
    query('assignedTo').optional().isMongoId(),
    query('leadId').optional().isMongoId(),
    ...dateValidation
  ],
  validate,
  getFollowUps
);

// Get single follow-up
router.get('/:id',
  param('id').isMongoId(),
  validate,
  getFollowUpById
);

// Create follow-up
router.post('/',
//   rateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }),
  followUpValidation,
  validate,
  createFollowUp
);

// Bulk create follow-ups
router.post('/bulk',
//   rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  body('followUps').isArray().withMessage('Follow-ups must be an array'),
  body('followUps.*.leadId').isMongoId(),
  body('followUps.*.followUpDate').isISO8601(),
  body('followUps.*.type').isIn(['call', 'meeting', 'whatsapp', 'email', 'visit']),
  validate,
  bulkCreateFollowUps
);

// Update follow-up
router.put('/:id',
  param('id').isMongoId(),
  followUpValidation.map(v => v.optional()),
  validate,
  updateFollowUp
);

// Complete follow-up
router.patch('/:id/complete',
  param('id').isMongoId(),
  [
    body('outcome').optional().isString(),
    body('notes').optional().isString(),
    body('nextFollowUp').optional().isISO8601()
  ],
  validate,
  completeFollowUp
);

// Reschedule follow-up
router.patch('/:id/reschedule',
  param('id').isMongoId(),
  [
    body('followUpDate').isISO8601(),
    body('followUpTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('reason').optional().isString()
  ],
  validate,
  rescheduleFollowUp
);

// Delete follow-up
router.delete('/:id',
  param('id').isMongoId(),
  validate,
  deleteFollowUp
);

export default router;