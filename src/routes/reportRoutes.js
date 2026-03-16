import express from "express";
import { auth } from "../middleware/auth.js";

import {
    getLeadReport,
    getSalesReport,
    getConversionReport,
    getSalesPerformance,
    executiveSalesReport
} from "../controllers/reportController.js";

const router = express.Router();


// ================= LEAD REPORT =================
router.get("/leads", auth, getLeadReport);


// ================= SALES REPORT =================
router.get("/sales", auth, getSalesReport);


// ================= CONVERSION REPORT =================
router.get("/conversion", auth, getConversionReport);


// ================= SALES PERFORMANCE =================
router.get("/sales-performance", auth, getSalesPerformance);


// ================= EXECUTIVE SALES REPORT =================
router.get("/executive-sales", auth, executiveSalesReport);


export default router;