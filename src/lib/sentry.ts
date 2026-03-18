import * as Sentry from "@sentry/node";
import dotenv from "dotenv";

dotenv.config();

Sentry.init({
  dsn: "https://d221aa02b54417e26ac62ce9e3f744b9@o4507975072743424.ingest.de.sentry.io/4508777277227088",
  tracesSampleRate: 1.0,
});
/**
 * Logs informational messages to Sentry.
 * @param message - The information to log.
 * @param extraData - Optional extra data to include with the log.
 */
export const SentryInfo = (
  message: string,
  extraData?: Record<string, any>
): void => {
  Sentry.captureMessage(message, {
    level: "info",
    extra: extraData,
  });
};

/**
 * Logs warning messages to Sentry.
 * @param message - The warning message to log.
 * @param extraData - Optional extra data to include with the warning log.
 */
export const SentryWarning = (
  message: string,
  extraData?: Record<string, any>
): void => {
  Sentry.captureMessage(message, {
    level: "warning",
    extra: extraData,
  });
};

/**
 * Logs error messages to Sentry.
 * @param error - The error object or message to log.
 * @param extraData - Optional extra data to include with the error log.
 */
export const SentryError = (
  error: Error | string,
  extraData?: Record<string, any>
): void => {
  if (typeof error === "string") {
    Sentry.captureMessage(error, {
      level: "error",
      extra: extraData,
    });
    console.error(`Error logged: ${error}`, extraData || "");
  } else {
    Sentry.captureException(error, {
      extra: extraData,
    });
  }
};
