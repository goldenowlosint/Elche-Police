import { PubSub, Topic, Subscription, Message } from "@google-cloud/pubsub";
import { SentryError } from "./sentry";
import dotenv from "dotenv";

dotenv.config();

const credentials = {
  type: "service_account",
  project_id: "fresh-delight-435315-s6",
  private_key_id: "08089366c488c37110ef64e53292d596651f75f5",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCh7ImDEGUzYtZA\notR2C//EhWkTAt8JFkGCsdRPbxxEFzFIQgk/7gKthG7WhiUX1tFqGRMds5vHa+Xg\nAvwvkB5sutdVvg4hAMk7DYXNnUq6mVSSVodC+Pe1s7OXlsiwxr9DeHAb89WLgH8+\nHLfbUm0vvMqUuJ4g8RKGVrKDZ/jeGQp5bNv+AhhSm3s4cYFJWxcRFkkA9PHxM/0u\nOZQZcYy6UNz6fRMas9DmxNkI39E8s3gwjtPhAddjtn+m0vrCyzg4iVU/WnHMQJSn\n76dP27dfHA34thXzwx5WZersWs7YebPiUgMvNNtJlSL/DD691djXRiJPRVvXGmWs\nZgzpN40PAgMBAAECggEAIx19WteA4upxxVWqlqkWgANgnJdYUAusDFBNVyak7h1L\nejyb7enLWd7o/Ivd2nQjOQuUCjJru40qLnDnSNdLyc+hKD6NqNmXSj+t/z+3t4zN\n+uhZ8Au3CIgej+bKwg9v5g1l3qH78wNcVNd8hcsz05DxK9x3qnQtTMXbc8TmAx/5\nu9gzOy/WzdK6FEsnYvtFHJs/7KXl77QTLwhOIbpSMxeJRBpr26D9hNZfHLBE1hLF\nYYfexM+GHCKmrU1ZiEawo1L4R8iiVoNY3lgnEz0thZuru4MmG8zBUc9TIbQ2H9H3\nahx7fjsdOBQD4GBzzi0aYxmvWnI33tkhUYyWAufB8QKBgQDSNf//jUCQ0YvxNvMK\n29kn9I2Ra47gOjswV2PZcRXUeJOVw0p9heLx+gGmM4FbNJ8G2Uja/mvc0ArbvOwS\nVvNaOCzCaVlc4N4VzJoNkfVzAoCTJKsCfuO1HPiNIlKadqnMc8AgRNCpNVBnLE8h\nGxmAMLuiT9MtTfcCz/Fxh7nWkQKBgQDFMejSClYxsMik9f0qvyCl2T4XcB3NYhj/\ny0oIHCkIzzZ8UDs4zthltIDFIyzhuJSg0OEB/v64ywIzq7kWadcBD+eAK65rx/y6\nZJ1mKl11dUos0pq7JKFbQS3NTYrzONLPDQRcnKhGKND6doTOVYutBoubzCeYmZn5\n6w5i0DU5nwKBgQCl8n1TKBaVfOdmGIQLyX0IPtZXu7qCJ1Y8lnC74rtiDYItE4vF\nxiFf94a/xx9Sehsk0/ng8EMEgbRgvib7X2sjiP9ExtgGK3sHaIshNV24WnxYLPVX\ntgZbHzDUcgkV6aGoRqSglNLJEc6UdHVPZE5gVZh6zVugA1GCBdjMUGKUEQKBgQCD\nSaxZkzo50Rp1AbWxbRiectmtHx8oa6R7QWyjo6QKUnNTJtOXCdf3Nsr49WdfTNXf\nj9IO0yfh/n8TycPr0UGtWlpl8i8pYTe5HV3R9GjO1+0vlHQiHswzBl0pL/RP5Mgt\nw9vgkQhT1b700k2vVjMtWos+ihjet31VcBLe5QJavwKBgEP7OSf3JyGl5pd6RzHf\ndmWsBig/feWZPEPpDJiRYIsYiPFftthKd0UAGDA9C5E5JT5N88Iyg+0KAFrIk/TS\n3a6VH6irB7xksECcMJQnbyiSWs3pgxv8ZZ5Y4xt5P1qBhgs1uwQwzmRtBKNBvPI1\nvJKjJDQf1HRCg2G2zOmqdS96\n-----END PRIVATE KEY-----\n",
  client_email: "pub-206@fresh-delight-435315-s6.iam.gserviceaccount.com",
  client_id: "114955461309453397663",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/pub-206%40fresh-delight-435315-s6.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

// Initialize PubSub client
const pubSubClient = new PubSub({
  projectId: credentials.project_id, // Explicitly specify the Project ID
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
});

// Function to get a topic
const getTopic = (topicName: string) => {
  return pubSubClient.topic(topicName);
};

// Function to publish a message
export const publishMessage = async (
  topicName: string,
  data: object
): Promise<string | undefined> => {
  const dataBuffer = Buffer.from(JSON.stringify(data));
  const topic = getTopic(topicName);

  try {
    const messageId = await topic.publishMessage({ data: dataBuffer });
    return messageId;
  } catch (error: any) {
    console.log(
      `Error publishing message to topic ${topicName}: ${error.message}`
    );
    SentryError(
      `Error publishing message to topic ${topicName}: ${error.message}`
    );
    return undefined;
  }
};

// Function to create a subscription (to be run separately, not dynamically)
export const createSubscription = async (
  topicName: string,
  subscriptionName: string
): Promise<void> => {
  const topic = getTopic(topicName);
  try {
    await topic.createSubscription(subscriptionName);
    console.log(`Subscription ${subscriptionName} created.`);
  } catch (error: any) {
    if (error.code === 6) {
      // ALREADY_EXISTS
      console.log(`Subscription ${subscriptionName} already exists.`);
    } else {
      console.log(
        `Error creating subscription ${subscriptionName}: ${error.message}`
      );
      SentryError(
        `Error creating subscription ${subscriptionName}: ${error.message}`
      );
      throw error;
    }
  }
};

export const listenForMessages = (
  topicName: string,
  onMessage: (parsedMessage: any, originalMessage: Message) => void
) => {
  const topic = getTopic(topicName);
  const subscriptionName = `${topicName}-listener-${Date.now()}`;

  let subscription: Subscription;

  const createAndListen = async () => {
    try {
      [subscription] = await topic.createSubscription(subscriptionName);

      subscription.on("message", (message: Message) => {
        const parsedMessage = parseMessage(message);
        onMessage(parsedMessage, message);
        message.ack();
      });

      subscription.on("error", (error) => {
        console.log(`Error with subscription ${subscriptionName}: ${error}`);
        SentryError(`Error with subscription ${subscriptionName}: ${error}`);
      });
    } catch (error) {
      console.log(
        `Error creating subscription for topic ${topicName}: ${error}`
      );
      SentryError(
        `Error creating subscription for topic ${topicName}: ${error}`
      );
    }
  };

  createAndListen();

  // Return a function to close the subscription
  return () => {
    if (subscription) {
      subscription.close();
      console.log(`Closed subscription ${subscriptionName}`);
    }
  };
};

// Function to parse messages
export function parseMessage(message: Message): any {
  try {
    const messageString = message.data.toString("utf-8");
    return JSON.parse(messageString);
  } catch (error: any) {
    console.log("Error parsing message:", error);
    return null;
  }
}
