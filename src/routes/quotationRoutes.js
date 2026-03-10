import express from "express"

import {
 createQuotation,
 getQuotations,
 getQuotationById,
 updateQuotation,
 deleteQuotation
} from "../controllers/quotationController.js"

import {auth} from "../middleware/auth.js"

const router = express.Router()

router.post("/",auth,createQuotation)

router.get("/",auth,getQuotations)

router.get("/:id",auth,getQuotationById)

router.put("/:id",auth,updateQuotation)

router.delete("/:id",auth,deleteQuotation)

export default router