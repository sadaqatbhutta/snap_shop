import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function isSendGridUrl(url: string): boolean {
  return url.includes('sendgrid.com');
}

/**
 * Sends transactional email via SMTP_API_URL.
 * Supports SendGrid v3 JSON shape when the URL points at SendGrid; otherwise posts a simple JSON payload.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiUrl = config.SMTP_API_URL;
  if (!apiUrl) {
    logger.warn({ to: input.to, subject: input.subject }, 'Email skipped: SMTP_API_URL not configured');
    return false;
  }

  const from = config.SMTP_FROM_EMAIL || 'noreply@snapshop.ai';

  try {
    if (isSendGridUrl(apiUrl)) {
      if (!config.SMTP_API_KEY) {
        logger.warn('SendGrid URL set but SMTP_API_KEY missing');
        return false;
      }
      await axios.post(
        apiUrl,
        {
          personalizations: [{ to: [{ email: input.to }] }],
          from: { email: from, name: 'SnapShop AI' },
          subject: input.subject,
          content: [
            { type: 'text/plain', value: input.text },
            ...(input.html ? [{ type: 'text/html', value: input.html }] : []),
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${config.SMTP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
    } else {
      await axios.post(
        apiUrl,
        {
          to: input.to,
          from,
          subject: input.subject,
          content: input.text,
          html: input.html,
        },
        {
          headers: {
            ...(config.SMTP_API_KEY ? { Authorization: `Bearer ${config.SMTP_API_KEY}` } : {}),
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
    }
    return true;
  } catch (err) {
    logger.error({ err, to: input.to, subject: input.subject }, 'Failed to send email');
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(config.SMTP_API_URL);
}
