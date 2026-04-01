import { Router } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { broadcastQueue } from '../../core/queue';
import { log } from '../../core/logger';

export const broadcastRouter = Router();
const db = getFirestore();

/**
 * POST /api/broadcast/:broadcastId
 *
 * Triggers a broadcast. If scheduledAt is set and in the future, 
 * creates a delayed BullMQ job. Otherwise, queues immediately.
 */
broadcastRouter.post('/:broadcastId', async (req, res, next) => {
  try {
    const { broadcastId } = req.params;
    const { businessId }  = req.body; // In real app, get from auth token

    if (!businessId) {
      return res.status(400).json({ status: 'error', message: 'businessId is required' });
    }

    const broadcastDoc = await db.doc(`businesses/${businessId}/broadcasts/${broadcastId}`).get();
    if (!broadcastDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'Broadcast not found' });
    }

    const broadcast = broadcastDoc.data();
    const scheduledAt = broadcast?.scheduledAt;
    let delay = 0;

    if (scheduledAt) {
      const scheduledTime = new Date(scheduledAt).getTime();
      const now = Date.now();
      if (scheduledTime > now) {
        delay = scheduledTime - now;
      }
    }

    const job = await broadcastQueue.add(
      'send-broadcast',
      { broadcastId, businessId, requestId: (req as any).requestId },
      { 
        delay,
        removeOnComplete: true,
        removeOnFail: false 
      }
    );

    // Update status to 'scheduled' if it's in the future, or 'sending'
    await broadcastDoc.ref.update({
      status: delay > 0 ? 'scheduled' : 'sending',
      updatedAt: new Date().toISOString(),
    });

    res.json({ 
      status: 'queued', 
      job_id: job.id, 
      scheduled: delay > 0,
      delay_ms: delay 
    });

  } catch (err) {
    next(err);
  }
});
