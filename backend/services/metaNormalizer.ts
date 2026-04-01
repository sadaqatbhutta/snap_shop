import { WebhookPayload } from '../schemas/webhook';

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

    return {
      business_id: value.metadata?.phone_number_id || 'default', // Meta uses phone_number_id usually
      user_id:     message.from,
      message:     message.text?.body || '',
      type:        message.type === 'text' ? 'text' : 'text', // simplification for now
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
