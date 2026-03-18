import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import type WAWebJS from "whatsapp-web.js";
import type { WhatsAppConfig } from "./config";

let activeClient: WAWebJS.Client | null = null;

export const createClient = (config: WhatsAppConfig): WAWebJS.Client => {
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: config.sessionDataPath,
    }),
    puppeteer: {
      headless: config.puppeteerHeadless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
  });

  activeClient = client;
  return client;
};

export const getClient = (): WAWebJS.Client | null => activeClient;

export const disconnect = async (): Promise<void> => {
  if (activeClient) {
    try {
      await activeClient.destroy();
    } catch {
      // already disconnected
    }
    activeClient = null;
  }
};
