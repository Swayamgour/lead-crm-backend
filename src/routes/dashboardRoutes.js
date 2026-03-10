// src/routes/dashboardRoutes.js
import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getDashboardStats,
  getManagerDashboard,
  getExecutiveDashboard,
//   getNotifications,
//   markNotificationRead,
//   markAllNotificationsRead,
//   getPerformanceMetrics,
  getActivityFeed,
  getChartData,
  getKpiData,
  getRecentLeads,
  getUpcomingActivities,
  getTeamPerformance,
  getRevenueChart,
  getLeadDistribution,
  getConversionFunnel,
  getDailyStats,
  exportDashboardData,
  getCustomReport
} from '../controllers/dashboardController.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Main dashboard stats - different views based on role
router.get('/stats',
  [
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']).default('month'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  getDashboardStats
);

// Manager dashboard
router.get('/manager',
  [
    query('teamId').optional().isMongoId(),
    query('period').optional().isIn(['today', 'week', 'month']).default('month')
  ],
  validate,
  getManagerDashboard
);

// Executive dashboard
router.get('/executive', getExecutiveDashboard);

// KPI data
router.get('/kpis',
  [
    query('type').isIn(['sales', 'leads', 'conversion', 'revenue']).withMessage('Valid KPI type required'),
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']).default('month')
  ],
  validate,
  getKpiData
);

// Chart data endpoints
router.get('/charts/revenue',
  [
    query('period').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  getRevenueChart
);

router.get('/charts/lead-distribution',
  [
    query('groupBy').optional().isIn(['status', 'source', 'pipelineStage']).default('status')
  ],
  validate,
  getLeadDistribution
);

router.get('/charts/conversion-funnel', getConversionFunnel);

router.get('/charts/:chartType',
  param('chartType').isIn(['leads', 'revenue', 'conversion', 'activities', 'performance']),
  [
    query('period').optional().isIn(['daily', 'weekly', 'monthly']).default('monthly')
  ],
  validate,
  getChartData
);

// Activity feed
router.get('/activities',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().default(20),
    query('type').optional().isIn(['all', 'lead', 'followup', 'timeline']).default('all')
  ],
  validate,
  getActivityFeed
);

// Recent leads
router.get('/recent-leads',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt().default(10)
  ],
  validate,
  getRecentLeads
);

// Upcoming activities
router.get('/upcoming',
  [
    query('days').optional().isInt({ min: 1, max: 30 }).toInt().default(7)
  ],
  validate,
  getUpcomingActivities
);

// Team performance
router.get('/team-performance',
  [
    query('period').optional().isIn(['week', 'month', 'quarter']).default('month')
  ],
  validate,
  getTeamPerformance
);

// Daily stats
router.get('/daily',
  [
    query('date').optional().isISO8601().withMessage('Valid date required')
  ],
  validate,
  getDailyStats
);

// Custom report
router.post('/reports/custom',
  [
    body('metrics').isArray().withMessage('Metrics array required'),
    body('dimensions').optional().isArray(),
    body('filters').optional().isObject(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601()
  ],
  validate,
  getCustomReport
);

// Export dashboard data
router.get('/export',
  [
    query('format').optional().isIn(['pdf', 'excel', 'csv']).default('pdf'),
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']).default('month')
  ],
  validate,
  exportDashboardData
);

// ========== NOTIFICATION ROUTES ==========

// Get notifications
// router.get('/notifications',
//   [
//     query('limit').optional().isInt({ min: 1, max: 100 }).toInt().default(20),
//     query('unreadOnly').optional().isBoolean().default(false)
//   ],
//   validate,
//   getNotifications
// );

// // Mark notification as read
// router.patch('/notifications/:id/read',
//   param('id').isMongoId(),
//   validate,
//   markNotificationRead
// );

// // Mark all notifications as read
// router.patch('/notifications/read-all', markAllNotificationsRead);

// // ========== PERFORMANCE ROUTES ==========

// // Performance metrics
// router.get('/performance',
//   [
//     query('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
//     query('metric').optional().isIn(['leads', 'revenue', 'conversion', 'activities']).default('leads')
//   ],
//   validate,
//   getPerformanceMetrics
// );

export default router;