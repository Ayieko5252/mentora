import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

// Learner dashboard: purchased content, progress, scores, completion status.
export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [enrollments, recipePurchases, bookletPurchases] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        course: {
          select: {
            slug: true,
            title: true,
            level: true,
            category: true,
            discipline: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.purchase.findMany({
      where: { userId, itemType: "RECIPE", status: "PAID" },
      orderBy: { createdAt: "desc" },
      include: { recipe: { select: { slug: true, title: true, cuisine: true } } },
    }),
    prisma.purchase.findMany({
      where: { userId, itemType: "BOOKLET", status: "PAID" },
      orderBy: { createdAt: "desc" },
      include: {
        booklet: {
          select: {
            slug: true,
            title: true,
            recipes: {
              orderBy: { order: "asc" },
              select: { recipe: { select: { slug: true, title: true } } },
            },
          },
        },
      },
    }),
  ]);

  res.json({
    courses: enrollments.map((e) => ({
      slug: e.course.slug,
      title: e.course.title,
      level: e.course.level,
      category: e.course.category,
      department: e.course.discipline?.name || "Courses",
      departmentSlug: e.course.discipline?.slug || "courses",
      notesCompletionPercent: e.notesCompletionPercent,
      selfAssessmentAverage: e.selfAssessmentAverage,
      overallAverage: e.overallAverage,
      passed: e.passed,
      completedAt: e.completedAt,
    })),
    recipes: recipePurchases.map((p) => p.recipe).filter(Boolean),
    booklets: bookletPurchases.map((p) => ({
      slug: p.booklet?.slug,
      title: p.booklet?.title,
      recipes: (p.booklet?.recipes || []).map((br) => br.recipe),
    })),
  });
});
