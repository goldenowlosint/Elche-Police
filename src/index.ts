import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { SentryError } from "./lib/sentry";
import {
  startTelegram,
  disconnect as disconnectTelegram,
} from "./clients/telegram";
import { startFacebookMonitoring } from "./clients/facebook/groups";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

const startServer = async () => {
  try {
    const port = 3094;
    console.log(`Server is running on port ${port}`);

    serve({
      fetch: app.fetch,
      port,
    });

    await startTelegram();

    // Start Facebook group monitoring (runs immediately + daily cron)
    startFacebookMonitoring();
  } catch (error: any) {
    console.error("Failed to start server:", error);
    SentryError(error);
  }
};

const shutdown = async () => {
  console.log("\nShutting down...");
  await disconnectTelegram();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
