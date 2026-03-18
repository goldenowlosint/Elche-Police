import type WAWebJS from "whatsapp-web.js";

export type MessageHandler = (message: WAWebJS.Message) => void | Promise<void>;

const defaultMessageHandler: MessageHandler = async (message) => {
  try {
    const contact = await message.getContact();
    const chat = await message.getChat();

    const senderName = contact.pushname ?? contact.number ?? "Unknown";
    const chatName = chat.name ?? chat.id._serialized;
    const text = message.body || "[non-text message]";
    const date = new Date(message.timestamp * 1000).toISOString();

    console.log(
      `[WhatsApp] ${date} | ${chatName} | ${senderName}: ${text.slice(0, 300)}`
    );
  } catch {
    console.log(
      `[WhatsApp] New message: ${message.body?.slice(0, 300) ?? "[non-text]"}`
    );
  }
};

/**
 * Registers a handler that fires for every incoming message.
 * Pass a custom handler or omit to use the built-in logger.
 */
export const registerMessageListener = (
  client: WAWebJS.Client,
  handler: MessageHandler = defaultMessageHandler
): void => {
  client.on("message", async (message: WAWebJS.Message) => {
    try {
      await handler(message);
    } catch (error) {
      console.error("[WhatsApp] Error in message handler:", error);
    }
  });
};
