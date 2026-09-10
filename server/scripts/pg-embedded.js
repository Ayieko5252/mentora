// Dev-only: run a real PostgreSQL server from an embedded binary (no Docker).
// Starts on localhost:5432 with user/pass/db = mentora, matching .env.example.
// Handy when you can't run Docker. NOT for production.
import EmbeddedPostgres from "embedded-postgres";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pg = new EmbeddedPostgres({
  databaseDir: path.join(__dirname, "..", ".pgdata"),
  user: "mentora",
  password: "mentora",
  port: 5432,
  persistent: true,
  // Force a UTF-8 cluster. Without this the cluster inherits the Windows
  // locale (e.g. WIN1252) and rejects characters like the Unicode minus sign
  // found in real course content. Matches production Postgres defaults.
  initdbFlags: ["--encoding=UTF8", "--no-locale"],
});

async function main() {
  const fs = await import("fs");
  const dataDir = path.join(__dirname, "..", ".pgdata");
  if (!fs.existsSync(dataDir)) {
    console.log("Initialising embedded Postgres data dir...");
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("mentora");
    console.log("Created database 'mentora'.");
  } catch {
    console.log("Database 'mentora' already exists.");
  }
  console.log("Embedded Postgres ready on postgresql://mentora:mentora@localhost:5432/mentora");

  const shutdown = async () => {
    console.log("\nStopping embedded Postgres...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error("Embedded Postgres failed:", e);
  process.exit(1);
});
