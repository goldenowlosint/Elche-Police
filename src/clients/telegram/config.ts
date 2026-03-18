import "dotenv/config";

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  phoneNumber: string;
  sessionString: string;
}

export const getTelegramConfig = (): TelegramConfig => ({
  apiId: Number(process.env.TELEGRAM_App_API_ID),
  apiHash: process.env.TELEGRAM_App_API_HASH ?? "",
  phoneNumber: process.env.TELEGRAM_PHONE_NUMBER ?? "",
  sessionString: process.env.TELEGRAM_SESSION ?? "",
});

export const validateConfig = (
  config: TelegramConfig
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.apiId || isNaN(config.apiId))
    errors.push("TELEGRAM_App_API_ID is missing or invalid");
  if (!config.apiHash)
    errors.push("TELEGRAM_App_API_HASH is missing");
  if (!config.phoneNumber)
    errors.push("TELEGRAM_PHONE_NUMBER is missing");

  return { valid: errors.length === 0, errors };
};
