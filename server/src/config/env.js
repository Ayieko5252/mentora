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
  // On serverless platforms (Netlify Functions / AWS Lambda) the response body
  // is capped (~6 MB on Netlify). The full 100-recipe booklet PDF is ~11 MB, so
  // booklet downloads above this many recipes are declined there with a helpful
  // message; single-recipe and course PDFs stay well under the cap.
  isServerless: !!(process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME),
  maxBookletRecipesServerless: Number(process.env.MAX_BOOKLET_RECIPES_SERVERLESS || 20),
  // When no Stripe key is configured we fall back to a local mock so the
  // purchase flow is fully demonstrable without external credentials.
  get paymentsMockMode() {
    return !this.stripeSecretKey;
  },
};
