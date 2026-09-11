import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { userOwnsCourse, userOwnsRecipe, userOwnsBooklet } from "../services/access.service.js";
import { pipeRecipeBooklet, pipeBooklet } from "../services/recipe-pdf.service.js";
import { env } from "../config/env.js";
import {
  gradeAssessment,
  recomputeEnrollment,
  PASS_SELF_ASSESSMENT_MIN,
} from "../services/grading.service.js";
import {
  loadCourseNotes,
  loadCourseTopic,
  loadCourseOutline,
  buildNotesMarkdown,
  notesFilenameBase,
} from "../services/notes.service.js";
import {
  buildTopicNotesPdf,
  buildTopicLabsPdf,
  buildOutlinePdf,
  buildCourseNotesPdf,
} from "../services/topic-pdf.service.js";

// Ensures the learner owns the course and has an enrollment row; returns it.
async function ensureEnrollment(user, courseId) {
  const owns = await userOwnsCourse(user, courseId);
  if (!owns) throw ApiError.forbidden("Purchase this course to access it");

  return prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    update: {},
    create: { userId: user.id, courseId },
  });
}

// Full course content for an owner: notes bodies + labs + progress.
// Quiz CORRECT answers are never included here.
export const getCourseContent = asyncHandler(async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { slug: req.params.slug },
    select: { id: true, slug: true, title: true, summary: true, level: true },
  });
  if (!course) throw ApiError.notFound("Course not found");

  const enrollment = await ensureEnrollment(req.user, course.id);

  const topics = await prisma.topic.findMany({
    where: { courseId: course.id },
    orderBy: { order: "asc" },
    include: {
      notes: {
        orderBy: { pageNumber: "asc" },
        select: { id: true, pageNumber: true, title: true, contentMarkdown: true },
      },
      labs: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          objective: true,
          instructionsMarkdown: true,
          estimatedMinutes: true,
        },
      },
      assessment: { select: { id: true, title: true } },
    },
  });

  const progress = await prisma.topicProgress.findMany({
    where: { enrollmentId: enrollment.id },
  });
  const readSet = new Set(progress.filter((p) => p.notesRead).map((p) => p.topicId));

  // Best attempt score per assessment (for display).
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { enrollmentId: enrollment.id },
    orderBy: { createdAt: "desc" },
  });
  const bestScore = new Map();
  for (const a of attempts) {
    bestScore.set(a.assessmentId, Math.max(bestScore.get(a.assessmentId) ?? 0, a.scorePercent));
  }

  res.json({
    course,
    enrollment: {
      id: enrollment.id,
      notesCompletionPercent: enrollment.notesCompletionPercent,
      selfAssessmentAverage: enrollment.selfAssessmentAverage,
      overallAverage: enrollment.overallAverage,
      passed: enrollment.passed,
      completedAt: enrollment.completedAt,
    },
    topics: topics.map((t) => ({
      ...t,
      notesRead: readSet.has(t.id),
      bestAssessmentScore: t.assessment ? bestScore.get(t.assessment.id) ?? null : null,
    })),
  });
});

// Learner marks a topic's notes as read (drives notes-completion metric).
export const markNotesRead = asyncHandler(async (req, res) => {
  const { topicId, notesRead } = req.body;
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { courseId: true },
  });
  if (!topic) throw ApiError.notFound("Topic not found");

  const enrollment = await ensureEnrollment(req.user, topic.courseId);

  await prisma.topicProgress.upsert({
    where: { enrollmentId_topicId: { enrollmentId: enrollment.id, topicId } },
    update: { notesRead },
    create: { enrollmentId: enrollment.id, topicId, notesRead },
  });

  const updated = await recomputeEnrollment(enrollment.id);
  res.json({ enrollment: updated });
});

// Delivers a self-assessment WITHOUT correct-answer flags.
export const getAssessment = asyncHandler(async (req, res) => {
  const assessment = await prisma.selfAssessment.findUnique({
    where: { id: req.params.assessmentId },
    include: {
      topic: { select: { courseId: true, title: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          prompt: true,
          // isCorrect / explanation intentionally omitted before grading.
          choices: {
            orderBy: { order: "asc" },
            select: { id: true, order: true, text: true },
          },
        },
      },
    },
  });
  if (!assessment) throw ApiError.notFound("Assessment not found");

  // Owning the course is required to take its assessments.
  await ensureEnrollment(req.user, assessment.topic.courseId);

  res.json({
    assessment: {
      id: assessment.id,
      title: assessment.title,
      topicTitle: assessment.topic.title,
      passMark: PASS_SELF_ASSESSMENT_MIN,
      questions: assessment.questions,
    },
  });
});

// Grades a submission server-side, records the attempt, recomputes the course
// grade, and returns the score + per-question review (with explanations).
export const submitAssessment = asyncHandler(async (req, res) => {
  const assessmentId = req.params.assessmentId;
  const { answers } = req.body;

  const assessment = await prisma.selfAssessment.findUnique({
    where: { id: assessmentId },
    include: { topic: { select: { courseId: true } } },
  });
  if (!assessment) throw ApiError.notFound("Assessment not found");

  const enrollment = await ensureEnrollment(req.user, assessment.topic.courseId);

  const graded = await gradeAssessment(assessmentId, answers);
  const passed = graded.scorePercent >= PASS_SELF_ASSESSMENT_MIN;

  await prisma.assessmentAttempt.create({
    data: {
      userId: req.user.id,
      assessmentId,
      enrollmentId: enrollment.id,
      scorePercent: graded.scorePercent,
      passed,
      answers,
    },
  });

  const updatedEnrollment = await recomputeEnrollment(enrollment.id);

  // Attach explanations to the per-question review now that it's graded.
  const explanations = await prisma.question.findMany({
    where: { assessmentId },
    select: { id: true, explanation: true },
  });
  const explMap = new Map(explanations.map((e) => [e.id, e.explanation]));

  res.json({
    scorePercent: graded.scorePercent,
    correctCount: graded.correctCount,
    total: graded.total,
    passed,
    passMark: PASS_SELF_ASSESSMENT_MIN,
    review: graded.results.map((r) => ({ ...r, explanation: explMap.get(r.questionId) ?? null })),
    enrollment: updatedEnrollment,
  });
});

// ----------------------- Downloadable notes --------------------------------
// Owner-gated: compiles the course's study notes for download after learning.

async function loadOwnedCourseNotes(user, slug) {
  const course = await loadCourseNotes(slug);
  if (!course) throw ApiError.notFound("Course not found");
  const owns = await userOwnsCourse(user, course.id);
  if (!owns) throw ApiError.forbidden("Purchase this course to download its notes");
  return course;
}

export const downloadNotesMarkdown = asyncHandler(async (req, res) => {
  const course = await loadOwnedCourseNotes(req.user, req.params.slug);
  const md = buildNotesMarkdown(course);
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${notesFilenameBase(course)}-notes.md"`
  );
  res.send(md);
});

export const downloadNotesPdf = asyncHandler(async (req, res) => {
  const course = await loadOwnedCourseNotes(req.user, req.params.slug);
  const buffer = await buildCourseNotesPdf(course);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${notesFilenameBase(course)}-notes.pdf"`
  );
  res.send(buffer);
});

export const downloadOutlinePdf = asyncHandler(async (req, res) => {
  const course = await loadCourseOutline(req.params.slug);
  if (!course) throw ApiError.notFound("Course not found");
  const owns = await userOwnsCourse(req.user, course.id);
  if (!owns) throw ApiError.forbidden("Purchase this course to download its outline");
  const buffer = await buildOutlinePdf(course);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${course.slug}-outline.pdf"`);
  res.send(buffer);
});

// Per-topic PDFs (owner-gated): comprehensive notes, and the 3 lab instructions.
async function loadOwnedTopic(user, slug, orderParam) {
  const order = Number(orderParam);
  if (!Number.isInteger(order) || order < 1) throw ApiError.badRequest("Invalid topic");
  const loaded = await loadCourseTopic(slug, order);
  if (!loaded) throw ApiError.notFound("Topic not found");
  const owns = await userOwnsCourse(user, loaded.course.id);
  if (!owns) throw ApiError.forbidden("Purchase this course to download its materials");
  return loaded;
}

export const downloadTopicNotesPdf = asyncHandler(async (req, res) => {
  const { course, topic } = await loadOwnedTopic(req.user, req.params.slug, req.params.order);
  const buffer = await buildTopicNotesPdf(course, topic);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${course.slug}-topic${topic.order}-notes.pdf"`);
  res.send(buffer);
});

export const downloadTopicLabsPdf = asyncHandler(async (req, res) => {
  const { course, topic } = await loadOwnedTopic(req.user, req.params.slug, req.params.order);
  const buffer = await buildTopicLabsPdf(course, topic);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${course.slug}-topic${topic.order}-labs.pdf"`);
  res.send(buffer);
});

// ------------------------------ Recipes ------------------------------------

// Full recipe content (history + instructions) — gated on ownership.
export const getRecipeContent = asyncHandler(async (req, res) => {
  const recipe = await prisma.recipe.findUnique({
    where: { slug: req.params.slug },
  });
  if (!recipe || !recipe.published) throw ApiError.notFound("Recipe not found");

  const owns = await userOwnsRecipe(req.user, recipe.id);
  if (!owns) throw ApiError.forbidden("Purchase this recipe to read it");

  res.json({
    recipe: {
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title,
      cuisine: recipe.cuisine,
      author: recipe.author,
      servings: recipe.servings,
      totalTime: recipe.totalTime,
      imageUrl: recipe.imageUrl,
      history: recipe.history,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      instructionsMarkdown: recipe.instructionsMarkdown,
      isPlaceholder: recipe.isPlaceholder,
    },
  });
});

// ----------------- Recipe / booklet PDF downloads (owner-gated) ------------

export const downloadRecipePdf = asyncHandler(async (req, res) => {
  const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
  if (!recipe || !recipe.published) throw ApiError.notFound("Recipe not found");
  const owns = await userOwnsRecipe(req.user, recipe.id);
  if (!owns) throw ApiError.forbidden("Purchase this recipe to download it");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${recipe.slug}.pdf"`);
  pipeRecipeBooklet(res, recipe);
});

export const downloadBookletPdf = asyncHandler(async (req, res) => {
  const booklet = await prisma.booklet.findUnique({
    where: { slug: req.params.slug },
    include: {
      recipes: { orderBy: { order: "asc" }, include: { recipe: true } },
    },
  });
  if (!booklet || !booklet.published) throw ApiError.notFound("Booklet not found");
  const owns = await userOwnsBooklet(req.user, booklet.id);
  if (!owns) throw ApiError.forbidden("Purchase this booklet to download it");

  const recipes = booklet.recipes.map((br) => br.recipe).filter(Boolean);

  // A full booklet PDF (~11 MB for 100 recipes) exceeds the serverless response
  // cap. Decline gracefully there and point the buyer at per-recipe downloads,
  // which they also own and which stream comfortably under the limit.
  if (env.isServerless && recipes.length > env.maxBookletRecipesServerless) {
    throw ApiError.payloadTooLarge(
      `This ${recipes.length}-recipe booklet PDF is too large to generate on our ` +
        `serverless host. Download the individual recipe PDFs instead — you own every ` +
        `recipe in this booklet.`
    );
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${booklet.slug}.pdf"`);
  pipeBooklet(res, booklet, recipes);
});
