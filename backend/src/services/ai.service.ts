import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../config/firebase.js';
import { config } from '../config/config.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

export type AIHistoryItem = { role: 'user' | 'model'; content: string };

export async function runAIPipeline(message: string, businessId: string, history: AIHistoryItem[]) {
  const bizSnap = await db.doc(`businesses/${businessId}`).get();
  const biz = bizSnap.data() || {};

  const businessName = biz.name || 'the business';
  const aiContext = biz.aiContext || 'No additional context provided.';
  const faqs = (biz.faqs || []).join('\n') || 'No FAQs configured.';
  const confidenceThreshold = biz.confidenceThreshold ?? 0.7;

  const systemInstruction = `You are a customer care assistant for ${businessName}.

RULES:
- Only answer from the provided context and FAQs below
- Be concise and professional
- Reply in the user's language (Urdu, English, Arabic, or Roman Urdu)
- If you don't know the answer, or the user asks for a human agent, set shouldEscalate to true
- Do not hallucinate or make up information
- Confidence must be between 0 and 1

BUSINESS CONTEXT:
${aiContext}

FREQUENTLY ASKED QUESTIONS:
${faqs}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      ...history.map(item => ({ role: item.role as any, parts: [{ text: item.content }] })),
      { role: 'user' as any, parts: [{ text: message }] },
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
  const confidence = result.confidence ?? 0;
  const shouldEscalate = result.shouldEscalate || confidence < confidenceThreshold;

  return {
    intent: result.intent || 'unknown',
    language: result.language || 'unknown',
    confidence,
    reply: result.reply || 'Let me connect you with a human agent.',
    shouldEscalate,
  };
}

export async function processAIMessage(message: string, conversationId: string, businessId: string) {
  const messagesRef = db.collection(`businesses/${businessId}/conversations/${conversationId}/messages`);
  const historySnap = await messagesRef.orderBy('timestamp', 'desc').limit(10).get();
  const history = historySnap.docs
    .reverse()
    .map(doc => ({
      role: (doc.data().senderType === 'customer' ? 'user' : 'model') as 'user' | 'model',
      content: doc.data().content as string,
    }))
    .filter(item => item.content);

  return runAIPipeline(message, businessId, history);
}

export async function suggestReplyForConversation(businessId: string, conversationId: string) {
  const conversationRef = db.doc(`businesses/${businessId}/conversations/${conversationId}`);
  const conversationSnap = await conversationRef.get();
  if (!conversationSnap.exists) {
    throw new Error('Conversation not found');
  }

  const messagesRef = db.collection(`businesses/${businessId}/conversations/${conversationId}/messages`);
  const historySnap = await messagesRef.orderBy('timestamp', 'desc').limit(12).get();
  const historyDocs = historySnap.docs.reverse().map(doc => doc.data() as any);
  const lastCustomerMessage = [...historyDocs].reverse().find(m => m.senderType === 'customer')?.content || '';
  if (!lastCustomerMessage) {
    return { suggestedReply: 'Thanks for reaching out. How can I help you today?' };
  }

  const result = await runAIPipeline(
    lastCustomerMessage,
    businessId,
    historyDocs.map(m => ({
      role: (m.senderType === 'customer' ? 'user' : 'model') as 'user' | 'model',
      content: m.content as string,
    }))
  );

  return {
    suggestedReply: result.reply,
    intent: result.intent,
    confidence: result.confidence,
  };
}

export async function generateBroadcastCopy(
  businessId: string,
  objective: string,
  segmentName?: string,
  templateName?: string
) {
  const bizSnap = await db.doc(`businesses/${businessId}`).get();
  const biz = bizSnap.data() || {};
  const businessName = biz.name || 'the business';

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user' as any,
        parts: [{
          text: `Create a concise broadcast campaign idea for ${businessName}.
Objective: ${objective}
Segment: ${segmentName || 'general audience'}
Template context: ${templateName || 'not provided'}

Return JSON with fields:
- campaignName
- rationale (short)
`,
        }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          campaignName: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
        required: ['campaignName', 'rationale'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  return {
    campaignName: parsed.campaignName || 'New Campaign',
    rationale: parsed.rationale || 'Generated from campaign objective.',
  };
}

export async function summarizeConversation(businessId: string, conversationId: string) {
  const convRef = db.doc(`businesses/${businessId}/conversations/${conversationId}`);
  const convSnap = await convRef.get();
  if (!convSnap.exists) {
    throw new Error('Conversation not found');
  }

  const bizSnap = await db.doc(`businesses/${businessId}`).get();
  const businessName = (bizSnap.data()?.name as string) || 'the business';

  const messagesRef = db.collection(`businesses/${businessId}/conversations/${conversationId}/messages`);
  const snap = await messagesRef.orderBy('timestamp', 'desc').limit(40).get();
  const lines = snap.docs
    .reverse()
    .map(d => {
      const x = d.data() as Record<string, unknown>;
      const who =
        x.senderType === 'customer' ? 'Customer' : x.senderType === 'ai' ? 'AI' : 'Agent';
      return `${who}: ${x.content}`;
    })
    .join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user' as any,
        parts: [{
          text: `Summarize this customer support thread for "${businessName}" in plain language.
Provide a short summary (3-6 sentences) and one recommended next action for a human agent.
Conversation:
${lines || '(empty)'}`,
        }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          nextAction: { type: Type.STRING },
        },
        required: ['summary', 'nextAction'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  const summary = String(parsed.summary || '').trim() || 'No summary available.';
  const nextAction = String(parsed.nextAction || '').trim() || 'Follow up with the customer if needed.';

  await convRef.update({
    threadSummary: summary,
    threadSummaryNextAction: nextAction,
    updatedAt: new Date().toISOString(),
  });

  return { summary, nextAction };
}
