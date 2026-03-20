import cron from "node-cron";
import { runTwitterMonitoring } from "./monitor.js";

// Run twice daily: 6:00 AM and 6:00 PM (server local time)
const TWICE_DAILY_SCHEDULE = "0 6,18 * * *";

export const startTwitterMonitoring = (): void => {
  console.log("[Twitter Cron] Running initial scan on startup…");
  runTwitterMonitoring().catch((error) => {
    console.error("[Twitter Cron] Initial scan failed:", error);
  });

  cron.schedule(TWICE_DAILY_SCHEDULE, () => {
    console.log("[Twitter Cron] Running scheduled scan…");
    runTwitterMonitoring().catch((error) => {
      console.error("[Twitter Cron] Scheduled scan failed:", error);
    });
  });

  console.log(
    `[Twitter Cron] Monitoring scheduled (${TWICE_DAILY_SCHEDULE}) — runs at 06:00 and 18:00`,
  );
};

export { runTwitterMonitoring } from "./monitor.js";
export type { FlaggedTweet, TwitterMonitoringReport } from "./monitor.js";
export type { TweetAnomalyResult } from "./validate.js";
