import fs from "node:fs";
import path from "node:path";

const DEFAULT_AUTH_DIR = ".wwebjs_auth";

const getAuthDir = (): string =>
  process.env.WHATSAPP_SESSION_DATA_PATH ?? DEFAULT_AUTH_DIR;

/**
 * Checks whether a persisted WhatsApp session exists on disk.
 * The LocalAuth strategy stores session data inside sessionDataPath.
 */
export const hasSession = (): boolean => {
  const authDir = path.resolve(process.cwd(), getAuthDir());
  return fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0;
};

export const clearSession = (): void => {
  const authDir = path.resolve(process.cwd(), getAuthDir());
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
    console.log("[WhatsApp] Session data cleared.");
  }
};
