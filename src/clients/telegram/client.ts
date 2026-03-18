import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import type { TelegramConfig } from "./config";

let activeClient: TelegramClient | null = null;

export const createClient = (config: TelegramConfig): TelegramClient => {
  const session = new StringSession(config.sessionString);

  const client = new TelegramClient(session, config.apiId, config.apiHash, {
    connectionRetries: 5,
    deviceModel: "ELX-Police",
    appVersion: "1.0.0",
    systemVersion: "Node",
    langCode: "en",
    useWSS: false,
  });

  activeClient = client;
  return client;
};

export const connect = async (client: TelegramClient): Promise<void> => {
  if (!client.connected) {
    await client.connect();
  }
};

export const disconnect = async (): Promise<void> => {
  if (activeClient?.connected) {
    await activeClient.disconnect();
    activeClient = null;
  }
};

export const getClient = (): TelegramClient | null => activeClient;
