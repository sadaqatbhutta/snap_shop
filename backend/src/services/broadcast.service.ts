import { db } from '../config/firebase.js';
import { broadcastQueue, defaultJobOptions, BroadcastJobData } from '../queues/queue.js';
import { buildError } from '../utils/errors.js';

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
    updatedAt: new Date().toISOString(),
  });

  return {
    status: 'queued',
    job_id: job.id,
    scheduled: delay > 0,
    delay_ms: delay,
  };
}

export async function processBroadcastJob(data: BroadcastJobData) {
  const { broadcastId, businessId } = data;
  const broadcastRef = db.doc(`businesses/${businessId}/broadcasts/${broadcastId}`);
  const broadcastSnap = await broadcastRef.get();

  if (!broadcastSnap.exists) {
    throw buildError('BROADCAST_NOT_FOUND', 'Broadcast not found', 404);
  }

  const batchSize = 100;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let totalSent = 0;

  do {
    let query = db.collection(`businesses/${businessId}/customers`).orderBy('createdAt').limit(batchSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    totalSent += messages.length;
    cursor = snapshot.docs[snapshot.docs.length - 1];
  } while (cursor);

  await broadcastRef.update({ status: 'sent', sentAt: new Date().toISOString(), reach: totalSent, updatedAt: new Date().toISOString() });

  return { broadcastId, businessId, reach: totalSent };
}
