import { Router } from "express";
import * as ctrl from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, ctrl.getDashboard);

export default router;
