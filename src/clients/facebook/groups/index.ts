import cron from "node-cron";
import { runFacebookMonitoring } from "./monitor.js";

// Run daily at 06:00 AM (server local time)
const DAILY_SCHEDULE = "0 6 * * *";

export const startFacebookMonitoring = (): void => {
  // Immediate scan on server startup
  console.log("[Facebook Cron] Running initial scan on startup…");
  runFacebookMonitoring().catch((error) => {
    console.error("[Facebook Cron] Initial scan failed:", error);
  });

  // Scheduled daily scan
  cron.schedule(DAILY_SCHEDULE, () => {
    console.log("[Facebook Cron] Running scheduled daily scan…");
    runFacebookMonitoring().catch((error) => {
      console.error("[Facebook Cron] Scheduled scan failed:", error);
    });
  });

  console.log(
    `[Facebook Cron] Daily monitoring scheduled (${DAILY_SCHEDULE})`,
  );
};

export { FACEBOOK_GROUPS } from "./groups.js";
export { runFacebookMonitoring } from "./monitor.js";
export { createScan, persistGroupAnomalies, updateScanTotals } from "./storage.js";
export type { FacebookGroup } from "./groups.js";
export type { FacebookPost } from "./scraper.js";
export type { AnomalyResult } from "./validate.js";
export type { FlaggedPost, MonitoringReport } from "./monitor.js";
