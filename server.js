// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './src/routes/authRoutes.js';
import leadRoutes from './src/routes/leadRoutes.js';
import executiveRoutes from './src/routes/executiveRoutes.js';
import followUpRoutes from './src/routes/followUpRoutes.js';
import timelineRoutes from './src/routes/timelineRoutes.js';
import pipelineRoutes from './src/routes/pipelineRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';

import { errorHandler } from './src/middleware/errorHandler.js';
import { connectDB } from './src/config/db.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
    }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/executives', executiveRoutes);
app.use('/api/followups', followUpRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Socket.io
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('join-lead-room', (leadId) => {
        socket.join(`lead-${leadId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Make io accessible to controllers
app.set('io', io);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;


app.get("/", (req, res) => {
    res.send("CRM Backend API Running 🚀");
});

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});