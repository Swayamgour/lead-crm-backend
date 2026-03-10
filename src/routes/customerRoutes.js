import express from "express"

import {
 createCustomer,
 getCustomers,
 getCustomerById,
 updateCustomer,
 deleteCustomer
} from "../controllers/customerController.js"

import {auth} from "../middleware/auth.js"

const router = express.Router()

router.post("/",auth,createCustomer)

router.get("/",auth,getCustomers)

router.get("/:id",auth,getCustomerById)

router.put("/:id",auth,updateCustomer)

router.delete("/:id",auth,deleteCustomer)

export default router