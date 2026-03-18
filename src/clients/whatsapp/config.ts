import "dotenv/config";

export interface WhatsAppConfig {
  sessionDataPath: string;
  puppeteerHeadless: boolean;
}

export const getWhatsAppConfig = (): WhatsAppConfig => ({
  sessionDataPath:
    process.env.WHATSAPP_SESSION_DATA_PATH ?? "./.wwebjs_auth",
  puppeteerHeadless: process.env.WHATSAPP_HEADLESS !== "false",
});
