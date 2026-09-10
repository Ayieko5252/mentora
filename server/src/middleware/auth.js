import { verifyToken } from "../lib/jwt.js";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../lib/prisma.js";

// Populates req.user from a Bearer token. Throws 401 if missing/invalid.
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw ApiError.unauthorized();
    }
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw ApiError.unauthorized();
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Invalid or expired token"));
    }
    next(err);
  }
}

// Role gate. Usage: requireRole("ADMIN", "INSTRUCTOR")
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("Insufficient role"));
    }
    next();
  };
}
