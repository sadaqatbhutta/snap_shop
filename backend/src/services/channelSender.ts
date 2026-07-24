import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { loadBusinessSecrets } from './secrets.service.js';
import { db } from '../config/firebase.js';

export type OutboundMedia = {
  type?: 'text' | 'image';
  imageUrl?: string;
  caption?: string;
};

/** Queue an outbound webchat reply for the embed widget to poll. */
export async function enqueueWebchatOutbound(
  businessId: string,
  recipientId: string,
  message: string
) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.doc(`businesses/${businessId}/webchat_outbox/${id}`).set({
    id,
    userId: recipientId,
    message,
    createdAt: new Date().toISOString(),
    consumed: false,
  });
}

export async function consumeWebchatOutbound(businessId: string, userId: string, limit = 20) {
  const snap = await db
    .collection(`businesses/${businessId}/webchat_outbox`)
    .where('userId', '==', userId)
    .limit(50)
    .get();

  const pending = snap.docs
    .map(d => ({ ref: d.ref, data: d.data() }))
    .filter(x => !x.data.consumed)
    .sort((a, b) => String(a.data.createdAt || '').localeCompare(String(b.data.createdAt || '')))
    .slice(0, limit);

  const batch = db.batch();
  pending.forEach(p => batch.update(p.ref, { consumed: true, consumedAt: new Date().toISOString() }));
  if (pending.length) await batch.commit();

  return pending.map(p => ({
    id: p.data.id as string,
    message: p.data.message as string,
    createdAt: p.data.createdAt as string,
  }));
}

export async function sendMessage(
  channel: string,
  recipientId: string,
  message: string,
  businessId: string,
  media?: OutboundMedia
) {
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
    await enqueueWebchatOutbound(businessId, recipientId, message);
    logger.info({ channel, recipientId, businessId }, 'Queued outbound webchat message');
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

      if (media?.type === 'image' && media.imageUrl) {
        await axios.post(
          `${apiUrl}/${phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientId,
            type: 'image',
            image: {
              link: media.imageUrl,
              caption: media.caption || message || undefined,
            },
          },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } else {
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
      }
    } else {
      if (media?.type === 'image' && media.imageUrl) {
        await axios.post(
          `${apiUrl}/me/messages`,
          {
            recipient: { id: recipientId },
            message: {
              attachment: {
                type: 'image',
                payload: { url: media.imageUrl, is_reusable: true },
              },
            },
          },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (message) {
          await axios.post(
            `${apiUrl}/me/messages`,
            { recipient: { id: recipientId }, message: { text: message } },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
        }
      } else {
        await axios.post(
          `${apiUrl}/me/messages`,
          { recipient: { id: recipientId }, message: { text: message } },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      }
    }
  }, 'sendMessage', { maxAttempts: 3, baseDelayMs: 1000 });

  logger.info({ channel, recipientId, businessId, mediaType: media?.type || 'text' }, 'Delivered outbound message');
}
