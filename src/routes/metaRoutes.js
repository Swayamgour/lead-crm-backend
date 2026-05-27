import express from "express";
import {
    verifyWebhook,
    receiveMetaLead
} from "../controllers/metaController.js";

const router = express.Router();

// Meta verification
router.get("/webhook", verifyWebhook);

// Meta lead receive
router.post("/webhook", receiveMetaLead);

export default router;