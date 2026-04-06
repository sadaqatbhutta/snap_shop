import axios from 'axios';
import { db } from '../config/firebase.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

export async function sendMessage(channel: string, recipientId: string, message: string, businessId: string) {
  const bizSnap = await db.doc(`businesses/${businessId}`).get();
  const biz = bizSnap.data() || {};
  const accessToken = biz.metaAccessToken || config.META_ACCESS_TOKEN;
  const phoneNumberId = biz.whatsappPhoneNumberId || config.WHATSAPP_PHONE_NUMBER_ID;
  const apiUrl = 'https://graph.facebook.com/v19.0';

  if (!accessToken) {
    throw new Error('Missing Meta access token');
  }

  await withRetry(async () => {
    if (channel === 'whatsapp') {
      if (!phoneNumberId) {
        throw new Error('Missing WhatsApp phone number ID');
      }
      await axios.post(
        `${apiUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientId,
          type: 'text',
          text: { body: message },
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } else {
      await axios.post(
        `${apiUrl}/me/messages`,
        { recipient: { id: recipientId }, message: { text: message } },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    }
  }, 'sendMessage', { maxAttempts: 3, baseDelayMs: 1000 });

  logger.info({ channel, recipientId, businessId }, 'Delivered outbound message');
}
