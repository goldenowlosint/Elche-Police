/**
 * Standalone script for first-time WhatsApp authentication.
 * Run with: yarn whatsapp:init
 *
 * Displays a QR code in the terminal — scan it with your phone.
 * Once authenticated the session is persisted locally by LocalAuth,
 * so subsequent starts reconnect automatically.
 */
import "dotenv/config";
import qrcode from "qrcode-terminal";
import { getWhatsAppConfig } from "./config";
import { createClient } from "./client";

const initSession = async (): Promise<void> => {
  const config = getWhatsAppConfig();

  console.log("[WhatsApp] Initializing session...");
  console.log(`[WhatsApp] Session data path: ${config.sessionDataPath}`);
  console.log("[WhatsApp] Waiting for QR code...\n");

  const client = createClient(config);

  client.on("qr", (qr: string) => {
    console.log("[WhatsApp] Scan this QR code with your phone:\n");
    qrcode.generate(qr, { small: true });
    console.log("\nOpen WhatsApp > Settings > Linked Devices > Link a Device");
  });

  client.on("authenticated", () => {
    console.log("\n[WhatsApp] Authenticated successfully!");
  });

  client.on("auth_failure", (message: string) => {
    console.error("[WhatsApp] Authentication failed:", message);
    process.exit(1);
  });

  client.on("ready", async () => {
    console.log("[WhatsApp] Client is ready!");
    console.log(
      "[WhatsApp] Session saved — future starts will connect automatically."
    );
    console.log("[WhatsApp] You can now run: yarn dev\n");

    await client.destroy();
    process.exit(0);
  });

  client.on("disconnected", (reason: string) => {
    console.log("[WhatsApp] Disconnected:", reason);
    process.exit(1);
  });

  await client.initialize();
};

initSession().catch((e) => {
  console.error("[WhatsApp] Fatal error:", e);
  process.exit(1);
});
