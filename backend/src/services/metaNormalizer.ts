import { WebhookPayload } from '../validations/webhook.js';
import { logger } from '../utils/logger.js';

const SUPPORTED_TYPES = new Set([
  'text',
  'image',
  'audio',
  'video',
  'document',
  'sticker',
  'location',
  'contacts',
  'interactive',
  'voice',
]);

export function normalizeMetaPayload(channel: string, body: any): WebhookPayload | null {
  if (channel === 'whatsapp') {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (!message) return null;

    const messageType = SUPPORTED_TYPES.has(message.type) ? message.type : 'text';
    if (message.type !== messageType) {
      logger.warn({ context: 'metaNormalizer', originalType: message.type }, 'Unsupported WhatsApp type, defaulting to text');
    }

    return {
      business_id: value.metadata?.phone_number_id || 'default',
      user_id: message.from,
      message: message.text?.body || message.type || '',
      type: messageType as WebhookPayload['type'],
      name: contact?.profile?.name,
      message_id: message.id,
    };
  }

  if (channel === 'instagram' || channel === 'facebook') {
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging?.message) return null;

    return {
      business_id: entry?.id || 'default',
      user_id: messaging.sender?.id,
      message: messaging.message?.text || '',
      type: 'text',
      name: messaging.sender?.id,
      message_id: messaging.message?.mid,
    };
  }

  if (channel === 'tiktok') {
    // Supports a few common TikTok webhook shapes.
    const msg = body?.message || body?.event?.message || body?.data?.message || {};
    const sender = body?.sender || body?.event?.sender || body?.data?.sender || {};
    const business = body?.business || body?.event?.business || body?.data?.business || {};
    const messageText =
      msg?.text ||
      msg?.content?.text ||
      msg?.content ||
      body?.text ||
      body?.message ||
      '';

    const userId = sender?.id || sender?.user_id || body?.user_id;
    const businessId = business?.id || business?.business_id || body?.business_id;
    const messageId = msg?.id || msg?.message_id || body?.message_id;
    const name = sender?.name || sender?.display_name || body?.name;

    if (!userId || !businessId || !messageText) return null;

    return {
      business_id: String(businessId),
      user_id: String(userId),
      message: String(messageText),
      type: 'text',
      name: name ? String(name) : undefined,
      message_id: messageId ? String(messageId) : undefined,
    };
  }

  if (body.business_id && body.user_id && body.message) {
    return body as WebhookPayload;
  }

  return null;
}
