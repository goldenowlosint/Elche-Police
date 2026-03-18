import fs from "node:fs";
import path from "node:path";

const ENV_PATH = path.resolve(process.cwd(), ".env");

export const loadSession = (): string => {
  return process.env.TELEGRAM_SESSION ?? "";
};

export const hasSession = (): boolean => {
  const session = loadSession();
  return session.length > 0;
};

/**
 * Persists the session string into the .env file so future
 * restarts skip interactive authentication.
 */
export const saveSessionToEnv = (sessionString: string): void => {
  let content = fs.readFileSync(ENV_PATH, "utf-8");
  const line = `TELEGRAM_SESSION="${sessionString}"`;

  if (/^TELEGRAM_SESSION=.*/m.test(content)) {
    content = content.replace(/^TELEGRAM_SESSION=.*/m, line);
  } else {
    content = content.trimEnd() + "\n" + line + "\n";
  }

  fs.writeFileSync(ENV_PATH, content, "utf-8");

  // Also update the in-memory env so the running process picks it up
  process.env.TELEGRAM_SESSION = sessionString;
};
