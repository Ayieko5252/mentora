import { ApiError } from "../utils/ApiError.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details,
    });
  }

  // Prisma unique-constraint violation
  if (err.code === "P2002") {
    return res.status(409).json({ error: "Resource already exists" });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Not found" });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error" });
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Route not found" });
}
