import { nanoid } from 'nanoid';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function createRandomToken() {
  return nanoid(32);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export async function notifyWhatsApp(userName, userEmail) {
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
    ].join('\n');
    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: notifyNumber,
        type: 'text',
        text: { body: message },
      }),
    });
  } catch (err) {
    console.error('WhatsApp notification error:', err);
  }
} 
