// src/routes/pipelineRoutes.js
import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getPipeline,
  getPipelineStage,
  moveLead,
  getPipelineAnalytics,
  getLeadPipelineHistory,
  getPipelineForecast,
  getStageMetrics,
  bulkMoveLeads,
  getPipelineSettings,
  updatePipelineSettings,
  getConversionRates,
  getVelocityMetrics
} from '../controllers/pipelineController.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Validation constants
const pipelineStages = [
  'New Lead',
  'Contacted',
  'Requirement Identified',
  'Quotation Sent',
  'Follow-Up',
  'Negotiation',
  'Won',
  'Lost'
];

// Analytics routes - must come before /:id routes
router.get('/analytics',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  getPipelineAnalytics
);

// Forecast
router.get('/forecast', getPipelineForecast);

// Conversion rates
router.get('/conversion-rates',
  [
    query('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly']).default('monthly')
  ],
  validate,
  getConversionRates
);

// Velocity metrics
router.get('/velocity',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  getVelocityMetrics
);

// Pipeline settings
router.get('/settings', getPipelineSettings);
router.put('/settings', updatePipelineSettings);

// Get pipeline with optional filters
router.get('/',
  [
    query('stage').optional().isIn(pipelineStages),
    query('assignedTo').optional().isMongoId(),
    query('priority').optional().isIn(['High', 'Medium', 'Low']),
    query('search').optional().isString()
  ],
  validate,
  getPipeline
);

// Get specific stage
router.get('/stage/:stage',
  param('stage').isIn(pipelineStages),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isIn(['expectedValue', 'createdAt', 'updatedAt'])
  ],
  validate,
  getPipelineStage
);

// Get stage metrics
router.get('/stage/:stage/metrics',
  param('stage').isIn(pipelineStages),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  getStageMetrics
);

// Get pipeline history for a lead
router.get('/lead/:leadId/history',
  param('leadId').isMongoId(),
  validate,
  getLeadPipelineHistory
);

// Move lead between stages
router.post('/move',
  [
    body('leadId').isMongoId().withMessage('Valid lead ID required'),
    body('toStage').isIn(pipelineStages).withMessage('Valid destination stage required'),
    body('fromStage').optional().isIn(pipelineStages),
    body('remarks').optional().isString().trim()
  ],
  validate,
  moveLead
);

// Bulk move leads
router.post('/bulk-move',
  [
    body('leadIds').isArray().withMessage('Lead IDs must be an array'),
    body('leadIds.*').isMongoId(),
    body('toStage').isIn(pipelineStages),
    body('remarks').optional().isString()
  ],
  validate,
  bulkMoveLeads
);

export default router;