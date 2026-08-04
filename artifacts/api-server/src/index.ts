import app from "./app";
import { logger } from "./lib/logger";
import { ensureProductionAdmin, seedDatabase } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  logger.info({ port }, "Server listening");
  // Auto-seed only in development — never run in production to avoid
  // inserting predictable credentials into a live environment.
  if (process.env.NODE_ENV === "development") {
    seedDatabase().catch((err) => {
      logger.error({ err }, "Seed failed");
    });
  } else if (process.env.NODE_ENV === "production") {
    ensureProductionAdmin().catch((err) => {
      logger.error({ err }, "Production admin bootstrap failed");
    });
  }
});
