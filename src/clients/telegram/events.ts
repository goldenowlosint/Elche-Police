import { TelegramClient } from "telegram";
import { NewMessage, type NewMessageEvent } from "telegram/events";

export type MessageHandler = (event: NewMessageEvent) => void | Promise<void>;

const getEntityName = (entity: Record<string, any> | undefined): string => {
  if (!entity) return "Unknown";
  if (entity.title) return entity.title;
  if (entity.firstName) {
    return `${entity.firstName} ${entity.lastName ?? ""}`.trim();
  }
  return "Unknown";
};

const defaultMessageHandler: MessageHandler = async (event) => {
  const message = event.message;

  try {
    const sender = await message.getSender();
    const chat = await message.getChat();

    const senderName = getEntityName(sender as Record<string, any>);
    const chatName = getEntityName(chat as Record<string, any>);
    const text = message.text ?? "[non-text message]";
    const date = new Date(message.date * 1000).toISOString();

    console.log(
      `[Telegram] ${date} | ${chatName} | ${senderName}: ${text.slice(0, 300)}`
    );
  } catch {
    console.log(
      `[Telegram] New message: ${message.text?.slice(0, 300) ?? "[non-text]"}`
    );
  }
};

/**
 * Registers a handler that fires for every incoming message
 * across all chats, groups, and channels.
 * Pass a custom handler or omit to use the built-in logger.
 */
export const registerMessageListener = (
  client: TelegramClient,
  handler: MessageHandler = defaultMessageHandler
): void => {
  client.addEventHandler(async (event: NewMessageEvent) => {
    try {
      await handler(event);
    } catch (error) {
      console.error("[Telegram] Error in message handler:", error);
    }
  }, new NewMessage({}));
};
