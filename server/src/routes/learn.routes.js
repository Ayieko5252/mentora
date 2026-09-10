import { Router } from "express";
import * as ctrl from "../controllers/learn.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { submitAssessmentSchema, markNotesSchema } from "../validation/schemas.js";

const router = Router();

// All learning routes require an authenticated, owning learner.
router.use(requireAuth);

router.get("/courses/:slug/content", ctrl.getCourseContent);
router.post("/courses/notes", validate(markNotesSchema), ctrl.markNotesRead);

// Downloadable study notes (owner-gated)
router.get("/courses/:slug/notes.md", ctrl.downloadNotesMarkdown);
router.get("/courses/:slug/notes.pdf", ctrl.downloadNotesPdf);
// Course outline PDF (owner-gated)
router.get("/courses/:slug/outline.pdf", ctrl.downloadOutlinePdf);
// Per-topic PDFs (owner-gated): comprehensive notes, and the 3 lab instructions
router.get("/courses/:slug/topics/:order/notes.pdf", ctrl.downloadTopicNotesPdf);
router.get("/courses/:slug/topics/:order/labs.pdf", ctrl.downloadTopicLabsPdf);

router.get("/assessments/:assessmentId", ctrl.getAssessment);
router.post(
  "/assessments/:assessmentId/submit",
  validate(submitAssessmentSchema),
  ctrl.submitAssessment
);

router.get("/recipes/:slug/content", ctrl.getRecipeContent);

// Recipe & booklet PDF downloads (owner-gated)
router.get("/recipes/:slug/booklet.pdf", ctrl.downloadRecipePdf);
router.get("/booklets/:slug/booklet.pdf", ctrl.downloadBookletPdf);

export default router;
