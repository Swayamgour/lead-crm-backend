import express from "express"

import {
 createLead,
 getLeads,
 getLeadById,
 updateLead,
 deleteLead,
 changeLeadStatus
} from "../controllers/leadController.js"

import {auth} from "../middleware/auth.js"

const router = express.Router()

router.post("/",auth,createLead)

router.get("/",auth,getLeads)

router.get("/:id",auth,getLeadById)

router.put("/:id",auth,updateLead)

router.delete("/:id",auth,deleteLead)

router.put("/:id/status",auth,changeLeadStatus)

export default router