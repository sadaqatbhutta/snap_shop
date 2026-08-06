import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../config/firebase.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

export type CustomerMemory = {
  summary: string;
  preferences: string[];
  purchaseIntent?: string;
  lastTopics: string[];
  leadScoreHint?: number;
  updatedAt: string;
};

export async function getCustomerMemory(businessId: string, customerId: string): Promise<CustomerMemory | null> {
  const snap = await db.doc(`businesses/${businessId}/customers/${customerId}/private/memory`).get();
  if (!snap.exists) return null;
  return snap.data() as CustomerMemory;
}

export function formatMemoryForPrompt(memory: CustomerMemory | null): string {
  if (!memory) return 'No prior customer memory.';
  return [
    `Summary: ${memory.summary || 'n/a'}`,
    `Preferences: ${(memory.preferences || []).join(', ') || 'none'}`,
    `Purchase intent: ${memory.purchaseIntent || 'unknown'}`,
    `Recent topics: ${(memory.lastTopics || []).join(', ') || 'none'}`,
  ].join('\n');
}

export async function updateCustomerMemory(params: {
  businessId: string;
  customerId: string;
  customerMessage: string;
  aiReply: string;
  intent: string;
  existing?: CustomerMemory | null;
}): Promise<CustomerMemory> {
  const { businessId, customerId, customerMessage, aiReply, intent, existing } = params;
  const prior = existing ? formatMemoryForPrompt(existing) : 'None';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user' as any,
          parts: [{
            text: `Update CRM memory for a customer based on this turn.
Previous memory:
${prior}

Latest customer message: ${customerMessage}
Assistant reply: ${aiReply}
Detected intent: ${intent}

Return compact JSON memory fields.`,
          }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            preferences: { type: Type.ARRAY, items: { type: Type.STRING } },
            purchaseIntent: { type: Type.STRING },
            lastTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            leadScoreHint: { type: Type.NUMBER },
          },
          required: ['summary', 'preferences', 'purchaseIntent', 'lastTopics'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const memory: CustomerMemory = {
      summary: String(parsed.summary || existing?.summary || '').slice(0, 800),
      preferences: Array.isArray(parsed.preferences)
        ? parsed.preferences.map(String).slice(0, 8)
        : existing?.preferences || [],
      purchaseIntent: String(parsed.purchaseIntent || existing?.purchaseIntent || 'unknown').slice(0, 120),
      lastTopics: Array.isArray(parsed.lastTopics)
        ? parsed.lastTopics.map(String).slice(0, 6)
        : existing?.lastTopics || [],
      leadScoreHint:
        typeof parsed.leadScoreHint === 'number'
          ? Math.max(0, Math.min(100, parsed.leadScoreHint))
          : existing?.leadScoreHint,
      updatedAt: new Date().toISOString(),
    };

    await db.doc(`businesses/${businessId}/customers/${customerId}/private/memory`).set(memory, { merge: true });
    return memory;
  } catch (err) {
    logger.warn({ err, businessId, customerId }, 'Failed to update customer memory');
    const fallback: CustomerMemory = {
      summary: existing?.summary || customerMessage.slice(0, 200),
      preferences: existing?.preferences || [],
      purchaseIntent: existing?.purchaseIntent || intent,
      lastTopics: [...(existing?.lastTopics || []).slice(-5), intent].slice(-6),
      leadScoreHint: existing?.leadScoreHint,
      updatedAt: new Date().toISOString(),
    };
    await db.doc(`businesses/${businessId}/customers/${customerId}/private/memory`).set(fallback, { merge: true });
    return fallback;
  }
}
