import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { webhookQueue, getJobStatus, defaultJobOptions, WebhookJobData, connection as redis } from '../queues/queue.js';
import { db } from '../config/firebase.js';
import { normalizeMetaPayload } from './metaNormalizer.js';
import { sendMessage } from './channelSender.js';
import { logger } from '../utils/logger.js';
import { WebhookPayload } from '../validations/webhook.js';
import { runAIPipeline } from './ai.service.js';
import { deriveConversationSignals } from '../utils/conversationSignals.js';
import { redactForLogs } from '../utils/redact.js';

export async function enqueueWebhookMessage(channel: string, body: Record<string, unknown>, requestId?: string) {
  return webhookQueue.add(
    'process-message',
    { channel, body, requestId },
    defaultJobOptions
  );
}

export async function getWebhookJobStatusById(jobId: string) {
  return getJobStatus(webhookQueue, jobId);
}

export async function processWebhookJob(channel: string, body: Record<string, unknown>) {
  const payload = normalizeMetaPayload(channel, body);
  if (!payload) {
    logger.warn({ channel, body: redactForLogs(body) }, 'Ignored malformed webhook payload');
    return { status: 'ignored' };
  }

  const msgId = payload.message_id || uuidv4();
  const businessId = payload.business_id;
  const userId = payload.user_id;
  const content = payload.message;
  const now = new Date().toISOString();

  if (await isDuplicate(msgId)) {
    return { status: 'duplicate', id: msgId };
  }

  // ─── Transaction: Find/Create Customer & Conversation ────────────────────
  const { customerId, conversationId, isNewConversation, isHumanHandling } = await db.runTransaction(async transaction => {
    const customersRef = db.collection(`businesses/${businessId}/customers`);
    const custSnap = await transaction.get(customersRef.where('externalId', '==', userId).where('channel', '==', channel).limit(1));

    let tempCustomerId: string;
    let customerDocRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
    let isNewCustomer = false;

    if (custSnap.empty) {
      tempCustomerId = uuidv4();
      customerDocRef = customersRef.doc(tempCustomerId);
      isNewCustomer = true;
    } else {
      tempCustomerId = custSnap.docs[0].id;
      customerDocRef = custSnap.docs[0].ref;
    }

    // ─── FIX: Check for EXISTING conversation with ANY status ────────────
    const conversationsRef = db.collection(`businesses/${businessId}/conversations`);
    const convSnap = await transaction.get(
      conversationsRef
        .where('customerId', '==', tempCustomerId)
        .where('status', 'in', ['active', 'human_escalated']) // Check both statuses
        .limit(1)
    );

    let tempConversationId: string;
    let convDocRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
    let tempIsHumanHandling = false;
    let tempIsNewConversation = false;

    if (convSnap.empty) {
      // No active or escalated conversation exists - create new
      tempConversationId = uuidv4();
      convDocRef = conversationsRef.doc(tempConversationId);
      tempIsNewConversation = true;
    } else {
      // Existing conversation found
      tempConversationId = convSnap.docs[0].id;
      convDocRef = convSnap.docs[0].ref;
      const convData = convSnap.docs[0].data();
      
      // ─── FIX: Correctly check if human is handling ───────────────────
      tempIsHumanHandling = convData.status === 'human_escalated';
    }

    if (isNewCustomer) {
      transaction.set(customerDocRef, {
        id: tempCustomerId,
        businessId,
        channel,
        externalId: userId,
        name: payload.name || userId,
        tags: [],
        createdAt: now,
        lastInteractionAt: now,
      });
    } else {
      transaction.update(customerDocRef, { lastInteractionAt: now });
    }

    if (tempIsNewConversation) {
      transaction.set(convDocRef, {
        id: tempConversationId,
        businessId,
        customerId: tempCustomerId,
        customerName: payload.name || userId,
        channel,
        lastMessage: content,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      transaction.update(convDocRef, { lastMessage: content, updatedAt: now });
    }

    return {
      customerId: tempCustomerId,
      conversationId: tempConversationId,
      isNewConversation: tempIsNewConversation,
      isHumanHandling: tempIsHumanHandling,
    };
  });

  // ─── Store Customer Message ───────────────────────────────────────────────
  const messagesRef = db.collection(`businesses/${businessId}/conversations/${conversationId}/messages`);
  const customerMsgId = uuidv4();
  await messagesRef.doc(customerMsgId).set({
    id: customerMsgId,
    conversationId,
    businessId,
    senderId: userId,
    senderType: 'customer',
    content,
    type: payload.type,
    timestamp: now,
  });

  // ─── Load Conversation History ────────────────────────────────────────────
  const historySnap = await messagesRef.orderBy('timestamp', 'desc').limit(10).get();
  const history = historySnap.docs
    .reverse()
    .filter(doc => doc.id !== customerMsgId)
    .map(doc => ({
      role: (doc.data().senderType === 'customer' ? 'user' : 'model') as 'user' | 'model',
      content: doc.data().content as string,
    }));

  let aiReply = 'Let me connect you with a human agent.';
  let aiIntent = 'unknown';
  let aiConfidence: number | undefined;
  let shouldEscalate = false;

  // ─── AI Processing (only if not human-escalated) ─────────────────────────
  if (!isHumanHandling) {
    const aiResult = await runAIPipeline(content, businessId, history);
    aiReply = aiResult.reply;
    aiIntent = aiResult.intent;
    aiConfidence = aiResult.confidence;
    shouldEscalate = aiResult.shouldEscalate;

    const aiMsgId = uuidv4();
    await messagesRef.doc(aiMsgId).set({
      id: aiMsgId,
      conversationId,
      businessId,
      senderId: 'ai',
      senderType: 'ai',
      content: aiReply,
      type: 'text',
      intent: aiIntent,
      timestamp: new Date().toISOString(),
    });

    await sendMessage(channel, userId, aiReply, businessId);
  }

  const finalStatus: 'active' | 'human_escalated' =
    isHumanHandling || shouldEscalate ? 'human_escalated' : 'active';
  const signals = deriveConversationSignals(content, finalStatus, aiConfidence, shouldEscalate);
  const lastMessageForUi = !isHumanHandling ? aiReply : content;

  const convPatch: Record<string, unknown> = {
    lastMessage: lastMessageForUi,
    lastCustomerMessageAt: now,
    updatedAt: new Date().toISOString(),
    leadScore: signals.leadScore,
    leadPriority: signals.leadPriority,
    sentimentTags: signals.sentimentTags,
    needsHumanReview: signals.needsHumanReview,
  };
  if (aiConfidence !== undefined) convPatch.aiConfidence = aiConfidence;
  if (finalStatus === 'human_escalated') convPatch.status = 'human_escalated';

  await db.doc(`businesses/${businessId}/conversations/${conversationId}`).update(convPatch);

  logger.info(
    { channel, userId, businessId, intent: aiIntent, confidence: aiConfidence ?? null, leadPriority: signals.leadPriority },
    'Processed incoming webhook'
  );

  // ─── Update Daily Stats ───────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const statsRef = db.doc(`businesses/${businessId}/stats/daily_${today}`);
  const statsUpdate: Record<string, unknown> = {
    totalMessages: FieldValue.increment(1),
    [`channelCounts.${channel}`]: FieldValue.increment(1),
    [`intentCounts.${aiIntent}`]: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (isNewConversation) {
    statsUpdate.totalConversations = FieldValue.increment(1);
  }
  // ─── FIX: Use shouldEscalate flag instead of string comparison ───────────
  if (!isHumanHandling && shouldEscalate) {
    statsUpdate.escalations = FieldValue.increment(1);
  }

  await statsRef.set(statsUpdate, { merge: true });

  return {
    status: 'processed',
    id: msgId,
    conversationId,
    reply: aiReply,
    intent: aiIntent,
    confidence: aiConfidence ?? 0,
  };
}

async function isDuplicate(id: string) {
  if (!redis) {
    logger.warn('Redis unavailable for deduplication check');
    return false;
  }
  
  const key = `dedup:${id}`;
  const result = await redis.set(key, '1', 'EX', 3600, 'NX');
  return result === null;
}

// ─── FIX: AI Pipeline now uses FAQs, aiContext, and confidenceThreshold ──────
