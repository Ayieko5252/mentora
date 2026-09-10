// ---------------------------------------------------------------------------
// Seed script — creates the two launch verticals with full structure.
//
//   200 Engineering Software courses (10 topics each; 15 notes + 3 labs +
//       1 ten-question assessment per topic  ->  30 labs / course)
//   1,000 Recipes (title, brief history, instructions)
//   10 Recipe booklets of 100 recipes each ($50, discounted vs 100 x $5)
//   demo admin + learner accounts (+ a couple of sample purchases),
//       unless SEED_DEMO_USERS=false
//
// For a fast local demo you can shrink the volume without changing structure:
//   COURSE_LIMIT=6 RECIPE_LIMIT=200 npm run seed
// Defaults are the full 200 / 1000.
//
// For a public deployment, skip the demo logins and create your own admin:
//   SEED_DEMO_USERS=false ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run seed
// ---------------------------------------------------------------------------

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import {
  generateCourseDescriptors,
  generateProgrammingDescriptors,
  generateRecipeDescriptors,
  buildCourse,
  RECIPES_PER_BOOKLET,
} from "./seed-content.js";
import { buildPvsystCourse } from "./pvsyst.js";
import { imageUrlFor } from "./food-images.js";

const COURSE_LIMIT = Number(process.env.COURSE_LIMIT || 200);
const PROGRAMMING_LIMIT = Number(process.env.PROGRAMMING_LIMIT || 30);
const RECIPE_LIMIT = Number(process.env.RECIPE_LIMIT || 1000);
// Demo logins are for local development. Seeds for a public deployment should
// set SEED_DEMO_USERS=false and provide ADMIN_EMAIL / ADMIN_PASSWORD instead.
const SEED_DEMO_USERS = (process.env.SEED_DEMO_USERS ?? "true").toLowerCase() !== "false";

async function reset() {
  console.log("Clearing existing data...");
  // Order matters due to FKs; deleting parents cascades to children.
  await prisma.assessmentAttempt.deleteMany();
  await prisma.topicProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.bookletRecipe.deleteMany();
  await prisma.booklet.deleteMany();
  await prisma.course.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.discipline.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const users = {};

  if (SEED_DEMO_USERS) {
    console.log("Creating demo users...");
    const [adminHash, learnerHash] = await Promise.all([
      bcrypt.hash("Admin123!", 10),
      bcrypt.hash("Learner123!", 10),
    ]);

    users.admin = await prisma.user.create({
      data: { email: "admin@mentora.dev", name: "Mentora Admin", role: "ADMIN", passwordHash: adminHash },
    });
    users.learner = await prisma.user.create({
      data: { email: "learner@mentora.dev", name: "Demo Learner", role: "LEARNER", passwordHash: learnerHash },
    });
  } else {
    console.log("Skipping demo users (SEED_DEMO_USERS=false).");
  }

  // A real admin account whose credentials come from the environment, never
  // from source — use this for any publicly reachable deployment.
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_EMAIL || ADMIN_PASSWORD) {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("Set both ADMIN_EMAIL and ADMIN_PASSWORD, or neither.");
    }
    if (ADMIN_PASSWORD.length < 12) {
      throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
    }
    console.log(`Creating admin account ${ADMIN_EMAIL}...`);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    users.owner = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { role: "ADMIN", passwordHash },
      create: { email: ADMIN_EMAIL, name: ADMIN_NAME || "Mentora Admin", role: "ADMIN", passwordHash },
    });
  }

  return users;
}

async function seedDisciplines() {
  console.log("Creating departments (disciplines)...");
  const engineeringTools = await prisma.discipline.create({
    data: {
      slug: "engineering-tools",
      name: "Engineering Tools",
      description:
        "Professional engineering software across CAD, CAE/FEA, CFD, EDA, process, civil, BIM, CAM, aerospace and more.",
      kind: "COURSE",
    },
  });
  const programming = await prisma.discipline.create({
    data: {
      slug: "programming",
      name: "Programming",
      description: "Software development courses: languages, frameworks, cloud, and engineering practices.",
      kind: "COURSE",
    },
  });
  const cooking = await prisma.discipline.create({
    data: {
      slug: "recipes",
      name: "Recipes",
      description: "A global collection of recipes with their history and step-by-step instructions.",
      kind: "RECIPE",
    },
  });
  return { engineeringTools, programming, cooking };
}

// Shared: persist one course object (from buildCourse / buildPvsystCourse).
async function createCourseRecord(course) {
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
}

async function seedCoursesFrom(descriptors, disciplineId, label) {
  console.log(`Creating ${descriptors.length} ${label} courses (10 topics, 30 labs, 10 assessments each)...`);
  let done = 0;
  for (const descriptor of descriptors) {
    await createCourseRecord(buildCourse(descriptor, disciplineId));
    done += 1;
    if (done % 20 === 0 || done === descriptors.length) {
      console.log(`  ...${done}/${descriptors.length} ${label} courses`);
    }
  }
}

async function seedPvsyst(disciplineId) {
  const course = buildPvsystCourse(disciplineId);
  if (!course) {
    console.log("PVsyst raw data not found — skipping real PVsyst course.");
    return;
  }
  console.log("Creating real PVsyst course from supplied PDFs...");
  await createCourseRecord(course);
}

async function seedRecipes(disciplineId) {
  const descriptors = generateRecipeDescriptors().slice(0, RECIPE_LIMIT);
  console.log(`Creating ${descriptors.length} recipes...`);

  // Bulk insert in batches for speed.
  const BATCH = 200;
  for (let i = 0; i < descriptors.length; i += BATCH) {
    const batch = descriptors.slice(i, i + BATCH).map((r) => ({
      disciplineId,
      slug: r.slug,
      title: r.title,
      cuisine: r.cuisine,
      author: r.author,
      servings: r.servings,
      totalTime: r.totalTime,
      imageUrl: imageUrlFor(r.title.replace(r.cuisine, "").trim(), r.slug),
      history: r.history,
      ingredients: r.ingredients,
      steps: r.steps,
      instructionsMarkdown: r.instructionsMarkdown,
      priceCents: r.priceCents,
      published: r.published,
      isPlaceholder: r.isPlaceholder,
    }));
    await prisma.recipe.createMany({ data: batch });
    console.log(`  ...${Math.min(i + BATCH, descriptors.length)}/${descriptors.length} recipes`);
  }
}

async function seedBooklets() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { title: "asc" },
    select: { id: true },
  });
  const bookletCount = Math.floor(recipes.length / RECIPES_PER_BOOKLET);
  if (bookletCount === 0) {
    console.log("Not enough recipes for a 100-recipe booklet — skipping booklets.");
    return;
  }
  console.log(`Creating ${bookletCount} booklet(s) of ${RECIPES_PER_BOOKLET} recipes ($50 each)...`);

  for (let b = 0; b < bookletCount; b++) {
    const slice = recipes.slice(b * RECIPES_PER_BOOKLET, (b + 1) * RECIPES_PER_BOOKLET);
    await prisma.booklet.create({
      data: {
        slug: `recipe-booklet-${b + 1}`,
        title: `Recipe Booklet ${b + 1} (100 Recipes)`,
        description:
          "A curated booklet of 100 recipes. Bundle price $50 — a 90% saving versus buying all 100 individually at $5 each ($500).",
        priceCents: 5000, // $50, discounted vs 100 x $5 = $500
        recipes: {
          create: slice.map((r, i) => ({ recipeId: r.id, order: i + 1 })),
        },
      },
    });
  }
}

// Give the demo learner some content so the dashboard is populated on first run.
async function seedSampleAccess(learner) {
  const firstCourse = await prisma.course.findFirst({ orderBy: { title: "asc" } });
  const firstRecipe = await prisma.recipe.findFirst({ orderBy: { title: "asc" } });
  if (firstCourse) {
    await prisma.purchase.create({
      data: {
        userId: learner.id,
        itemType: "COURSE",
        courseId: firstCourse.id,
        amountCents: firstCourse.priceCents,
        status: "PAID",
        stripeSessionId: `seed_course_${firstCourse.id}`,
      },
    });
    await prisma.enrollment.create({
      data: { userId: learner.id, courseId: firstCourse.id },
    });
  }
  if (firstRecipe) {
    await prisma.purchase.create({
      data: {
        userId: learner.id,
        itemType: "RECIPE",
        recipeId: firstRecipe.id,
        amountCents: firstRecipe.priceCents,
        status: "PAID",
        stripeSessionId: `seed_recipe_${firstRecipe.id}`,
      },
    });
  }
  const firstBooklet = await prisma.booklet.findFirst({ orderBy: { slug: "asc" } });
  if (firstBooklet) {
    await prisma.purchase.create({
      data: {
        userId: learner.id,
        itemType: "BOOKLET",
        bookletId: firstBooklet.id,
        amountCents: firstBooklet.priceCents,
        status: "PAID",
        stripeSessionId: `seed_booklet_${firstBooklet.id}`,
      },
    });
  }
}

async function main() {
  const start = Date.now();
  await reset();
  const { learner } = await seedUsers();
  const { engineeringTools, programming, cooking } = await seedDisciplines();

  // Engineering Tools department: the 200 real engineering-software tools...
  await seedCoursesFrom(
    generateCourseDescriptors().slice(0, COURSE_LIMIT),
    engineeringTools.id,
    "engineering-tools"
  );
  // ...plus the real, PDF-sourced PVsyst course.
  await seedPvsyst(engineeringTools.id);

  // Programming department: the software-development courses.
  await seedCoursesFrom(
    generateProgrammingDescriptors().slice(0, PROGRAMMING_LIMIT),
    programming.id,
    "programming"
  );

  // Recipes department.
  await seedRecipes(cooking.id);
  await seedBooklets();
  if (learner) await seedSampleAccess(learner);

  const [courses, topics, recipes, booklets] = await Promise.all([
    prisma.course.count(),
    prisma.topic.count(),
    prisma.recipe.count(),
    prisma.booklet.count(),
  ]);

  console.log("\n✔ Seed complete");
  console.log(`  Courses: ${courses}  Topics: ${topics}  Recipes: ${recipes}  Booklets: ${booklets}`);
  console.log(`  Took ${((Date.now() - start) / 1000).toFixed(1)}s`);
  if (SEED_DEMO_USERS) {
    console.log("\n  Demo logins:");
    console.log("    admin@mentora.dev / Admin123!");
    console.log("    learner@mentora.dev / Learner123!\n");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
