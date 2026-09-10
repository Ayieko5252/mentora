// Regenerates the 3 labs on every topic of every course to the new format
// (guided walkthrough · build/drawing exercise · independent challenge),
// in place — notes, assessments and courses are left untouched. Skips the
// real PVsyst course (its labs are genuine, PDF-sourced content).
//
//   node prisma/update-labs.js
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { buildLabs, MODULE_THEMES } from "./seed-content.js";

async function main() {
  const start = Date.now();
  const topics = await prisma.topic.findMany({
    where: { course: { slug: { not: "pvsyst" } } },
    select: { id: true, order: true, course: { select: { title: true, category: true, slug: true } } },
    orderBy: { id: "asc" },
  });
  console.log(`Rebuilding labs for ${topics.length} topics...`);

  let done = 0;
  for (const t of topics) {
    const theme = MODULE_THEMES[(t.order - 1) % MODULE_THEMES.length];
    const labs = buildLabs(t.course.title, theme, t.order, t.course.category, t.course.slug);
    await prisma.$transaction([
      prisma.lab.deleteMany({ where: { topicId: t.id } }),
      prisma.lab.createMany({
        data: labs.map((l, i) => ({
          topicId: t.id,
          order: i + 1,
          title: l.title,
          objective: l.objective,
          instructionsMarkdown: l.instructionsMarkdown,
          estimatedMinutes: l.estimatedMinutes,
        })),
      }),
    ]);
    done += 1;
    if (done % 500 === 0 || done === topics.length) console.log(`  ...${done}/${topics.length}`);
  }

  console.log(`\n✔ Rebuilt labs on ${done} topics in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
