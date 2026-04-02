import express from "express";
import  {receiveLead}  from "../controllers/indiamartController.js";
// import { receiveLead } from "../controllers/indiamartController.js";

const router = express.Router();

router.post("/webhook", receiveLead );

export default router;