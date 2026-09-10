import { Router } from "express";
import * as ctrl from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Admin/instructor-only content management.
router.use(requireAuth, requireRole("ADMIN", "INSTRUCTOR"));

router.get("/stats", ctrl.getStats);
router.post("/disciplines", ctrl.createDiscipline);
router.post("/recipes", ctrl.createRecipe);
router.post("/courses", ctrl.createCourse);
router.patch("/:type/:id/publish", ctrl.setPublished);

export default router;
