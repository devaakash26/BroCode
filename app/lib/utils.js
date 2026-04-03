import { nanoid } from "nanoid";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function createRandomToken() {
  return nanoid(32);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export async function notifyWhatsApp(userName, userEmail) {
  await Promise.all([
    _sendWhatsAppNotification(userName, userEmail),
    _sendSlackNotification(userName, userEmail),
  ]);
}

async function _sendWhatsAppNotification(userName, userEmail) {
  try {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const notifyNumber = process.env.WHATSAPP_NOTIFY_NUMBER;
    if (!token || !phoneId || !notifyNumber) return;
    const message = [
      `🚀 *New BroCode Member!*`,
      ``,
      `👤 *Name:* ${userName}`,
      `📧 *Email:* ${userEmail}`,
      ``,
      `💡 _A new coder just joined the community!_`,
      ``,
      `━━━━━━━━━━━━━━━`,
      `🔗 *BroCode* | brocode-ai.vercel.app`,
    ].join("\n");

    const res = await fetch(
      `https://graph.facebook.com/v22.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: notifyNumber,
          type: "text",
          text: { body: message },
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("WhatsApp API error:", JSON.stringify(data, null, 2));
    } else {
      console.log("WhatsApp notification sent successfully");
    }
  } catch (err) {
    console.error("WhatsApp notification error:", err);
  }
}

async function _sendSlackNotification(userName, userEmail) {
  try {
    const token = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_CHANNEL_ID;
    if (!token || !channelId) return;

    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚀 New BroCode Member!",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Name:*\n${userName}` },
              { type: "mrkdwn", text: `*Email:*\n${userEmail}` },
            ],
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "💡 A new coder just joined the community! · <https://brocode-ai.vercel.app|BroCode>",
              },
            ],
          },
        ],
        text: `New member joined: ${userName} (${userEmail})`,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error("Slack API error:", data.error);
    } else {
      console.log("Slack notification sent successfully");
    }
  } catch (err) {
    console.error("Slack notification error:", err);
  }
}
