import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/config.js';
import { loadBusinessSecrets } from './secrets.service.js';
import { logger } from '../utils/logger.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

export type MultimodalInput = {
  type: string;
  text?: string;
  mediaUrl?: string;
  mediaId?: string;
  mimeType?: string;
};

async function fetchWhatsAppMedia(businessId: string, mediaId: string): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const secrets = await loadBusinessSecrets(businessId);
    const accessToken = secrets.metaAccessToken || config.META_ACCESS_TOKEN;
    if (!accessToken) return null;

    const meta = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    });
    const url = meta.data?.url as string | undefined;
    const mimeType = (meta.data?.mime_type as string) || 'application/octet-stream';
    if (!url) return null;

    const bin = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
      timeout: 20000,
    });
    return { data: Buffer.from(bin.data), mimeType };
  } catch (err) {
    logger.warn({ err, businessId, mediaId }, 'Failed to download WhatsApp media');
    return null;
  }
}

/**
 * Turns image / audio / voice / document into a text understanding the AI pipeline can use.
 */
export async function understandMediaMessage(
  businessId: string,
  input: MultimodalInput
): Promise<string> {
  const baseText = (input.text || '').trim();
  const type = (input.type || 'text').toLowerCase();

  if (type === 'text' || type === 'interactive') {
    return baseText;
  }

  if (['location', 'contacts', 'sticker'].includes(type)) {
    return baseText || `[Customer sent a ${type} message]`;
  }

  let inlineData: { mimeType: string; data: string } | null = null;

  if (input.mediaUrl && /^https?:\/\//i.test(input.mediaUrl)) {
    try {
      const resp = await axios.get(input.mediaUrl, { responseType: 'arraybuffer', timeout: 20000 });
      const mimeType = input.mimeType || resp.headers['content-type'] || 'application/octet-stream';
      inlineData = { mimeType: String(mimeType).split(';')[0], data: Buffer.from(resp.data).toString('base64') };
    } catch (err) {
      logger.warn({ err }, 'Failed to fetch media URL');
    }
  } else if (input.mediaId) {
    const media = await fetchWhatsAppMedia(businessId, input.mediaId);
    if (media) {
      inlineData = { mimeType: media.mimeType.split(';')[0], data: media.data.toString('base64') };
    }
  }

  if (!inlineData) {
    return baseText || `[Customer sent a ${type} attachment that could not be downloaded]`;
  }

  const prompt =
    type === 'image' || type === 'sticker'
      ? 'Describe this customer image for a sales/support agent. Extract product details, text in the image, and likely intent. Be concise.'
      : type === 'audio' || type === 'voice'
        ? 'Transcribe this voice/audio message and summarize the customer request in clear text.'
        : type === 'video'
          ? 'Summarize what the customer is showing or saying in this video for support purposes.'
          : 'Extract key information from this customer document/media for support.';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user' as any,
          parts: [
            { text: prompt + (baseText ? `\nCaption from customer: ${baseText}` : '') },
            { inlineData },
          ],
        },
      ],
    });
    const understood = (response.text || '').trim();
    if (!understood) return baseText || `[${type} message]`;
    return baseText ? `${baseText}\n\n[Media understanding]: ${understood}` : `[Media understanding]: ${understood}`;
  } catch (err) {
    logger.warn({ err, type }, 'Multimodal understanding failed');
    return baseText || `[Customer sent a ${type} message]`;
  }
}
