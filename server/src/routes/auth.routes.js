import { Router } from "express";
import * as ctrl from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { registerSchema, loginSchema } from "../validation/schemas.js";

const router = Router();

router.post("/register", validate(registerSchema), ctrl.register);
router.post("/login", validate(loginSchema), ctrl.login);
router.get("/me", requireAuth, ctrl.me);

export default router;
