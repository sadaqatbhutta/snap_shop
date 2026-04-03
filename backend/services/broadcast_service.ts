import { BroadcastJobData } from '../core/queue';
import { sendMessage } from './channelSender';
import { log } from '../core/logger';
import { Broadcast, Segment, Customer } from '../../shared/types';
import { db } from '../core/firebase';

/**
 * Processes a broadcast job: filters customers by segment and sends messages.
 */
export async function processBroadcastJob(data: BroadcastJobData) {
  const { broadcastId, businessId } = data;
  const now = new Date().toISOString();

  log({ timestamp: now, level: 'info', context: 'broadcast_service', message: 'Starting broadcast', broadcastId, businessId });

  try {
    // 1. Load Broadcast
    const broadcastDoc = await db.doc(`businesses/${businessId}/broadcasts/${broadcastId}`).get();
    if (!broadcastDoc.exists) throw new Error('Broadcast not found');
    const broadcast = { id: broadcastDoc.id, ...broadcastDoc.data() } as Broadcast;

    if (broadcast.status === 'sent') {
      log({ timestamp: now, level: 'warn', context: 'broadcast_service', message: 'Broadcast already sent', broadcastId });
      return;
    }

    // 2. Load Segment
    const segmentDoc = await db.doc(`businesses/${businessId}/segments/${broadcast.segmentId}`).get();
    if (!segmentDoc.exists) throw new Error('Segment not found');
    const segment = { id: segmentDoc.id, ...segmentDoc.data() } as Segment;

    // 3. Load Template (for content)
    const templateDoc = await db.doc(`businesses/${businessId}/templates/${broadcast.templateId}`).get();
    if (!templateDoc.exists) throw new Error('Template not found');
    const template = templateDoc.data();
    const content = template?.content || '';

    // 4. Query Customers in Batches
    let baseQuery: FirebaseFirestore.Query = db.collection(`businesses/${businessId}/customers`).orderBy('createdAt');
    
    // Apply basic Firestore filters
    if (segment.criteria.channel) {
      baseQuery = baseQuery.where('channel', '==', segment.criteria.channel);
    }

    let delivered = 0;
    let failed = 0;
    let lastDoc = null;
    let hasMore = true;

    log({ 
      timestamp: new Date().toISOString(), 
      level: 'info', 
      context: 'broadcast_service', 
      message: 'Starting delivery pipeline (paginated)', 
      broadcastId 
    });

    while (hasMore) {
      let batchQuery = baseQuery.limit(100);
      if (lastDoc) {
        batchQuery = batchQuery.startAfter(lastDoc);
      }

      const batchSnap = await batchQuery.get();
      if (batchSnap.empty) {
        hasMore = false;
        break;
      }

      lastDoc = batchSnap.docs[batchSnap.docs.length - 1];
      let batchCustomers = batchSnap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as Customer));

      // Apply complex filters in-memory for this batch
      const criteria = segment.criteria;
      if (criteria.tags && criteria.tags.length > 0) {
        batchCustomers = batchCustomers.filter(c => {
          const hasTags = criteria.tags!.some(t => c.tags.includes(t));
          const allTags = criteria.tags!.every(t => c.tags.includes(t));
          return criteria.tagLogic === 'OR' ? hasTags : allTags;
        });
      }

      if (criteria.excludedTags && criteria.excludedTags.length > 0) {
        batchCustomers = batchCustomers.filter(c => !criteria.excludedTags!.some(t => c.tags.includes(t)));
      }

      if (criteria.lastInteraction) {
        const cutoff = new Date(criteria.lastInteraction).getTime();
        batchCustomers = batchCustomers.filter(c => new Date(c.lastInteractionAt).getTime() >= cutoff);
      }

      // Delivery Loop for current batch
      for (const customer of batchCustomers) {
        try {
          await sendMessage(customer.channel, customer.externalId, content, businessId);
          delivered++;
        } catch (err: any) {
          failed++;
          log({
            timestamp: new Date().toISOString(),
            level: 'error',
            context: 'broadcast_service',
            message: `Failed to send to customer ${customer.id}`,
            error: err.message,
            broadcastId,
            customerId: customer.id,
          });
        }
      }
    }

    // 6. Update Broadcast
    await broadcastDoc.ref.update({
      status: 'sent',
      sentAt: new Date().toISOString(),
      reach: delivered,
      engagement: 0,
    });

    log({
      timestamp: new Date().toISOString(),
      level: 'info',
      context: 'broadcast_service',
      message: 'Broadcast completed',
      broadcastId,
      delivered,
      failed,
    });

  } catch (err: any) {
    log({
      timestamp: now,
      level: 'error',
      context: 'broadcast_service',
      message: 'Critical error in broadcast process',
      error: err.message,
      broadcastId,
    });
    
    await db.doc(`businesses/${businessId}/broadcasts/${broadcastId}`).update({
      status: 'failed',
    }).catch(() => {});
    
    throw err;
  }
}
