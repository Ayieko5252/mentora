import { PrismaClient } from "@prisma/client";

// Single shared Prisma client, cached on the container global. This reuses the
// instance across dev --watch reloads AND across warm serverless invocations
// (Netlify Functions), avoiding connection-pool exhaustion.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__mentoraPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.__mentoraPrisma = prisma;
