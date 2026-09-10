// Netlify Function entry. Lives under server/ so Node resolves the API's
// dependencies (@prisma/client, pdfkit, express, …) from server/node_modules.
// The netlify.toml redirect sends /api/* here; static assets (the SPA and the
// food images) are served directly from the publish directory.
export { handler } from "../src/netlify-handler.js";
