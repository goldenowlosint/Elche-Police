import Pusher from "pusher";
import dotenv from "dotenv";
import { handleError } from "./errorHandler";

dotenv.config();

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

const sanitizeUserId = (userId: string): string => {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
};

interface PusherEventData {
  collector_id: string;
  message: string;
  type: "success" | "error" | "info" | "warning" | "done";
  tag?: string;
  error_log?: any; // Changed to 'any' to handle various types
}

export const triggerPusherEvent = async (
  data: PusherEventData
): Promise<void> => {
  const { collector_id, message, type, tag } = data;
  const sanitizedUserId = sanitizeUserId(collector_id);
  const channelName = `${sanitizedUserId}`;

  try {
    await Promise.all([
      pusher.trigger(channelName, "update", {
        data: {
          collector_id,
          message,
          type,
        },
      }),
    ]);

    console.log(`Event: ${message} ⭐`);
  } catch (error) {
    handleError(error as Error);
  }
};
