import express from "express"

import {
    createLead,
    getLeads,
    getLeadById,
    updateLead,
    deleteLead,
    changeLeadStatus,
    uploadLeadsExcel,
    // fetchIndiaMartLeads
} from "../controllers/leadController.js"

import { upload } from "../middleware/upload.js";

// import {  } from "../controllers/leadController.js";



import { auth } from "../middleware/auth.js"

const router = express.Router()

router.post("/", auth, createLead)

// router.get("/indiamart-sync", fetchIndiaMartLeads)



router.post("/upload-excel", auth, upload.single("file"), uploadLeadsExcel);

router.get("/", auth, getLeads)

router.get("/:id", auth, getLeadById)

router.put("/:id", auth, updateLead)

router.delete("/:id", auth, deleteLead)

router.put("/:id/status", auth, changeLeadStatus)

export default router