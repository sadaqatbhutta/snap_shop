import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { loadBusinessSecrets } from './secrets.service.js';

export async function sendMessage(channel: string, recipientId: string, message: string, businessId: string) {
  const secrets = await loadBusinessSecrets(businessId);
  const accessToken = secrets.metaAccessToken || config.META_ACCESS_TOKEN;
  const phoneNumberId = secrets.whatsappPhoneNumberId || config.WHATSAPP_PHONE_NUMBER_ID;
  const apiUrl = 'https://graph.facebook.com/v19.0';

  if (channel === 'tiktok') {
    const tiktokAccessToken = secrets.tiktokAccessToken || process.env.TIKTOK_ACCESS_TOKEN;
    const tiktokApiBase = secrets.tiktokApiBase || process.env.TIKTOK_API_BASE || 'https://open.tiktokapis.com/v2';
    const tiktokSendPath = secrets.tiktokSendPath || process.env.TIKTOK_SEND_PATH || '/message/send/';
    if (!tiktokAccessToken) {
      throw new Error('Missing TikTok access token');
    }

    await withRetry(async () => {
      await axios.post(
        `${tiktokApiBase}${tiktokSendPath}`,
        {
          recipient: { user_id: recipientId },
          content: { text: message, type: 'text' },
        },
        {
          headers: {
            Authorization: `Bearer ${tiktokAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }, 'sendTiktokMessage', { maxAttempts: 3, baseDelayMs: 1000 });

    logger.info({ channel, recipientId, businessId }, 'Delivered outbound message');
    return;
  }

  if (channel === 'webchat') {
    // Webchat is inbound+dashboard only; no external provider delivery.
    logger.info({ channel, recipientId, businessId }, 'Skipped outbound delivery for webchat');
    return;
  }

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
