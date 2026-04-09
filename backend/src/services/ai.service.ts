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
