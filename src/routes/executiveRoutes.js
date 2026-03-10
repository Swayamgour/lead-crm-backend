// src/routes/executiveRoutes.js
import express from 'express';
import {
  getExecutives,
  getExecutiveById,
  createExecutive,
  updateExecutive,
  deleteExecutive,
  getExecutivePerformance
} from '../controllers/executiveController.js';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(auth);

router.get('/', getExecutives);
router.get('/:id', getExecutiveById);
router.get('/:id/performance', getExecutivePerformance);

// router.post('/', upload.single('avatar'), createExecutive);
router.post(
  "/",
  upload.single("avatar"),
  createExecutive
);
router.put('/:id', upload.single('avatar'), updateExecutive);
router.delete('/:id', deleteExecutive);

export default router;