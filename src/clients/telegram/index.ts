import { getTelegramConfig, validateConfig } from "./config";
import { hasSession } from "./session";
import { createClient, connect, disconnect, getClient } from "./client";
import { registerMessageListener, type MessageHandler } from "./events";

export { getClient, disconnect } from "./client";
export { saveSessionToEnv, hasSession } from "./session";
export type { MessageHandler } from "./events";
export type { TelegramConfig } from "./config";

export interface StartTelegramOptions {
  onMessage?: MessageHandler;
}

export const startTelegram = async (
  options: StartTelegramOptions = {}
): Promise<void> => {
  const config = getTelegramConfig();
  const { valid, errors } = validateConfig(config);

  if (!valid) {
    console.error("[Telegram] Configuration errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
    return;
  }

  if (!hasSession()) {
    console.error(
      "[Telegram] No session found. Run `yarn telegram:init` to authenticate first."
    );
    return;
  }

  console.log("[Telegram] Starting client...");

  const client = createClient(config);

  try {
    await connect(client);
    console.log("[Telegram] Connected successfully");

    registerMessageListener(client, options.onMessage);
    console.log("[Telegram] Listening for messages on all chats and groups");
  } catch (error) {
    console.error("[Telegram] Failed to connect:", error);
    await disconnect();
  }
};
