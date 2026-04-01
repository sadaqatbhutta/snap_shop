import axios from 'axios';
import { config } from '../core/config';
import { withRetry } from '../core/retry';
import { log } from '../core/logger';

/**
 * Sends a message out to Meta (WhatsApp/Instagram) using the Graph API.
 */
export async function sendMessage(
  channel: string,
  recipientId: string,
  message: string,
  businessId: string
): Promise<void> {
  const metaApiUrl = 'https://graph.facebook.com/v19.0';
  const accessToken = config.META_ACCESS_TOKEN;

  await withRetry(
    async () => {
      if (channel === 'whatsapp') {
        // WhatsApp Business API
        const phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID;
        await axios.post(
          `${metaApiUrl}/${phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type:    'individual',
            to:                recipientId,
            type:              'text',
            text:              { body: message },
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      } else if (channel === 'instagram') {
        // Instagram Messaging API
        await axios.post(
          `${metaApiUrl}/me/messages`,
          {
            recipient: { id: recipientId },
            message:   { text: message },
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      } else {
        log({
          timestamp: new Date().toISOString(),
          level: 'warn',
          context: 'channelSender',
          message: `Attempted to send to unsupported channel: ${channel}`,
          businessId,
        });
      }
    },
    `sendMessage:${channel}:${recipientId}`,
    { maxAttempts: 3 }
  );
}
