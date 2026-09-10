import Stripe from "stripe";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

// Resolves the priced item and enforces server-side pricing. The client never
// dictates the amount — we read it from the database.
async function resolveItem(itemType, itemId) {
  switch (itemType) {
    case "COURSE": {
      const course = await prisma.course.findUnique({ where: { id: itemId } });
      if (!course || !course.published) throw ApiError.notFound("Course not found");
      return {
        amountCents: course.priceCents,
        name: course.title,
        link: { courseId: course.id },
      };
    }
    case "RECIPE": {
      const recipe = await prisma.recipe.findUnique({ where: { id: itemId } });
      if (!recipe || !recipe.published) throw ApiError.notFound("Recipe not found");
      return {
        amountCents: recipe.priceCents,
        name: recipe.title,
        link: { recipeId: recipe.id },
      };
    }
    case "BOOKLET": {
      const booklet = await prisma.booklet.findUnique({ where: { id: itemId } });
      if (!booklet || !booklet.published) throw ApiError.notFound("Booklet not found");
      return {
        amountCents: booklet.priceCents,
        name: booklet.title,
        link: { bookletId: booklet.id },
      };
    }
    default:
      throw ApiError.badRequest("Unknown item type");
  }
}

async function alreadyOwned(userId, itemType, link) {
  const existing = await prisma.purchase.findFirst({
    where: { userId, itemType, status: "PAID", ...link },
    select: { id: true },
  });
  return Boolean(existing);
}

// Creates a checkout session. In mock mode (no Stripe key) the purchase is
// marked PAID immediately and we return a local success URL so the whole flow
// is demonstrable offline. With a Stripe key we create a real test-mode
// Checkout Session and mark the purchase PAID on webhook / confirm.
export async function createCheckout({ user, itemType, itemId }) {
  const { amountCents, name, link } = await resolveItem(itemType, itemId);

  if (await alreadyOwned(user.id, itemType, link)) {
    throw ApiError.conflict("You already own this item");
  }

  if (env.paymentsMockMode) {
    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        itemType,
        amountCents,
        status: "PAID", // auto-complete in mock mode
        stripeSessionId: `mock_${itemType}_${itemId}_${user.id}`,
        ...link,
      },
    });
    return {
      mode: "mock",
      purchaseId: purchase.id,
      // Front end treats this as "payment complete, content unlocked".
      checkoutUrl: null,
      message: `Mock purchase complete: ${name} ($${(amountCents / 100).toFixed(2)})`,
    };
  }

  // Real Stripe test-mode checkout
  const purchase = await prisma.purchase.create({
    data: {
      userId: user.id,
      itemType,
      amountCents,
      status: "PENDING",
      ...link,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${env.clientOrigin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientOrigin}/purchase/cancel`,
    metadata: { purchaseId: purchase.id, userId: user.id },
  });

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { stripeSessionId: session.id },
  });

  return { mode: "stripe", purchaseId: purchase.id, checkoutUrl: session.url };
}

// Marks a purchase PAID from a Stripe webhook event (source of truth).
export async function fulfillFromWebhook(rawBody, signature) {
  if (!stripe) throw ApiError.badRequest("Stripe not configured");
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch (err) {
    throw ApiError.badRequest(`Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const purchaseId = session.metadata?.purchaseId;
    if (purchaseId) {
      await prisma.purchase.updateMany({
        where: { id: purchaseId, status: "PENDING" },
        data: { status: "PAID" },
      });
    }
  }
  return { received: true };
}
