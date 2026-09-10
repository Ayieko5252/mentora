// Targeted re-seed of recipes + booklets only (leaves courses untouched).
// Adds the booklet-format fields: ingredients, steps, author/servings/time,
// and a food image per recipe. Also grants the demo learner a sample recipe
// and booklet so the PDF downloads are testable.
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { generateRecipeDescriptors, RECIPES_PER_BOOKLET } from "./seed-content.js";
import { imageUrlFor } from "./food-images.js";

const RECIPE_LIMIT = Number(process.env.RECIPE_LIMIT || 1000);

async function main() {
  const start = Date.now();
  console.log("Clearing recipes & booklets...");
  await prisma.bookletRecipe.deleteMany();
  await prisma.booklet.deleteMany();
  await prisma.recipe.deleteMany();

  const disc = await prisma.discipline.findUnique({ where: { slug: "recipes" } });
  const descriptors = generateRecipeDescriptors().slice(0, RECIPE_LIMIT);
  console.log(`Creating ${descriptors.length} recipes with images + steps...`);
  const BATCH = 200;
  for (let i = 0; i < descriptors.length; i += BATCH) {
    const batch = descriptors.slice(i, i + BATCH).map((r) => ({
      disciplineId: disc.id,
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
    console.log(`  ...${Math.min(i + BATCH, descriptors.length)}/${descriptors.length}`);
  }

  const recipes = await prisma.recipe.findMany({ orderBy: { title: "asc" }, select: { id: true } });
  const bookletCount = Math.floor(recipes.length / RECIPES_PER_BOOKLET);
  console.log(`Creating ${bookletCount} booklet(s)...`);
  for (let b = 0; b < bookletCount; b++) {
    const slice = recipes.slice(b * RECIPES_PER_BOOKLET, (b + 1) * RECIPES_PER_BOOKLET);
    await prisma.booklet.create({
      data: {
        slug: `recipe-booklet-${b + 1}`,
        title: `Recipe Booklet ${b + 1} (100 Recipes)`,
        description:
          "A curated booklet of 100 recipes. Bundle price $50 — a 90% saving versus buying all 100 individually at $5 each ($500).",
        priceCents: 5000,
        recipes: { create: slice.map((r, i) => ({ recipeId: r.id, order: i + 1 })) },
      },
    });
  }

  // Grant the demo learner a sample recipe + booklet for testing downloads.
  const learner = await prisma.user.findUnique({ where: { email: "learner@mentora.dev" } });
  if (learner) {
    const firstRecipe = await prisma.recipe.findFirst({ orderBy: { title: "asc" } });
    const firstBooklet = await prisma.booklet.findFirst({ orderBy: { slug: "asc" } });
    if (firstRecipe) {
      await prisma.purchase.create({
        data: {
          userId: learner.id, itemType: "RECIPE", recipeId: firstRecipe.id,
          amountCents: firstRecipe.priceCents, status: "PAID",
          stripeSessionId: `seed_recipe_${firstRecipe.id}`,
        },
      });
    }
    if (firstBooklet) {
      await prisma.purchase.create({
        data: {
          userId: learner.id, itemType: "BOOKLET", bookletId: firstBooklet.id,
          amountCents: firstBooklet.priceCents, status: "PAID",
          stripeSessionId: `seed_booklet_${firstBooklet.id}`,
        },
      });
    }
  }

  console.log(`\n✔ Recipes reseeded in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
