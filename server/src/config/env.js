import dotenv from "dotenv";
dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  databaseUrl: required("DATABASE_URL", "postgresql://mentora:mentora@localhost:5432/mentora"),
  jwtSecret: required("JWT_SECRET", "dev-only-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  // When no Stripe key is configured we fall back to a local mock so the
  // purchase flow is fully demonstrable without external credentials.
  get paymentsMockMode() {
    return !this.stripeSecretKey;
  },
};
