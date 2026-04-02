import express from "express"

import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById
} from "../controllers/userController.js"

import { auth } from "../middleware/auth.js"
import { permit } from "../middleware/role.js"
import { upload } from "../middleware/upload.js"

const router = express.Router()

router.get("/", auth, permit("admin"), getUsers)

// router.post("/",auth,permit("admin"),createUser)
router.post(
    "/",
    auth,
    upload.single("avatar"),
    createUser
)

// router.put("/:id", auth, permit("admin"), updateUser)
router.put("/:id", auth, permit("admin"), upload.single("avatar"), updateUser);

router.get("/:id", auth, permit("admin"), getUserById)

router.delete("/:id", auth, permit("admin"), deleteUser)

export default router