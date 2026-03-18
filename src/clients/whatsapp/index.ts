import { getWhatsAppConfig } from "./config";
import { hasSession } from "./session";
import { createClient, disconnect, getClient } from "./client";
import { registerMessageListener, type MessageHandler } from "./events";

export { getClient, disconnect } from "./client";
export { hasSession, clearSession } from "./session";
export type { MessageHandler } from "./events";
export type { WhatsAppConfig } from "./config";

export interface StartWhatsAppOptions {
  onMessage?: MessageHandler;
}

export const startWhatsApp = async (
  options: StartWhatsAppOptions = {}
): Promise<void> => {
  if (!hasSession()) {
    console.error(
      "[WhatsApp] No session found. Run `yarn whatsapp:init` to authenticate first."
    );
    return;
  }

  console.log("[WhatsApp] Starting client...");

  const config = getWhatsAppConfig();
  const client = createClient(config);

  return new Promise<void>((resolve, reject) => {
    client.on("qr", () => {
      console.warn(
        "[WhatsApp] Session expired — run `yarn whatsapp:init` to re-authenticate."
      );
    });

    client.on("authenticated", () => {
      console.log("[WhatsApp] Authenticated");
    });

    client.on("auth_failure", (message: string) => {
      console.error("[WhatsApp] Auth failure:", message);
      reject(new Error(`WhatsApp auth failure: ${message}`));
    });

    client.on("ready", () => {
      console.log("[WhatsApp] Connected successfully");
      registerMessageListener(client, options.onMessage);
      console.log(
        "[WhatsApp] Listening for messages on all chats and groups"
      );
      resolve();
    });

    client.on("disconnected", (reason: string) => {
      console.log("[WhatsApp] Disconnected:", reason);
    });

    client.initialize().catch(reject);
  });
};
