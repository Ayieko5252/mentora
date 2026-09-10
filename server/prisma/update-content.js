// Applies the enriched content to existing courses, in place:
//   1. Regenerates the 15 note pages of each assessed topic (now includes a
//      real-world study page and a drawing/reference page).
//   2. Adds a non-assessed "Opportunities" topic (order 11) to every course.
// Leaves labs, assessments and the PVsyst notes untouched.
//
//   node prisma/update-content.js
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { buildTopicNotes, buildOpportunitiesNotes } from "./seed-content.js";

async function main() {
  const start = Date.now();
  const courses = await prisma.course.findMany({
    select: {
      id: true, slug: true, title: true, category: true,
      topics: { select: { id: true, order: true }, orderBy: { order: "asc" } },
    },
    orderBy: { title: "asc" },
  });
  console.log(`Updating content for ${courses.length} courses...`);

  let notesTopics = 0, oppAdded = 0;
  for (const course of courses) {
    const isPvsyst = course.slug === "pvsyst";

    // 1. Regenerate assessed-topic notes (skip the real PVsyst course).
    if (!isPvsyst) {
      for (const t of course.topics.filter((x) => x.order >= 1 && x.order <= 10)) {
        const notes = buildTopicNotes(course.title, course.category, t.order);
        await prisma.$transaction([
          prisma.note.deleteMany({ where: { topicId: t.id } }),
          prisma.note.createMany({
            data: notes.map((n, i) => ({ topicId: t.id, pageNumber: i + 1, title: n.title, contentMarkdown: n.contentMarkdown })),
          }),
        ]);
        notesTopics += 1;
      }
    }

    // 2. Ensure an "Opportunities" topic (order 11), notes-only, not assessed.
    const hasOpp = course.topics.some((t) => t.order === 11);
    if (!hasOpp) {
      const notes = buildOpportunitiesNotes(course.title, course.category);
      await prisma.topic.create({
        data: {
          courseId: course.id,
          order: 11,
          title: "Opportunities",
          notes: { create: notes.map((n, i) => ({ pageNumber: i + 1, title: n.title, contentMarkdown: n.contentMarkdown })) },
        },
      });
      oppAdded += 1;
    }
  }

  console.log(`\n✔ Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  console.log(`  Regenerated notes on ${notesTopics} topics · added ${oppAdded} Opportunities topics`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
