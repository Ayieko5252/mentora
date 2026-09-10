// ---------------------------------------------------------------------------
// Additive, idempotent course seeder.
//
// Inserts the 200 real engineering-tool courses WITHOUT deleting anything that
// already exists (no reset). Safe to run repeatedly: a course whose slug is
// already present is skipped. Existing courses, recipes, users, purchases and
// progress are all left untouched.
//
// Usage:
//   node prisma/seed-courses.js              # all 200 tool courses
//   COURSE_LIMIT=40 node prisma/seed-courses.js
// ---------------------------------------------------------------------------

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { generateCourseDescriptors, buildCourse } from "./seed-content.js";

const COURSE_LIMIT = Number(process.env.COURSE_LIMIT || 200);

async function getEngineeringDiscipline() {
  // Reuse the existing discipline if present; create it if the DB is fresh.
  const existing = await prisma.discipline.findUnique({
    where: { slug: "engineering-software" },
  });
  if (existing) return existing;
  return prisma.discipline.create({
    data: {
      slug: "engineering-software",
      name: "Engineering Software",
      description:
        "Engineering software courses across CAD, CAE/FEA, CFD, EDA, process, civil, BIM, CAM and more.",
      kind: "COURSE",
    },
  });
}

async function main() {
  const start = Date.now();
  const discipline = await getEngineeringDiscipline();

  const descriptors = generateCourseDescriptors().slice(0, COURSE_LIMIT);

  // Which of these are already in the DB (by slug)? Skip those.
  const existingSlugs = new Set(
    (
      await prisma.course.findMany({
        where: { slug: { in: descriptors.map((d) => d.slug) } },
        select: { slug: true },
      })
    ).map((c) => c.slug)
  );

  const toCreate = descriptors.filter((d) => !existingSlugs.has(d.slug));
  console.log(
    `Engineering tool courses: ${descriptors.length} in catalog, ` +
      `${existingSlugs.size} already present, creating ${toCreate.length}...`
  );

  let done = 0;
  for (const descriptor of toCreate) {
    const course = buildCourse(descriptor, discipline.id);
    await prisma.course.create({
      data: {
        disciplineId: course.disciplineId,
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        level: course.level,
        category: course.category,
        priceCents: course.priceCents,
        published: course.published,
        isPlaceholder: course.isPlaceholder,
        topics: {
          create: course.topics.map((t) => ({
            order: t.order,
            title: t.title,
            notes: {
              create: t.notes.map((n, i) => ({
                pageNumber: i + 1,
                title: n.title,
                contentMarkdown: n.contentMarkdown,
              })),
            },
            labs: {
              create: t.labs.map((l, i) => ({
                order: i + 1,
                title: l.title,
                objective: l.objective,
                instructionsMarkdown: l.instructionsMarkdown,
                estimatedMinutes: l.estimatedMinutes,
              })),
            },
            assessment: {
              create: {
                title: `Self-Assessment: ${t.title}`,
                questions: {
                  create: t.questions.map((q, qi) => ({
                    order: qi + 1,
                    prompt: q.prompt,
                    explanation: q.explanation,
                    choices: {
                      create: q.choices.map((c, ci) => ({
                        order: ci + 1,
                        text: c.text,
                        isCorrect: c.isCorrect,
                      })),
                    },
                  })),
                },
              },
            },
          })),
        },
      },
    });
    done += 1;
    if (done % 20 === 0 || done === toCreate.length) {
      console.log(`  ...${done}/${toCreate.length} new courses`);
    }
  }

  const total = await prisma.course.count();
  console.log(`\n✔ Done. Courses in catalog now: ${total}`);
  console.log(`  Took ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
