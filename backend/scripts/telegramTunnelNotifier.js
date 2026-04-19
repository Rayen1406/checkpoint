import "dotenv/config";
import os from "os";
import localtunnel from "localtunnel";

const botToken = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
const chatId = String(process.env.TELEGRAM_CHAT_ID || "").trim();
const subdomain = String(process.env.PUBLIC_SUBDOMAIN || "").trim();
const port = Number(process.env.PUBLIC_PORT || process.env.PORT || 4000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendTelegramMessage(text) {
  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Telegram API request failed: ${response.status} ${body}`);
  }
}

async function openTunnel() {
  const options = { port };
  if (subdomain) {
    options.subdomain = subdomain;
  }

  return localtunnel(options);
}

async function run() {
  if (!botToken || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables.");
    process.exit(1);
  }

  if (!Number.isFinite(port) || port <= 0) {
    console.error("PUBLIC_PORT must be a valid positive number.");
    process.exit(1);
  }

  const machine = os.hostname();
  console.log(`Tunnel notifier started for ${machine} on port ${port}`);

  while (true) {
    let tunnel;

    try {
      tunnel = await openTunnel();
      const publicUrl = String(tunnel.url || "").trim();

      if (!publicUrl) {
        throw new Error("Tunnel started but did not return a URL.");
      }

      const startedAt = new Date().toISOString();
      const message = [
        "Checkpoint app is online.",
        `URL: ${publicUrl}`,
        `PC: ${machine}`,
        `Started: ${startedAt}`,
      ].join("\n");

      await sendTelegramMessage(message);
      console.log(`Telegram message sent with URL: ${publicUrl}`);

      await new Promise((resolve) => {
        tunnel.once("close", resolve);
      });

      console.warn("Tunnel closed. Retrying in 5 seconds...");
    } catch (error) {
      console.error(`Tunnel notifier error: ${error.message}`);
      if (tunnel) {
        try {
          tunnel.close();
        } catch {
          // No-op
        }
      }
      await sleep(5000);
    }
  }
}

run().catch((error) => {
  console.error(`Notifier crashed: ${error.message}`);
  process.exit(1);
});
