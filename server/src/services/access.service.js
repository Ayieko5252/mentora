import { prisma } from "../lib/prisma.js";

// ---------------------------------------------------------------------------
// Access control: a user may only view full course/recipe content they own.
// Ownership comes from a PAID Purchase (direct, or via a booklet for recipes).
// Admins/instructors always have access.
// ---------------------------------------------------------------------------

function isStaff(user) {
  return user && (user.role === "ADMIN" || user.role === "INSTRUCTOR");
}

export async function userOwnsCourse(user, courseId) {
  if (isStaff(user)) return true;
  if (!user) return false;
  const purchase = await prisma.purchase.findFirst({
    where: { userId: user.id, courseId, itemType: "COURSE", status: "PAID" },
    select: { id: true },
  });
  return Boolean(purchase);
}

export async function userOwnsRecipe(user, recipeId) {
  if (isStaff(user)) return true;
  if (!user) return false;

  // Direct recipe purchase...
  const direct = await prisma.purchase.findFirst({
    where: { userId: user.id, recipeId, itemType: "RECIPE", status: "PAID" },
    select: { id: true },
  });
  if (direct) return true;

  // ...or ownership of a booklet that contains this recipe.
  const viaBooklet = await prisma.purchase.findFirst({
    where: {
      userId: user.id,
      itemType: "BOOKLET",
      status: "PAID",
      booklet: { recipes: { some: { recipeId } } },
    },
    select: { id: true },
  });
  return Boolean(viaBooklet);
}

export async function userOwnsBooklet(user, bookletId) {
  if (isStaff(user)) return true;
  if (!user) return false;
  const purchase = await prisma.purchase.findFirst({
    where: { userId: user.id, bookletId, itemType: "BOOKLET", status: "PAID" },
    select: { id: true },
  });
  return Boolean(purchase);
}
