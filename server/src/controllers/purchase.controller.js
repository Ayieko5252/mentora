import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import * as payments from "../services/payments.service.js";

export const createCheckout = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.body;
  const result = await payments.createCheckout({ user: req.user, itemType, itemId });
  res.status(201).json(result);
});

// Stripe webhook — raw body is required (see route registration in app.js).
export const stripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const result = await payments.fulfillFromWebhook(req.body, signature);
  res.json(result);
});

export const listMyPurchases = asyncHandler(async (req, res) => {
  const purchases = await prisma.purchase.findMany({
    where: { userId: req.user.id, status: "PAID" },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { slug: true, title: true } },
      recipe: { select: { slug: true, title: true } },
      booklet: { select: { slug: true, title: true } },
    },
  });
  res.json({ purchases });
});
