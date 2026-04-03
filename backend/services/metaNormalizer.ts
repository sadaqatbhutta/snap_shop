import { WebhookPayload } from '../schemas/webhook';
import { log } from '../core/logger';
import { MessageType } from '../../shared/types';

const SUPPORTED_TYPES = [
  'text', 'image', 'audio', 'video', 
  'document', 'sticker', 'location', 
  'contacts', 'interactive'
];

/**
 * Normalizes Meta (WhatsApp/Instagram) webhook payloads into our standard internal schema.
 */
export function normalizeMetaPayload(channel: string, body: any): WebhookPayload | null {
  // WhatsApp Integration
  if (channel === 'whatsapp') {
    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;
    
    // Check if it's a message event
    if (!value?.messages?.[0]) return null;

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    // Identify and map incoming Meta type
    let internalType = message.type as MessageType;
    if (!SUPPORTED_TYPES.includes(internalType as string)) {
      log({ 
        timestamp: new Date().toISOString(), 
        level: 'warn', 
        context: 'meta_normalizer', 
        message: `Unrecognized WhatsApp message type: ${message.type}. Defaulting to 'text'.` 
      });
      internalType = 'text';
    }

    return {
      business_id: value.metadata?.phone_number_id || 'default', 
      user_id:     message.from,
      message:     message.text?.body || '',
      type:        internalType,
      name:        contact?.profile?.name,
      message_id:  message.id,
    };
  }

  // Instagram or Facebook Integration (identical messaging format)
  if (channel === 'instagram' || channel === 'facebook') {
    const entry     = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging?.message) return null;

    return {
      business_id: entry?.id || 'default', // Meta generic ID for the IG/FB page
      user_id:     messaging.sender?.id,
      message:     messaging.message?.text || '',
      type:        'text',
      name:        messaging.sender?.id, // ID as fallback since name is not always available in basic payload
      message_id:  messaging.message?.mid,
    };
  }

  // Fallback for direct API tests
  if (body.business_id && body.user_id && body.message) {
    return body as WebhookPayload;
  }

  return null;
}
