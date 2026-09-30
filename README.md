# HTML Link Bot

Telegram bot that accepts an `.html`/`.htm` document and returns a public URL.

## 1. Create the Telegram bot

Open Telegram and talk to `@BotFather`.
Use `/newbot`, create a bot, and copy the token.

## 2. Install

```bash
npm install
```

## 3. Configure

Copy `.env.example` to `.env` and edit:

```env
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
BASE_URL=https://your-domain.com
PORT=3000
DATA_DIR=./data
MAX_HTML_MB=2
```

`BASE_URL` must be the public HTTPS URL of your server.

## 4. Run

```bash
npm start
```

Open the bot in Telegram and upload an HTML file.

## Important security note

A web browser must receive the HTML/CSS/JS needed to display a webpage. Therefore, no normal hosting system can make the client-side source completely impossible to inspect.

This project does NOT promise source-code secrecy. Do not put passwords, API keys, bot tokens, database credentials, or other secrets inside uploaded HTML/JavaScript.

For stronger protection, keep sensitive logic on the server and expose only a safe API.

## Production recommendations

- Use HTTPS.
- Put Nginx/Caddy in front of Node.js.
- Add authentication or private links if pages should not be public.
- Add an expiry/cleanup job for old pages.
- Consider a database/object storage instead of local JSON files for large deployments.
