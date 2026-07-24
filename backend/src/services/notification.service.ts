import { db } from '../config/firebase.js';
import { sendEmail, isEmailConfigured } from './email.service.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import { digestQueue, defaultJobOptions } from '../queues/queue.js';

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

    const frequency = (prefs.frequency as string) || 'instant';
    if (frequency === 'daily' || frequency === 'weekly') {
      await db.collection(`businesses/${opts.businessId}/digest_events`).add({
        kind: opts.kind,
        customerName: opts.customerName,
        channel: opts.channel,
        preview: opts.preview.slice(0, 280),
        conversationId: opts.conversationId || null,
        createdAt: new Date().toISOString(),
      });
      logger.info({ businessId: opts.businessId, frequency }, 'Queued notification for digest');
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

export async function scheduleDigestJobs() {
  const { connection } = await import('../queues/queue.js');
  if (!connection) {
    logger.info('Skipping digest cron schedule (in-memory queue mode)');
    return;
  }

  await digestQueue.add('digest-daily', { frequency: 'daily' }, {
    ...defaultJobOptions,
    jobId: 'digest-daily',
    repeat: { pattern: '0 8 * * *' },
  }).catch(err => logger.warn({ err }, 'Could not schedule daily digest'));

  await digestQueue.add('digest-weekly', { frequency: 'weekly' }, {
    ...defaultJobOptions,
    jobId: 'digest-weekly',
    repeat: { pattern: '0 8 * * 1' },
  }).catch(err => logger.warn({ err }, 'Could not schedule weekly digest'));
}

export async function processDigestJob(frequency: 'daily' | 'weekly') {
  if (!isEmailConfigured()) {
    return { skipped: true, reason: 'email_not_configured' };
  }

  const snap = await db.collection('businesses').limit(500).get();
  let sent = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const prefs = data.notifications || {};
    if (prefs.frequency !== frequency) continue;
    const to = data.ownerEmail as string | undefined;
    if (!to) continue;

    const eventsSnap = await db
      .collection(`businesses/${doc.id}/digest_events`)
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get();

    if (eventsSnap.empty) continue;

    const lines = eventsSnap.docs.map(e => {
      const d = e.data();
      return `- [${d.kind}] ${d.customerName} (${d.channel}): ${d.preview}`;
    });

    const subject = `[SnapShop] Your ${frequency} inbox digest (${eventsSnap.size} events)`;
    const text = [
      `Here is your ${frequency} SnapShop digest.`,
      '',
      ...lines,
      '',
      `Open inbox: ${config.APP_URL}/conversations`,
    ].join('\n');

    const ok = await sendEmail({ to, subject, text });
    if (ok) {
      sent += 1;
      const batch = db.batch();
      eventsSnap.docs.forEach(e => batch.delete(e.ref));
      await batch.commit();
      await doc.ref.set(
        { notifications: { ...prefs, lastDigestAt: new Date().toISOString() } },
        { merge: true }
      );
    }
  }

  logger.info({ frequency, sent }, 'Digest job completed');
  return { sent };
}
