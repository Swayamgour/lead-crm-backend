import express from "express";

import {
  getAllTimelines,
  getLeadTimeline,
  createTimeline,
  deleteTimeline,
  getTimelineGrouped
} from "../controllers/timelineController.js";

const router = express.Router();

/* GET ALL TIMELINE */

router.get("/", getAllTimelines);
router.get("/Grouped", getTimelineGrouped);

/* GET LEAD TIMELINE */

router.get("/lead/:leadId", getLeadTimeline);

/* CREATE */

router.post("/", createTimeline);

/* DELETE */

router.delete("/:id", deleteTimeline);

export default router;