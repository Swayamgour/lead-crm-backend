// src/routes/authRoutes.js

import express from 'express';
import { body } from 'express-validator';

import {
    login,
    executiveLogin,
    adminRegister,
    getProfile
} from '../controllers/authController.js';

import { auth } from '../middleware/auth.js';

const router = express.Router();


// ADMIN REGISTER
router.post('/admin-register',
    [
        body('name').notEmpty().withMessage("Name required"),
        body('email').isEmail().withMessage("Valid email required"),
        body('password').isLength({ min: 6 }).withMessage("Password min 6 char")
    ],
    adminRegister);


// ADMIN LOGIN
router.post('/login',
    [
        body('email').isEmail(),
        body('password').notEmpty()
    ],
    login);


// EXECUTIVE LOGIN
router.post('/executive-login',
    [
        body('email').isEmail(),
        body('password').notEmpty()
    ],
    executiveLogin);


// GET PROFILE
router.get('/profile', auth, getProfile);

export default router;