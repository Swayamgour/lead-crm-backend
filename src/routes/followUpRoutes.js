import express from "express"

import {
  createFollowUp,
  getFollowUps,
  getTodayFollowUps,
  updateFollowUp,
  deleteFollowUp,
  updateFollowUpStatus
} from "../controllers/followUpController.js"

import { auth } from "../middleware/auth.js"

const router = express.Router()

router.post("/", auth, createFollowUp)

router.get("/", auth, getFollowUps)

router.get("/today", auth, getTodayFollowUps)

router.put("/:id", auth, updateFollowUp)

router.put('/:id/status', updateFollowUpStatus);

router.delete("/:id", auth, deleteFollowUp)


export default router