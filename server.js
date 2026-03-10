// server.js

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./src/routes/authRoutes.js";
import leadRoutes from "./src/routes/leadRoutes.js";
import executiveRoutes from "./src/routes/executiveRoutes.js";
import followUpRoutes from "./src/routes/followUpRoutes.js";
import timelineRoutes from "./src/routes/timelineRoutes.js";
import pipelineRoutes from "./src/routes/pipelineRoutes.js";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";

import { errorHandler } from "./src/middleware/errorHandler.js";
import { connectDB } from "./src/config/db.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);


// SOCKET.IO
const io = new Server(httpServer, {
    cors: {
        origin: "*", // production me apna frontend URL lagana
        methods: ["GET", "POST"],
    },
});


// ================= MIDDLEWARE =================

app.use(helmet());

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));


// ================= DATABASE =================

connectDB();


// ================= ROUTES =================

app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/executives", executiveRoutes);
app.use("/api/followups", followUpRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/dashboard", dashboardRoutes);


// ================= ROOT =================

app.get("/", (req, res) => {
    res.send("CRM Backend API Running 🚀");
});


// ================= SOCKET =================

io.on("connection", (socket) => {
    console.log("Client Connected");

    socket.on("join-lead-room", (leadId) => {
        socket.join(`lead-${leadId}`);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

app.set("io", io);


// ================= ERROR HANDLER =================

app.use(errorHandler);


// ================= SERVER =================

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});