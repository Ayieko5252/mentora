import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { serverPath } from "./lib/paths.js";

import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

import authRoutes from "./routes/auth.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import learnRoutes from "./routes/learn.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { stripeWebhook } from "./controllers/purchase.controller.js";

export function createApp() {
  const app = express();

  // CSP disabled so the same-origin built SPA (and tunnel host) load without
  // per-asset policy tuning; other hardening headers stay on.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

  // Stripe webhook must receive the RAW body for signature verification, so it
  // is registered BEFORE the JSON body parser.
  app.post(
    "/api/purchases/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhook
  );

  app.use(express.json({ limit: "1mb" }));

  // Basic abuse protection on the API surface.
  app.use(
    "/api",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false })
  );

  app.get("/api/health", (_req, res) => res.json({ status: "ok", mode: env.paymentsMockMode ? "mock-payments" : "stripe" }));

  // Public food photos used by recipe cards & booklets.
  const mediaDir = serverPath("prisma", "data", "food");
  app.use("/media/food", express.static(mediaDir, { maxAge: "7d" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/catalog", catalogRoutes);
  app.use("/api/learn", learnRoutes);
  app.use("/api/purchases", purchaseRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/admin", adminRoutes);

  // ----- Serve the built frontend from the same origin (production/tunnel) ---
  // When client/dist exists we serve the SPA here so one port hosts both the
  // app and the API. Unknown /api routes still 404 as JSON.
  const clientDist = serverPath("..", "client", "dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
    console.log(`Serving frontend from ${clientDist}`);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
