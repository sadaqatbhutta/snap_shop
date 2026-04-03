import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../core/firebase';
import { config } from '../core/config';
import { log } from '../core/logger';
import { normalizeMetaPayload } from './metaNormalizer';
import { sendMessage } from './channelSender';
import { connection } from '../core/queue';
import { Conversation } from '../../shared/types';

// ─── Deduplication ────────────────────────────────────────────────────────────
export async function isDuplicateAsync(id: string): Promise<boolean> {
  const result = await connection.set(`dedup:${id}`, '1', 'EX', 60, 'NX');
  return result === null;
}

// ─── AI Pipeline ──────────────────────────────────────────────────────────────
async function runAIPipeline(
  message: string,
  businessId: string,
  history: { role: 'user' | 'model'; content: string }[]
) {
  const bizDoc = await db.doc(`businesses/${businessId}`).get();
  const biz = bizDoc.data();
  if (!biz) return null;

  const systemInstruction = `You are a business assistant for ${biz.name}.
RULES:
- Only answer from the provided context and FAQs.
- Be concise and professional.
- Reply in the user's language (Urdu, English, Arabic, or Roman Urdu).
- If you don't know the answer, or the user asks for a human agent, set shouldEscalate to true.
- Do not hallucinate.
- Confidence must be between 0 and 1.

CONTEXT: ${biz.aiContext || ''}
FAQs: ${(biz.faqs || []).join('\n')}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: message }] },
    ],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent:         { type: Type.STRING },
          language:       { type: Type.STRING },
          confidence:     { type: Type.NUMBER },
          reply:          { type: Type.STRING },
          shouldEscalate: { type: Type.BOOLEAN },
        },
        required: ['intent', 'language', 'confidence', 'reply', 'shouldEscalate'],
      },
    },
  });

  const result = JSON.parse(response.text || '{}');
  const threshold = biz.confidenceThreshold ?? 0.7;
  return {
    intent:         result.intent         || 'unknown',
    language:       result.language       || 'unknown',
    confidence:     result.confidence     ?? 0,
    reply:          result.reply          || 'Let me connect you with a human agent.',
    shouldEscalate: result.shouldEscalate || (result.confidence ?? 0) < threshold,
  };
}

const ai  = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

// ─── Core Pipeline ────────────────────────────────────────────────────────────
export async function processWebhookJob(
  channel: string,
  body: Record<string, unknown>
): Promise<{
  status: string;
  id: string;
  conversationId: string;
  reply: string;
  intent: string;
  confidence: number;
}> {
  const payload = normalizeMetaPayload(channel, body);
  if (!payload) {
    log({ timestamp: new Date().toISOString(), level: 'warn', context: 'webhook_service', message: 'Ignoring non-message or malformed payload', channel, body });
    return { status: 'ignored', id: '', conversationId: '', reply: '', intent: '', confidence: 0 };
  }

  const msgId      = payload.message_id || uuidv4();
  const businessId = payload.business_id;
  const userId     = payload.user_id;
  const content    = payload.message;
  const now        = new Date().toISOString();

  if (await isDuplicateAsync(msgId)) {
    return { status: 'duplicate', id: msgId, conversationId: '', reply: '', intent: '', confidence: 0 };
  }

  const { customerId, conversationId, isNewConversation, isHumanHandling } = await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
    // 1. READS
    const customersRef = db.collection(`businesses/${businessId}/customers`);
    const custSnap = await transaction.get(
      customersRef.where('externalId', '==', userId).where('channel', '==', channel).limit(1)
    );

    let tempCustomerId: string;
    let customerDocRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
    let isNewCustomer = false;

    if (custSnap.empty) {
      tempCustomerId = uuidv4();
      customerDocRef = customersRef.doc(tempCustomerId);
      isNewCustomer = true;
    } else {
      tempCustomerId = custSnap.docs[0].id;
      customerDocRef = (custSnap as FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>).docs[0].ref;
    }

    const conversationsRef = db.collection(`businesses/${businessId}/conversations`);
    const convSnap = await transaction.get(
      conversationsRef.where('customerId', '==', tempCustomerId).where('status', '==', 'active').limit(1)
    );

    let tempConversationId: string;
    let convDocRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
    let tempIsNewConversation = false;
    let tempIsHumanHandling = false;

    if (convSnap.empty) {
      tempConversationId = uuidv4();
      convDocRef = conversationsRef.doc(tempConversationId);
      tempIsNewConversation = true;
    } else {
      tempConversationId = convSnap.docs[0].id;
      convDocRef = (convSnap as FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>).docs[0].ref;
      tempIsHumanHandling = (convSnap.docs[0].data() as any).status === 'human_escalated';
    }

    // 2. WRITES
    if (isNewCustomer) {
      transaction.set(customerDocRef, {
        id: tempCustomerId, businessId, channel,
        externalId: userId,
        name: (body.name as string) || userId,
        tags: [],
        createdAt: now,
        lastInteractionAt: now,
      });
    } else {
      transaction.update(customerDocRef, { lastInteractionAt: now });
    }

    if (tempIsNewConversation) {
      transaction.set(convDocRef, {
        id: tempConversationId, businessId, customerId: tempCustomerId,
        customerName: (body.name as string) || userId,
        channel, lastMessage: content,
        status: 'active',
        createdAt: now, updatedAt: now,
      });
    } else {
      transaction.update(convDocRef, { lastMessage: content, updatedAt: now });
    }

    return {
      customerId: tempCustomerId,
      conversationId: tempConversationId,
      isNewConversation: tempIsNewConversation,
      isHumanHandling: tempIsHumanHandling
    };
  });

  const convsRef = db.collection(`businesses/${businessId}/conversations`);

  const messagesRef = db.collection(
    `businesses/${businessId}/conversations/${conversationId}/messages`
  );
  const customerMsgId = uuidv4();
  await messagesRef.doc(customerMsgId).set({
    id: customerMsgId, conversationId, businessId,
    senderId: userId, senderType: 'customer',
    content, type: body.type || 'text',
    timestamp: now,
  });

  const historySnap = await messagesRef
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  const history = historySnap.docs
    .reverse()
    .filter((d: FirebaseFirestore.QueryDocumentSnapshot) => d.id !== customerMsgId)
    .map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({
      role: (d.data().senderType === 'customer' ? 'user' : 'model') as 'user' | 'model',
      content: d.data().content as string,
    }));

  let aiReply      = 'Let me connect you with a human agent.';
  let aiIntent     = 'unknown';
  let aiConfidence = 0;

  if (!isHumanHandling) {
    const aiResult = await runAIPipeline(content, businessId, history);
    if (aiResult) {
      aiReply      = aiResult.reply;
      aiIntent     = aiResult.intent;
      aiConfidence = aiResult.confidence;

      if (aiResult.shouldEscalate) {
        await convsRef.doc(conversationId).update({ status: 'human_escalated' });
      }

      const aiMsgId = uuidv4();
      await messagesRef.doc(aiMsgId).set({
        id: aiMsgId, conversationId, businessId,
        senderId: 'ai', senderType: 'ai',
        content: aiReply, type: 'text',
        intent: aiIntent,
        timestamp: new Date().toISOString(),
      });

      await convsRef.doc(conversationId).update({
        aiConfidence,
        updatedAt: new Date().toISOString(),
      });

      await sendMessage(channel, userId, aiReply, businessId);
    }
  }

  log({
    timestamp: new Date().toISOString(),
    level: 'info',
    channel: channel.toUpperCase(),
    user_id: userId,
    message: content,
    reply: aiReply,
    confidence: Math.round(aiConfidence * 100),
  });

  const today = new Date().toISOString().split('T')[0];
  const statsRef = db.doc(`businesses/${businessId}/stats/daily_${today}`);
  
  const statsUpdate: Record<string, FieldValue> = {
    totalMessages: FieldValue.increment(1),
    [`channelCounts.${channel}`]: FieldValue.increment(1),
    [`intentCounts.${aiIntent}`]: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp()
  };

  if (isNewConversation) {
    statsUpdate.totalConversations = FieldValue.increment(1);
  }

  const justEscalated = !isHumanHandling && aiReply === 'Let me connect you with a human agent.';
  if (justEscalated) {
    statsUpdate.escalations = FieldValue.increment(1);
  }

  await statsRef.set(statsUpdate, { merge: true });

  return { status: 'processed', id: msgId, conversationId, reply: aiReply, intent: aiIntent, confidence: aiConfidence };
}
