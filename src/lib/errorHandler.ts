import * as Sentry from "@sentry/node";

export function handleError(
  error: Error,
  context?: Record<string, any>,
  additionalNote?: string
): null {
  console.error("Sentry captured an error:", error);

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    if (additionalNote) {
      scope.setExtra("additionalNote", additionalNote);
    }

    Sentry.captureException(error);
  });

  return null;
}
