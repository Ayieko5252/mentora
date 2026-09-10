import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { z } from "zod";

// Platform-wide counts for the admin overview.
export const getStats = asyncHandler(async (_req, res) => {
  const [disciplines, courses, topics, recipes, booklets, users, purchases] =
    await Promise.all([
      prisma.discipline.count(),
      prisma.course.count(),
      prisma.topic.count(),
      prisma.recipe.count(),
      prisma.booklet.count(),
      prisma.user.count(),
      prisma.purchase.count({ where: { status: "PAID" } }),
    ]);
  res.json({ disciplines, courses, topics, recipes, booklets, users, paidPurchases: purchases });
});

const disciplineSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(["COURSE", "RECIPE"]).default("COURSE"),
});

export const createDiscipline = asyncHandler(async (req, res) => {
  const data = disciplineSchema.parse(req.body);
  const discipline = await prisma.discipline.create({ data });
  res.status(201).json({ discipline });
});

const recipeSchema = z.object({
  disciplineId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  cuisine: z.string().default("International"),
  history: z.string().min(1),
  instructionsMarkdown: z.string().min(1),
  priceCents: z.number().int().positive().default(500),
  published: z.boolean().default(true),
});

export const createRecipe = asyncHandler(async (req, res) => {
  const data = recipeSchema.parse(req.body);
  const recipe = await prisma.recipe.create({ data });
  res.status(201).json({ recipe });
});

// Create a course with its full nested structure in one transaction.
// Validates the mandatory shape: 10 topics, each with >=15 notes, exactly 3
// labs, and a 10-question assessment (each question with one correct choice).
const choiceSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
});
const questionSchema = z.object({
  prompt: z.string().min(1),
  explanation: z.string().optional(),
  choices: z.array(choiceSchema).min(2).max(6),
});
const topicSchema = z.object({
  title: z.string().min(1),
  notes: z
    .array(z.object({ title: z.string().min(1), contentMarkdown: z.string().min(1) }))
    .min(15, "Each topic needs at least 15 note pages"),
  labs: z
    .array(
      z.object({
        title: z.string().min(1),
        objective: z.string().min(1),
        instructionsMarkdown: z.string().min(1),
        estimatedMinutes: z.number().int().positive().default(45),
      })
    )
    .length(3, "Each topic needs exactly 3 labs"),
  assessment: z.object({
    title: z.string().min(1),
    questions: z.array(questionSchema).length(10, "Assessment needs exactly 10 questions"),
  }),
});
const courseSchema = z.object({
  disciplineId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  level: z.string().default("Beginner"),
  priceCents: z.number().int().positive().default(2000),
  published: z.boolean().default(true),
  topics: z.array(topicSchema).length(10, "A course must have exactly 10 topics"),
});

export const createCourse = asyncHandler(async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Course structure invalid",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
    );
  }
  const c = parsed.data;

  // Each question must have exactly one correct choice.
  for (const [ti, t] of c.topics.entries()) {
    for (const [qi, q] of t.assessment.questions.entries()) {
      const correct = q.choices.filter((ch) => ch.isCorrect).length;
      if (correct !== 1) {
        throw ApiError.badRequest(
          `Topic ${ti + 1} question ${qi + 1} must have exactly one correct choice`
        );
      }
    }
  }

  const course = await prisma.course.create({
    data: {
      disciplineId: c.disciplineId,
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      level: c.level,
      priceCents: c.priceCents,
      published: c.published,
      topics: {
        create: c.topics.map((t, ti) => ({
          order: ti + 1,
          title: t.title,
          notes: {
            create: t.notes.map((n, ni) => ({
              pageNumber: ni + 1,
              title: n.title,
              contentMarkdown: n.contentMarkdown,
            })),
          },
          labs: {
            create: t.labs.map((l, li) => ({
              order: li + 1,
              title: l.title,
              objective: l.objective,
              instructionsMarkdown: l.instructionsMarkdown,
              estimatedMinutes: l.estimatedMinutes,
            })),
          },
          assessment: {
            create: {
              title: t.assessment.title,
              questions: {
                create: t.assessment.questions.map((q, qi) => ({
                  order: qi + 1,
                  prompt: q.prompt,
                  explanation: q.explanation,
                  choices: {
                    create: q.choices.map((ch, ci) => ({
                      order: ci + 1,
                      text: ch.text,
                      isCorrect: ch.isCorrect,
                    })),
                  },
                })),
              },
            },
          },
        })),
      },
    },
    select: { id: true, slug: true, title: true },
  });

  res.status(201).json({ course });
});

// Toggle published state for a course or recipe.
export const setPublished = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const published = Boolean(req.body.published);
  if (type === "course") {
    const course = await prisma.course.update({ where: { id }, data: { published } });
    return res.json({ course: { id: course.id, published: course.published } });
  }
  if (type === "recipe") {
    const recipe = await prisma.recipe.update({ where: { id }, data: { published } });
    return res.json({ recipe: { id: recipe.id, published: recipe.published } });
  }
  throw ApiError.badRequest("type must be 'course' or 'recipe'");
});
