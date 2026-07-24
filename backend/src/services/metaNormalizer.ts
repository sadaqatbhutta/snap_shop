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

export type NormalizedInbound = WebhookPayload & {
  mediaId?: string;
  mediaUrl?: string;
  mimeType?: string;
};

export function normalizeMetaPayload(channel: string, body: any): NormalizedInbound | null {
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

    const mediaNode = message.image || message.audio || message.video || message.document || message.sticker || message.voice;
    const caption =
      message.text?.body ||
      message.image?.caption ||
      message.video?.caption ||
      message.document?.caption ||
      '';

    return {
      business_id: value.metadata?.phone_number_id || 'default',
      user_id: message.from,
      message: caption || message.type || '',
      type: messageType as WebhookPayload['type'],
      name: contact?.profile?.name,
      message_id: message.id,
      mediaId: mediaNode?.id,
      mimeType: mediaNode?.mime_type,
    };
  }

  if (channel === 'instagram' || channel === 'facebook') {
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging?.message) return null;

    const attachments = messaging.message?.attachments || [];
    const first = attachments[0];
    const attachmentType = first?.type;
    const mappedType =
      attachmentType === 'image' || attachmentType === 'audio' || attachmentType === 'video' || attachmentType === 'file'
        ? attachmentType === 'file'
          ? 'document'
          : attachmentType
        : 'text';

    return {
      business_id: entry?.id || 'default',
      user_id: messaging.sender?.id,
      message: messaging.message?.text || first?.payload?.title || mappedType,
      type: mappedType as WebhookPayload['type'],
      name: messaging.sender?.id,
      message_id: messaging.message?.mid,
      mediaUrl: first?.payload?.url,
    };
  }

  if (channel === 'tiktok') {
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
    return body as NormalizedInbound;
  }

  return null;
}
