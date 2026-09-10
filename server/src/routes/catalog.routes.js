import { Router } from "express";
import * as ctrl from "../controllers/catalog.controller.js";
import { validate } from "../middleware/validate.js";
import { catalogQuerySchema } from "../validation/schemas.js";

const router = Router();

// Public discovery — browse and search before purchase.
router.get("/disciplines", ctrl.listDisciplines);
router.get("/course-categories", ctrl.listCourseCategories);
router.get("/courses", validate(catalogQuerySchema, "query"), ctrl.listCourses);
router.get("/courses/:slug", ctrl.getCourse);
router.get("/recipes", validate(catalogQuerySchema, "query"), ctrl.listRecipes);
router.get("/booklets", ctrl.listBooklets);

export default router;
