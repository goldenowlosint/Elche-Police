/**
 * Standalone script for first-time Telegram authentication.
 * Run with: yarn telegram:init
 *
 * Walks through interactive login, then persists the session
 * string to .env so subsequent starts are automatic.
 */
import "dotenv/config";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from "input";
import { getTelegramConfig, validateConfig } from "./config";
import { saveSessionToEnv } from "./session";

const initSession = async (): Promise<void> => {
  const config = getTelegramConfig();
  const { valid, errors } = validateConfig(config);

  if (!valid) {
    console.error("Configuration errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log("Initializing Telegram session...");
  console.log(`  Phone : ${config.phoneNumber}`);
  console.log(`  API ID: ${config.apiId}\n`);

  const client = new TelegramClient(
    new StringSession(""),
    config.apiId,
    config.apiHash,
    {
      connectionRetries: 5,
      deviceModel: "ELX-Police",
      appVersion: "1.0.0",
      systemVersion: "Node",
      langCode: "en",
      useWSS: false,
    }
  );

  try {
    await client.start({
      phoneNumber: async () => config.phoneNumber,
      phoneCode: async () => await input.text("Enter the verification code: "),
      password: async () =>
        await input.text("Enter 2FA password (or press Enter to skip): "),
      onError: (e) => console.error("Login error:", e),
    });

    const sessionString = client.session.save() as unknown as string;
    saveSessionToEnv(sessionString);

    console.log("\nAuthentication successful!");
    console.log("Session saved to .env — future starts will connect automatically.");

    await client.disconnect();
    console.log("Disconnected. You can now run: yarn dev\n");
  } catch (error: any) {
    console.error("\nFailed to authenticate:", error.message);

    if (error.errorMessage === "AUTH_KEY_DUPLICATED") {
      console.log("\nThis usually means the same session is active elsewhere.");
      console.log("Log out from other devices/sessions and try again.");
    }

    await client.disconnect();
    process.exit(1);
  }
};

initSession().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
