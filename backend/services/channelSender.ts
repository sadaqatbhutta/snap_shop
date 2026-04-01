import axios from 'axios';
import { config } from '../core/config';
import { withRetry } from '../core/retry';
import { db } from '../core/firebase';
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
  
  // 1. Resolve Credentials (DB first, then config)
  const bizDoc = await db.doc(`businesses/${businessId}`).get();
  const biz = bizDoc.data();
  
  const accessToken = biz?.metaAccessToken || config.META_ACCESS_TOKEN;
  const phoneNumberId = biz?.whatsappPhoneNumberId || config.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken) {
    throw new Error(`Missing Meta Access Token for business ${businessId}`);
  }

  await withRetry(
    async () => {
      if (channel === 'whatsapp') {
        if (!phoneNumberId) throw new Error(`Missing WhatsApp Phone Number ID for business ${businessId}`);
        
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
          message: `Unsupported channel: ${channel}`,
          businessId,
        });
      }
    },
    `sendMessage:${channel}:${recipientId}`,
    { maxAttempts: 3 }
  );
}
