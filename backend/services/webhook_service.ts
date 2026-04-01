import { v4 as uuidv4 } from 'uuid';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { getApps, initializeApp } from 'firebase-admin/app';
import { config } from '../core/config';
import { log } from '../core/logger';
import { normalizeMetaPayload } from './metaNormalizer';
import { sendMessage } from './channelSender';

if (!getApps().length) initializeApp({ projectId: config.VITE_FIREBASE_PROJECT_ID });
const db  = getFirestore();
const ai  = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

import { connection } from '../core/queue';

// ─── Deduplication ────────────────────────────────────────────────────────────
export async function isDuplicateAsync(id: string): Promise<boolean> {
  // SET with NX (Only set if not exists) and EX (Expire after 60 seconds)
  const result = await connection.set(`dedup:${id}`, '1', 'EX', 60, 'NX');
  // Returns true (duplicate) if SET returned null (key already existed)
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

  // Step 1 — Deduplication
  if (await isDuplicateAsync(msgId)) {
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

  let isNewConversation = false;
  if (convSnap.empty) {
    conversationId = uuidv4();
    isNewConversation = true;
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

      // Step 7 — Send outbound reply
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

  // Step 8 — Update Stats Aggregation
  const today = new Date().toISOString().split('T')[0];
  const statsRef = db.doc(`businesses/${businessId}/stats/daily_${today}`);
  
  const statsUpdate: any = {
    totalMessages: FieldValue.increment(1),
    [`channelCounts.${channel}`]: FieldValue.increment(1),
    [`intentCounts.${aiIntent}`]: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp()
  };

  if (isNewConversation) {
    statsUpdate.totalConversations = FieldValue.increment(1);
  }

  // Check if we just escalated in this job
  const justEscalated = !isHumanHandling && aiReply === 'Let me connect you with a human agent.';
  if (justEscalated) {
    statsUpdate.escalations = FieldValue.increment(1);
  }

  await statsRef.set(statsUpdate, { merge: true });

  return { status: 'processed', id: msgId, conversationId, reply: aiReply, intent: aiIntent, confidence: aiConfidence };
}

// ─── Inline Local Test Runner ────────────────────────────────────────────────
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('webhook_service.ts')) {
  console.log('\n🚀 Running webhook_service.ts directly...');
  console.log('Replacing Firestore and Gemini with mocks so it works without credentials!');
  
  // 1. Mock the Firestore Database instance perfectly
  const mockChain = () => {
    const chain: any = {
      where: () => chain,
      limit: () => chain,
      orderBy: () => chain,
      get: async () => ({ empty: true, docs: [] }), // simulates new customer/conversation
      doc: (id?: string) => ({
        get: async () => ({
          data: () => ({ name: 'SnapShop Demo Biz', aiContext: 'Mock context', faqs: ['Refund policy: 30 days'] })
        }),
        set: async () => {},
        update: async () => {}
      })
    };
    return chain;
  };
  (db as any).collection = () => mockChain();
  (db as any).doc = () => mockChain().doc();

  // 2. Mock the Gemini AI instance
  (ai as any).models = {
    generateContent: async () => ({
      text: JSON.stringify({
        intent: 'greeting',
        language: 'english',
        confidence: 0.95,
        reply: 'Hello from the SnapShop Mock AI! I can help you with anything.',
        shouldEscalate: false
      })
    })
  };

  // 3. Run the pipeline with the provided test number
  console.log('\n⚡ Dispatching test job pipeline...');
  processWebhookJob('whatsapp', {
    message_id: 'test-12345',
    business_id: 'demo-biz',
    user_id: '+923011284483',
    message: 'Hello, what is your refund policy?',
    type: 'text'
  })
    .then(result => {
      console.log('\n✅ Pipeline Result:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Error:', err);
      process.exit(1);
    });
}
