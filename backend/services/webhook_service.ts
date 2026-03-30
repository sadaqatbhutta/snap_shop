import { v4 as uuidv4 } from 'uuid';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../core/config';
import { log } from '../core/logger';

const db  = getFirestore();
const ai  = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

// ─── Deduplication ────────────────────────────────────────────────────────────
const processedIds = new Map<string, number>();
const DEDUP_TTL_MS = 60_000;

export function isDuplicate(id: string): boolean {
  const now = Date.now();
  for (const [k, v] of processedIds) {
    if (now - v > DEDUP_TTL_MS) processedIds.delete(k);
  }
  if (processedIds.has(id)) return true;
  processedIds.set(id, now);
  return false;
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
  const msgId      = (body.message_id as string) || uuidv4();
  const businessId = (body.business_id as string) || 'default';
  const userId     = (body.user_id as string) || 'unknown';
  const content    = (body.message as string) || '';
  const now        = new Date().toISOString();

  // Step 1 — Deduplication
  if (isDuplicate(msgId)) {
    return { status: 'duplicate', id: msgId, conversationId: '', reply: '', intent: '', confidence: 0 };
  }

  // Step 2 — Find or create customer
  const customersRef = db.collection(`businesses/${businessId}/customers`);
  const custSnap = await customersRef
    .where('externalId', '==', userId)
    .where('channel', '==', channel)
    .limit(1)
    .get();

  let customerId: string;
  if (custSnap.empty) {
    customerId = uuidv4();
    await customersRef.doc(customerId).set({
      id: customerId, businessId, channel,
      externalId: userId,
      name: body.name || userId,
      tags: [],
      createdAt: now,
      lastInteractionAt: now,
    });
  } else {
    customerId = custSnap.docs[0].id;
    await custSnap.docs[0].ref.update({ lastInteractionAt: now });
  }

  // Step 3 — Find or create active conversation
  const convsRef = db.collection(`businesses/${businessId}/conversations`);
  const convSnap = await convsRef
    .where('customerId', '==', customerId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  let conversationId: string;
  let isHumanHandling = false;

  if (convSnap.empty) {
    conversationId = uuidv4();
    await convsRef.doc(conversationId).set({
      id: conversationId, businessId, customerId,
      customerName: body.name || userId,
      channel, lastMessage: content,
      status: 'active',
      createdAt: now, updatedAt: now,
    });
  } else {
    conversationId = convSnap.docs[0].id;
    isHumanHandling = convSnap.docs[0].data().status === 'human_escalated';
    await convSnap.docs[0].ref.update({ lastMessage: content, updatedAt: now });
  }

  // Step 4 — Store inbound message
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

  // Step 5 — Load history
  const historySnap = await messagesRef
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  const history = historySnap.docs
    .reverse()
    .filter(d => d.id !== customerMsgId)
    .map(d => ({
      role: (d.data().senderType === 'customer' ? 'user' : 'model') as 'user' | 'model',
      content: d.data().content as string,
    }));

  // Step 6 — AI Decision Engine
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

  return { status: 'processed', id: msgId, conversationId, reply: aiReply, intent: aiIntent, confidence: aiConfidence };
}
