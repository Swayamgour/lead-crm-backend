import express from "express"

import {
    createLead,
    getLeads,
    getLeadById,
    updateLead,
    deleteLead,
    changeLeadStatus,
    uploadLeadsExcel,
    addRemark,
    editRemark,
    deleteRemark,
    getLeadRemarks,
    getLeadsPaginated,
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

router.get("/paginated", auth, getLeadsPaginated)

router.get("/:id", auth, getLeadById)

router.put("/:id", auth, updateLead)

router.delete("/:id", auth, deleteLead)

router.put("/:id/status", auth, changeLeadStatus)

// In your routes file (e.g., leadRoutes.js)

// Remark management routes
router.post('/:id/remarks', auth, addRemark);
router.put('/:id/remarks/:remarkId', auth, editRemark);
router.delete('/:id/remarks/:remarkId', auth, deleteRemark);
router.get('/:id/remarks', auth, getLeadRemarks);

export default router