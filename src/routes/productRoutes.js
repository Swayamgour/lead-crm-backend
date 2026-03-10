import express from "express"

import {
 createProduct,
 getProducts,
 updateProduct,
 deleteProduct
} from "../controllers/productController.js"

import {auth} from "../middleware/auth.js"

const router = express.Router()

router.post("/",auth,createProduct)

router.get("/",auth,getProducts)

router.put("/:id",auth,updateProduct)

router.delete("/:id",auth,deleteProduct)

export default router