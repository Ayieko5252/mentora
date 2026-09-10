// Netlify Functions entry for the Express API. Kept under server/ so its imports
// resolve from server/node_modules at bundle time.
import serverless from "serverless-http";
import { createApp } from "./app.js";

const app = createApp();

// PDFs and images are binary — tell serverless-http to base64-encode them.
const slsHandler = serverless(app, {
  binary: [
    "application/pdf",
    "application/octet-stream",
    "image/png",
    "image/jpeg",
    "image/*",
  ],
});

const FN_BASE = "/.netlify/functions/api";

export const handler = (event, context) => {
  // Normalize the path so Express (whose routes live under /api) always matches,
  // whether Netlify hands us "/api/…" or "/.netlify/functions/api/…".
  if (event.path && event.path.startsWith(FN_BASE)) {
    event.path = "/api" + event.path.slice(FN_BASE.length);
    if (event.path === "/api") event.path = "/api/";
  }

  // serverless-http reads the client IP from requestContext.identity.sourceIp and
  // throws when it is absent; fill it from Netlify's client-IP header so requests
  // don't crash and the rate limiter keys on the real visitor.
  if (event.version !== "2.0" && !event.requestContext?.identity?.sourceIp) {
    const headers = event.headers || {};
    const sourceIp =
      headers["x-nf-client-connection-ip"] ||
      (headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      "0.0.0.0";
    event.requestContext = {
      ...event.requestContext,
      identity: { ...event.requestContext?.identity, sourceIp },
    };
  }

  return slsHandler(event, context);
};
