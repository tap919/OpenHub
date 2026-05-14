import { createHmac } from 'crypto';
import { getDb } from '../auth/db.js';

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  secret: string | null;
  events: string[];
  active: boolean;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

export async function fireWebhook(userId: string, event: string, data: Record<string, any>): Promise<void> {
  const db = getDb();
  const webhooks = db.prepare(
    "SELECT * FROM webhooks WHERE user_id = ? AND active = 1 AND (events = '[]' OR events LIKE ?)"
  ).all(userId, `%${event}%`) as Webhook[];

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  for (const hook of webhooks) {
    const eventsStr = (hook as any).events || '[]';
    const allowedEvents = typeof eventsStr === 'string' ? JSON.parse(eventsStr) : eventsStr;

    // Skip if event not in allowed list (when events is not ['*'])
    if (allowedEvents.length > 0 && !allowedEvents.includes('*')) {
      if (!allowedEvents.includes(event)) continue;
    }

    sendWebhook(hook, payload).catch((err) => {
      console.warn(`[Webhook] Failed to send to ${hook.url}:`, err.message);
    });
  }
}

async function sendWebhook(hook: Webhook, payload: WebhookPayload): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = hook.secret
    ? createHmac('sha256', hook.secret).update(body).digest('hex')
    : undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'OpenHub-Webhook/1.0',
    'X-Webhook-Event': payload.event,
  };

  if (signature) {
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  const res = await fetch(hook.url, {
    method: 'POST',
    headers,
    body,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
}
