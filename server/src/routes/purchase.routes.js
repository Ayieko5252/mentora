import { Router } from "express";
import * as ctrl from "../controllers/purchase.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { checkoutSchema } from "../validation/schemas.js";

const router = Router();

router.post("/checkout", requireAuth, validate(checkoutSchema), ctrl.createCheckout);
router.get("/mine", requireAuth, ctrl.listMyPurchases);
// Note: the Stripe webhook is mounted separately in app.js (needs raw body).

export default router;
