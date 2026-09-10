import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";

// --------------------------- Disciplines -----------------------------------

export const listDisciplines = asyncHandler(async (_req, res) => {
  const disciplines = await prisma.discipline.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { courses: true, recipes: true } },
    },
  });
  res.json({ disciplines });
});

// ------------------------------ Courses ------------------------------------

export const listCourses = asyncHandler(async (req, res) => {
  const { q, disciplineId, disciplineSlug, level, category, page, pageSize } = req.query;
  const where = {
    published: true,
    ...(disciplineId ? { disciplineId } : {}),
    ...(disciplineSlug ? { discipline: { slug: disciplineSlug } } : {}),
    ...(level ? { level } : {}),
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, courses] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: [{ category: "asc" }, { title: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        level: true,
        category: true,
        priceCents: true,
        isPlaceholder: true,
        discipline: { select: { id: true, name: true, slug: true } },
        _count: { select: { topics: true } },
      },
    }),
  ]);

  res.json({ total, page, pageSize, courses });
});

// Distinct course categories (for the catalog filter).
export const listCourseCategories = asyncHandler(async (_req, res) => {
  const rows = await prisma.course.findMany({
    where: { published: true, category: { not: null } },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  res.json({ categories: rows.map((r) => r.category) });
});

// Public course detail: outline only (no note bodies, no quiz answers).
export const getCourse = asyncHandler(async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { slug: req.params.slug },
    include: {
      discipline: { select: { id: true, name: true, slug: true } },
      topics: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          _count: { select: { notes: true, labs: true } },
          assessment: { select: { id: true, title: true } },
        },
      },
    },
  });
  if (!course || !course.published) throw ApiError.notFound("Course not found");

  res.json({ course });
});

// ------------------------------ Recipes ------------------------------------

export const listRecipes = asyncHandler(async (req, res) => {
  const { q, disciplineId, cuisine, page, pageSize } = req.query;
  const where = {
    published: true,
    ...(disciplineId ? { disciplineId } : {}),
    ...(cuisine ? { cuisine } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };

  const [total, recipes] = await Promise.all([
    prisma.recipe.count({ where }),
    prisma.recipe.findMany({
      where,
      orderBy: [{ cuisine: "asc" }, { title: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        cuisine: true,
        priceCents: true,
        isPlaceholder: true,
        imageUrl: true,
        // A short teaser of the history — full content is gated on purchase.
        history: true,
      },
    }),
  ]);

  // Trim the history to a teaser so the full narrative stays behind purchase.
  const teased = recipes.map((r) => ({
    ...r,
    history: r.history.slice(0, 140) + (r.history.length > 140 ? "…" : ""),
  }));

  res.json({ total, page, pageSize, recipes: teased });
});

export const listBooklets = asyncHandler(async (_req, res) => {
  const booklets = await prisma.booklet.findMany({
    where: { published: true },
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      priceCents: true,
      _count: { select: { recipes: true } },
    },
  });
  res.json({ booklets });
});
