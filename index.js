require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const { Telegraf } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN;
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || "./data";
const MAX_HTML = Number(process.env.MAX_HTML_MB || 2) * 1024 * 1024;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing. Copy .env.example to .env and add your bot token.");
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.disable("x-powered-by");

// Basic security headers.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

function randomId() {
  return crypto.randomBytes(6).toString("base64url");
}

function safeHtml(html) {
  // Remove server-side/HTML document tags that could cause odd embedding behavior.
  // This does NOT make the page source secret.
  return html
    .replace(/<\\/?doctype[^>]*>/gi, "")
    .replace(/<\\/?html[^>]*>/gi, "")
    .replace(/<\\/?head[^>]*>/gi, "<head>")
    .replace(/<base[^>]*>/gi, "");
}

function savePage(id, html, ownerId) {
  const record = {
    id,
    ownerId,
    createdAt: new Date().toISOString(),
    html
  };
  fs.writeFileSync(
    path.join(DATA_DIR, `${id}.json`),
    JSON.stringify(record),
    "utf8"
  );
}

function loadPage(id) {
  if (!/^[A-Za-z0-9_-]{8,30}$/.test(id)) return null;
  const file = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

app.get("/", (req, res) => {
  res.type("text").send("HTML Link Bot is running.");
});

app.get("/p/:id", (req, res) => {
  const page = loadPage(req.params.id);
  if (!page) return res.status(404).send("Page not found.");
  res.setHeader("Content-Security-Policy",
    "default-src 'self' 'unsafe-inline' https: data:; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:;");
  res.type("html").send(safeHtml(page.html));
});

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    "👋 HTML Link Bot\\n\\n" +
    "একটি .html ফাইল আমাকে পাঠাও। আমি সেটার জন্য একটি shareable link তৈরি করে দেব।\\n\\n" +
    "Example: index.html → https://your-domain.com/p/AbCd1234"
  );
});

bot.help((ctx) => {
  ctx.reply(
    "HTML file upload করো।\\n" +
    "Bot HTML host করে একটি link দেবে।\\n\\n" +
    "Limit: " + process.env.MAX_HTML_MB + " MB"
  );
});

bot.on("document", async (ctx) => {
  try {
    const doc = ctx.message.document;
    const name = (doc.file_name || "").toLowerCase();

    if (!name.endsWith(".html") && !name.endsWith(".htm")) {
      return ctx.reply("❌ শুধু .html বা .htm ফাইল পাঠাও।");
    }

    if (doc.file_size && doc.file_size > MAX_HTML) {
      return ctx.reply(`❌ File too large. Maximum ${process.env.MAX_HTML_MB} MB.`);
    }

    const link = await ctx.telegram.getFileLink(doc.file_id);
    const response = await fetch(link.href);

    if (!response.ok) {
      return ctx.reply("❌ HTML file download করা যায়নি। আবার চেষ্টা করো।");
    }

    const html = await response.text();

    if (Buffer.byteLength(html, "utf8") > MAX_HTML) {
      return ctx.reply(`❌ HTML is larger than ${process.env.MAX_HTML_MB} MB.`);
    }

    const id = randomId();
    savePage(id, html, String(ctx.from.id));

    await ctx.reply(
      "✅ তোমার HTML live হয়েছে!\\n\\n" +
      `🔗 ${BASE_URL}/p/${id}\\n\\n` +
      "এই link share করতে পারো।"
    );
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Error হয়েছে। Server log দেখো এবং আবার চেষ্টা করো।");
  }
});

bot.catch((err) => console.error("Telegram bot error:", err));

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

bot.launch().then(() => {
  console.log("Telegram bot started");
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
