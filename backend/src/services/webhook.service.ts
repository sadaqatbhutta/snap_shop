import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { webhookQueue, getJobStatus, defaultJobOptions, WebhookJobData, connection as redis } from '../queues/queue.js';
import { db } from '../config/firebase.js';
import { normalizeMetaPayload } from './metaNormalizer.js';
import { sendMessage } from './channelSender.js';
import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { WebhookPayload } from '../validations/webhook.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

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
    logger.warn({ channel, body }, 'Ignored malformed webhook payload');
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

    const conversationsRef = db.collection(`businesses/${businessId}/conversations`);
    const convSnap = await transaction.get(conversationsRef.where('customerId', '==', tempCustomerId).where('status', '==', 'active').limit(1));

    let tempConversationId: string;
    let convDocRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
    let tempIsHumanHandling = false;

    if (convSnap.empty) {
      tempConversationId = uuidv4();
      convDocRef = conversationsRef.doc(tempConversationId);
    } else {
      tempConversationId = convSnap.docs[0].id;
      convDocRef = convSnap.docs[0].ref;
      tempIsHumanHandling = (convSnap.docs[0].data() as any).status === 'human_escalated';
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

    if (convSnap.empty) {
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
      isNewConversation: convSnap.empty,
      isHumanHandling: tempIsHumanHandling,
    };
  });

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

  const historySnap = await messagesRef.orderBy('timestamp', 'desc').limit(10).get();
  const history = historySnap.docs
    .reverse()
    .filter(doc => doc.id !== customerMsgId)
    .map(doc => ({
      role: doc.data().senderType === 'customer' ? 'user' : 'model',
      content: doc.data().content as string,
    }));

  let aiReply = 'Let me connect you with a human agent.';
  let aiIntent = 'unknown';
  let aiConfidence = 0;

  if (!isHumanHandling) {
    const aiResult = await runAIPipeline(content, businessId, history);
    if (aiResult) {
      aiReply = aiResult.reply;
      aiIntent = aiResult.intent;
      aiConfidence = aiResult.confidence;

      if (aiResult.shouldEscalate) {
        await db.doc(`businesses/${businessId}/conversations/${conversationId}`).update({ status: 'human_escalated' });
      }

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

      await db.doc(`businesses/${businessId}/conversations/${conversationId}`).update({
        aiConfidence,
        updatedAt: new Date().toISOString(),
      });

      await sendMessage(channel, userId, aiReply, businessId);
    }
  }

  logger.info({ channel, userId, businessId, reply: aiReply, confidence: aiConfidence }, 'Processed incoming webhook');

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
  if (!isHumanHandling && aiReply === 'Let me connect you with a human agent.') {
    statsUpdate.escalations = FieldValue.increment(1);
  }

  await statsRef.set(statsUpdate, { merge: true });

  return {
    status: 'processed',
    id: msgId,
    conversationId,
    reply: aiReply,
    intent: aiIntent,
    confidence: aiConfidence,
  };
}

async function isDuplicate(id: string) {
  // Redis NX + EX: set only if not exists, 1 hour TTL
  if (!redis) {
    // Fallback: if Redis unavailable, skip deduplication
    logger.warn('Redis unavailable for deduplication check');
    return false;
  }
  
  const key = `dedup:${id}`;
  const result = await redis.set(key, '1', 'NX', 'EX', 3600);
  return result === null; // null means key already existed (duplicate)
}

async function runAIPipeline(message: string, businessId: string, history: { role: 'user' | 'model'; content: string }[]) {
  const bizSnap = await db.doc(`businesses/${businessId}`).get();
  const biz = bizSnap.data() || {};
  const systemInstruction = `You are a customer care assistant for ${biz.name || 'the business'}. Only answer from the provided context and FAQs. Do not hallucinate.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      ...history.map(item => ({ role: item.role, parts: [{ text: item.content }] })),
      { role: 'user', parts: [{ text: message }] },
    ],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING },
          language: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          reply: { type: Type.STRING },
          shouldEscalate: { type: Type.BOOLEAN },
        },
        required: ['intent', 'language', 'confidence', 'reply', 'shouldEscalate'],
      },
    },
  });

  const result = JSON.parse(response.text || '{}');
  return {
    intent: result.intent || 'unknown',
    language: result.language || 'unknown',
    confidence: result.confidence ?? 0,
    reply: result.reply || 'Let me connect you with a human agent.',
    shouldEscalate: result.shouldEscalate || false,
  };
}
