# ELX Police

## Setup

```bash
yarn install
```

Copy `.env.example` to `.env` and fill in the required values.

## Telegram

Telegram uses a session string stored in `.env`.

```bash
yarn telegram:init
```

This will ask for a verification code sent to your phone. Once authenticated, the session is saved to `TELEGRAM_SESSION` in `.env` automatically.

## WhatsApp

WhatsApp uses a browser session stored in `.wwebjs_auth/`.

```bash
yarn whatsapp:init
```

A QR code will appear in the terminal. Open WhatsApp on your phone > **Settings** > **Linked Devices** > **Link a Device** and scan it. The session is saved locally and reused on future starts.

**Note:** The `.wwebjs_auth/` folder must be deployed with the project so the server can connect without a QR scan.

## Running

```bash
yarn dev       # development with hot-reload
yarn start     # production
```

Both Telegram and WhatsApp connect automatically using their saved sessions.
