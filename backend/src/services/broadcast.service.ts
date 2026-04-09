import { db } from '../config/firebase.js';
import { broadcastQueue, defaultJobOptions, BroadcastJobData, connection } from '../queues/queue.js';
import { buildError } from '../utils/errors.js';
import { sendMessage } from './channelSender.js';
import { logger } from '../utils/logger.js';
import { Job } from 'bullmq';

export async function scheduleBroadcast(broadcastId: string, businessId: string, scheduledAt?: string, requestId?: string) {
  const broadcastRef = db.doc(`businesses/${businessId}/broadcasts/${broadcastId}`);
  const broadcastSnap = await broadcastRef.get();

  if (!broadcastSnap.exists) {
    throw buildError('BROADCAST_NOT_FOUND', 'Broadcast not found', 404);
  }

  const broadcast = broadcastSnap.data() as { scheduledAt?: string } | undefined;
  const scheduleAt = scheduledAt || broadcast?.scheduledAt;
  let delay = 0;

  if (scheduleAt) {
    const when = Date.parse(scheduleAt);
    if (Number.isNaN(when)) {
      throw buildError('INVALID_DATE', 'scheduledAt must be a valid ISO timestamp', 422);
    }
    delay = Math.max(0, when - Date.now());
  }

  const job = await broadcastQueue.add(
    'send-broadcast',
    { broadcastId, businessId, requestId },
    { ...defaultJobOptions, delay }
  );

  await broadcastRef.update({
    status: delay > 0 ? 'scheduled' : 'sending',
    queuedJobId: String(job.id),
    updatedAt: new Date().toISOString(),
  });

  return {
    status: 'queued',
    job_id: job.id,
    scheduled: delay > 0,
    delay_ms: delay,
  };
}

export async function cancelBroadcast(broadcastId: string, businessId: string) {
  const broadcastRef = db.doc(`businesses/${businessId}/broadcasts/${broadcastId}`);
  const broadcastSnap = await broadcastRef.get();
  if (!broadcastSnap.exists) {
    throw buildError('BROADCAST_NOT_FOUND', 'Broadcast not found', 404);
  }

  const broadcast = broadcastSnap.data() as { queuedJobId?: string; status?: string } | undefined;
  const queuedJobId = broadcast?.queuedJobId;

  if (queuedJobId && connection) {
    const job = await Job.fromId(broadcastQueue as any, queuedJobId);
    if (job) {
      const state = await job.getState();
      if (state === 'waiting' || state === 'delayed') {
        await job.remove();
      }
    }
  }

  await broadcastRef.update({
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { status: 'cancelled', broadcastId };
}

export async function processBroadcastJob(data: BroadcastJobData) {
  const { broadcastId, businessId } = data;
  const broadcastRef = db.doc(`businesses/${businessId}/broadcasts/${broadcastId}`);
  const broadcastSnap = await broadcastRef.get();

  if (!broadcastSnap.exists) {
    throw buildError('BROADCAST_NOT_FOUND', 'Broadcast not found', 404);
  }

  const broadcast = broadcastSnap.data() as any;
  const { templateId, segmentId } = broadcast;

  // ─── Fetch Template ───────────────────────────────────────────────────────
  const templateSnap = await db.doc(`businesses/${businessId}/templates/${templateId}`).get();
  if (!templateSnap.exists) {
    throw buildError('TEMPLATE_NOT_FOUND', 'Template not found', 404);
  }
  const template = templateSnap.data() as any;
  const messageContent = template.content;

  if (!messageContent) {
    throw buildError('TEMPLATE_EMPTY', 'Template has no content', 422);
  }

  // ─── Fetch Segment Criteria ──────────────────────────────────────────────
  const segmentSnap = await db.doc(`businesses/${businessId}/segments/${segmentId}`).get();
  if (!segmentSnap.exists) {
    throw buildError('SEGMENT_NOT_FOUND', 'Segment not found', 404);
  }
  const segment = segmentSnap.data() as any;
  const criteria = segment.criteria || {};

  // ─── Filter Customers by Segment ─────────────────────────────────────────
  let query: FirebaseFirestore.Query = db.collection(`businesses/${businessId}/customers`);

  // Filter by channel
  if (criteria.channel) {
    query = query.where('channel', '==', criteria.channel);
  }

  // Filter by tags (AND/OR logic)
  if (criteria.tags && criteria.tags.length > 0) {
    if (criteria.tagLogic === 'AND') {
      // Customer must have ALL tags
      query = query.where('tags', 'array-contains-any', criteria.tags);
      // Note: Firestore doesn't support array-contains-all, so we'll filter in-memory
    } else {
      // Customer must have ANY tag (OR logic)
      query = query.where('tags', 'array-contains-any', criteria.tags);
    }
  }

  // Filter by last interaction date
  if (criteria.lastInteraction) {
    const cutoffDate = new Date();
    const days = parseInt(criteria.lastInteraction, 10);
    if (!isNaN(days)) {
      cutoffDate.setDate(cutoffDate.getDate() - days);
      query = query.where('lastInteractionAt', '>=', cutoffDate.toISOString());
    }
  }

  // ─── Fetch and Send Messages ─────────────────────────────────────────────
  const batchSize = 100;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let totalSent = 0;
  let totalFailed = 0;

  await broadcastRef.update({ status: 'sending' });

  do {
    let batchQuery = query.orderBy('createdAt').limit(batchSize);
    if (cursor) batchQuery = batchQuery.startAfter(cursor);
    
    const snapshot = await batchQuery.get();
    if (snapshot.empty) break;

    const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    // Apply in-memory filters (for AND tag logic and excluded tags)
    const filtered = customers.filter(customer => {
      // AND tag logic: customer must have ALL tags
      if (criteria.tagLogic === 'AND' && criteria.tags && criteria.tags.length > 0) {
        const hasAllTags = criteria.tags.every((tag: string) => customer.tags?.includes(tag));
        if (!hasAllTags) return false;
      }

      // Excluded tags: customer must NOT have any excluded tag
      if (criteria.excludedTags && criteria.excludedTags.length > 0) {
        const hasExcludedTag = criteria.excludedTags.some((tag: string) => customer.tags?.includes(tag));
        if (hasExcludedTag) return false;
      }

      return true;
    });

    // Send messages to filtered customers
    for (const customer of filtered) {
      try {
        await sendMessage(customer.channel, customer.externalId, messageContent, businessId);
        totalSent++;
        
        logger.info({
          broadcastId,
          customerId: customer.id,
          channel: customer.channel,
        }, 'Broadcast message sent');
      } catch (err) {
        totalFailed++;
        logger.error({
          broadcastId,
          customerId: customer.id,
          error: (err as Error).message,
        }, 'Failed to send broadcast message');
      }

      // Rate limiting: small delay between messages to avoid API throttling
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
  } while (cursor);

  // ─── Update Broadcast Status ─────────────────────────────────────────────
  await broadcastRef.update({
    status: 'sent',
    sentAt: new Date().toISOString(),
    reach: totalSent,
    engagement: 0, // Will be updated as customers interact
    updatedAt: new Date().toISOString(),
  });

  logger.info({
    broadcastId,
    businessId,
    totalSent,
    totalFailed,
  }, 'Broadcast completed');

  return { broadcastId, businessId, reach: totalSent, failed: totalFailed };
}
