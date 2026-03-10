// src/routes/leadRoutes.js
import express from 'express';
import { body } from 'express-validator';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadsStats,
  getLeadsByExecutive
} from '../controllers/leadController.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(auth);

router.get('/', getLeads);
router.get('/stats', getLeadsStats);
// router.get('/:id', getLeadsByExecutive);
router.get('/executive/:executiveId', getLeadsByExecutive);
router.get('/:id', getLeadById);

router.post('/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number required'),
    body('email').optional().isEmail(),
    body('source').notEmpty(),
    body('assignedTo').notEmpty()
  ],
  validate,
  createLead
);

router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;