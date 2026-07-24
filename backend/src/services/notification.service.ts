import { db } from '../config/firebase.js';
import { sendEmail, isEmailConfigured } from './email.service.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';

interface NotifyOpts {
  businessId: string;
  kind: 'inquiry' | 'escalation';
  customerName: string;
  channel: string;
  preview: string;
  conversationId?: string;
}

export async function notifyBusinessOwners(opts: NotifyOpts): Promise<void> {
  if (!isEmailConfigured()) return;

  try {
    const snap = await db.doc(`businesses/${opts.businessId}`).get();
    if (!snap.exists) return;
    const data = snap.data() || {};
    const prefs = data.notifications || {};

    if (opts.kind === 'inquiry' && prefs.inquiries === false) return;
    if (opts.kind === 'escalation' && prefs.escalations === false) return;

    // Daily/weekly digests are stored for future workers; only instant sends now.
    if (prefs.frequency && prefs.frequency !== 'instant') {
      logger.info({ businessId: opts.businessId, frequency: prefs.frequency }, 'Deferred non-instant notification');
      return;
    }

    const to = data.ownerEmail as string | undefined;
    if (!to) return;

    const subject =
      opts.kind === 'inquiry'
        ? `[SnapShop] New inquiry from ${opts.customerName}`
        : `[SnapShop] Human escalation needed — ${opts.customerName}`;

    const link = opts.conversationId
      ? `${config.APP_URL}/conversations?id=${opts.conversationId}`
      : `${config.APP_URL}/conversations`;

    const text = [
      opts.kind === 'inquiry' ? 'A customer started a new conversation.' : 'A conversation was escalated to a human agent.',
      '',
      `Customer: ${opts.customerName}`,
      `Channel: ${opts.channel}`,
      `Preview: ${opts.preview.slice(0, 280)}`,
      '',
      `Open inbox: ${link}`,
    ].join('\n');

    await sendEmail({ to, subject, text });
  } catch (err) {
    logger.error({ err, businessId: opts.businessId }, 'Failed to send business notification');
  }
}
