import express from "express"
// import { getLeadReport, getSalesReport } from "../controllers/reportController.js"
import { auth } from "../middleware/auth.js"
import { getLeadReport  , getSalesReport } from "../controllers/reportController.js"

const router = express.Router()

router.get("/leads", auth , getLeadReport)
router.get("/sales", auth , getSalesReport)
 
export default router