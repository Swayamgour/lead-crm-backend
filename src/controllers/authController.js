// src/controllers/authController.js
import User from '../models/User.js';
import Executive from '../models/Executive.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';




export const adminRegister = async (req, res) => {

    try {

        const { name, email, password, phone } = req.body;

        const existing = await User.findOne({ email, phone });

        if (existing) {
            return res.status(400).json({
                message: "Admin already exists"
            });
        }

        // const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await User.create({
            name,
            email,
            password,
            role: "admin",
            phone
        });

        res.status(201).json({
            message: "Admin created successfully",
            admin
        });

    } catch (error) {

        res.status(500).json({
            message: "Server error",
            error
        });

    }

};

export const login = async (req, res) => {
    try {

        const { email, password } = req.body;

        // 1️⃣ Check Admin/User
        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {

            const isMatch = await user.comparePassword(password);

            if (!isMatch) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.json({
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        }

        // 2️⃣ Check Executive
        const executive = await Executive.findOne({ email });

        if (executive) {

            const isMatch = await bcrypt.compare(password, executive.password);

            if (!isMatch) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            const token = jwt.sign(
                { id: executive._id, role: "executive" },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            executive.lastActive = new Date();
            await executive.save();

            return res.json({
                token,
                user: {
                    id: executive._id,
                    name: executive.name,
                    email: executive.email,
                    role: "executive",
                    avatar: executive.avatar
                }
            });
        }

        return res.status(401).json({
            error: "Invalid credentials"
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
};

export const executiveLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const executive = await Executive.findOne({ email });
        if (!executive) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, executive.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: executive._id, role: 'executive' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Update last active
        executive.lastActive = new Date();
        await executive.save();

        res.json({
            token,
            user: {
                id: executive._id,
                name: executive.name,
                email: executive.email,
                role: 'executive',
                avatar: executive.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getProfile = async (req, res) => {
    try {
        if (req.user.role === 'executive') {
            const executive = await Executive.findById(req.user.id).select('-password');
            return res.json(executive);
        } else {
            const user = await User.findById(req.user.id).select('-password');
            return res.json(user);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};