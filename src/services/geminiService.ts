/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface AIResponse {
  intent: string;
  language: string;
  confidence: number;
  reply: string;
  shouldEscalate: boolean;
}

export async function processMessage(
  message: string,
  businessName: string,
  businessContext: string,
  faqs: string[],
  conversationHistory: { role: 'user' | 'model', content: string }[]
): Promise<AIResponse> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
You are a business assistant for ${businessName}.
Your goal is to help customers with their inquiries, orders, and complaints.

RULES:
- Only answer from the provided context and FAQs.
- Be concise and professional.
- Reply in the user's language (Urdu, English, Arabic, or Roman Urdu).
- If you don't know the answer, or if the user asks for a human agent, set shouldEscalate to true.
- Do not hallucinate or make up information.
- Confidence should be between 0 and 1.

CONTEXT:
${businessContext}

FAQs:
${faqs.join('\n')}
`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      ...conversationHistory.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING, description: "The detected intent of the user message (e.g., inquiry, order_request, complaint, greeting, spam)" },
          language: { type: Type.STRING, description: "The detected language of the message" },
          confidence: { type: Type.NUMBER, description: "Confidence score of the AI response" },
          reply: { type: Type.STRING, description: "The generated response to the user" },
          shouldEscalate: { type: Type.BOOLEAN, description: "Whether the conversation should be escalated to a human agent" }
        },
        required: ["intent", "language", "confidence", "reply", "shouldEscalate"]
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  return {
    intent: result.intent || 'unknown',
    language: result.language || 'unknown',
    confidence: result.confidence || 0,
    reply: result.reply || "I'm sorry, I couldn't process that. Let me connect you with a human agent.",
    shouldEscalate: result.shouldEscalate || result.confidence < 0.7
  };
}
