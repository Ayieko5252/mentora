// Netlify Function that runs the whole Express API in serverless mode.
// The netlify.toml redirect sends /api/* here; static assets (the SPA and the
// food images) are served directly from the publish directory.
import serverless from "serverless-http";
import { createApp } from "../../server/src/app.js";

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

// Normalize the path so Express (whose routes live under /api) always matches,
// whether Netlify hands us "/api/…" or "/.netlify/functions/api/…".
export const handler = (event, context) => {
  const fnBase = "/.netlify/functions/api";
  if (event.path && event.path.startsWith(fnBase)) {
    event.path = "/api" + event.path.slice(fnBase.length);
    if (event.path === "/api") event.path = "/api/";
  }
  return slsHandler(event, context);
};
