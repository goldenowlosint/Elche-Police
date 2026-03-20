import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { SentryError } from "./lib/sentry";
import {
  startTelegram,
  disconnect as disconnectTelegram,
} from "./clients/telegram";
import { startFacebookMonitoring } from "./clients/facebook/groups";
import { startTwitterMonitoring } from "./clients/twitter";

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
    // startFacebookMonitoring();

    // Start Twitter monitoring (runs immediately + twice daily at 06:00 and 18:00)
    startTwitterMonitoring();
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
