// Additive, idempotent seeder for the engineering-tools EXPANSION set
// (200 more tools across 9 new categories). Adds courses without touching
// anything already in the catalog. Safe to re-run (skips existing slugs).
//
//   node prisma/add-courses.js            # all 200 expansion courses
//   COURSE_LIMIT=20 node prisma/add-courses.js
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { generateExtraCourseDescriptors, buildCourse } from "./seed-content.js";

const COURSE_LIMIT = Number(process.env.COURSE_LIMIT || 200);

async function main() {
  const start = Date.now();
  const discipline = await prisma.discipline.findUnique({ where: { slug: "engineering-tools" } });
  if (!discipline) throw new Error("engineering-tools discipline not found — run the main seed first.");

  const descriptors = generateExtraCourseDescriptors().slice(0, COURSE_LIMIT);
  const existing = new Set(
    (
      await prisma.course.findMany({
        where: { slug: { in: descriptors.map((d) => d.slug) } },
        select: { slug: true },
      })
    ).map((c) => c.slug)
  );
  const toCreate = descriptors.filter((d) => !existing.has(d.slug));
  console.log(`Expansion set: ${descriptors.length} tools, ${existing.size} already present, creating ${toCreate.length}...`);

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
            notes: { create: t.notes.map((n, i) => ({ pageNumber: i + 1, title: n.title, contentMarkdown: n.contentMarkdown })) },
            labs: { create: t.labs.map((l, i) => ({ order: i + 1, title: l.title, objective: l.objective, instructionsMarkdown: l.instructionsMarkdown, estimatedMinutes: l.estimatedMinutes })) },
            assessment: {
              create: {
                title: `Self-Assessment: ${t.title}`,
                questions: {
                  create: t.questions.map((q, qi) => ({
                    order: qi + 1,
                    prompt: q.prompt,
                    explanation: q.explanation,
                    choices: { create: q.choices.map((c, ci) => ({ order: ci + 1, text: c.text, isCorrect: c.isCorrect })) },
                  })),
                },
              },
            },
          })),
        },
      },
    });
    done += 1;
    if (done % 25 === 0 || done === toCreate.length) console.log(`  ...${done}/${toCreate.length}`);
  }

  const total = await prisma.course.count();
  console.log(`\n✔ Done in ${((Date.now() - start) / 1000).toFixed(1)}s. Courses in catalog now: ${total}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
