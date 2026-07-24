import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../config/firebase.js';
import { config } from '../config/config.js';
import { retrieveRelevantKnowledge, formatKnowledgeForPrompt } from './rag.service.js';
import { getCustomerMemory, formatMemoryForPrompt, updateCustomerMemory, CustomerMemory } from './memory.service.js';
import { detectLikelyTools, executeTool, formatToolResultsForPrompt, ToolResult } from './tools.service.js';
import { listWorkflows, evaluateWorkflows, WorkflowDecision } from './workflow.service.js';
import { getImprovementHints } from './feedback.service.js';
import { understandMediaMessage, MultimodalInput } from './multimodal.service.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
const AI_MODEL = 'gemini-2.0-flash';

export type AIHistoryItem = { role: 'user' | 'model'; content: string };

export type AIPipelineResult = {
  intent: string;
  language: string;
  confidence: number;
  reply: string;
  shouldEscalate: boolean;
  leadScoreHint?: number;
  buySignal?: boolean;
  toolsUsed: string[];
  workflow: WorkflowDecision;
  knowledgeUsed: number;
};

export type RunAIPipelineOptions = {
  customerId?: string;
  channel?: string;
  media?: MultimodalInput;
};

async function buildSystemInstruction(businessId: string, message: string, customerId?: string) {
  const bizSnap = await db.doc(`businesses/${businessId}`).get();
  const biz = bizSnap.data() || {};

  const businessName = biz.name || 'the business';
  const aiContext = biz.aiContext || 'No additional context provided.';
  const faqs = (biz.faqs || []).join('\n') || 'No FAQs configured.';
  const confidenceThreshold = biz.confidenceThreshold ?? 0.7;
  const promptVariant = biz.aiPromptVariant === 'B' ? 'B' : 'A';

  const [knowledge, memory, hints] = await Promise.all([
    retrieveRelevantKnowledge(businessId, message, 4),
    customerId ? getCustomerMemory(businessId, customerId) : Promise.resolve(null),
    getImprovementHints(businessId, 5),
  ]);

  const variantExtra =
    promptVariant === 'B'
      ? '- Prefer short WhatsApp-style replies (1-3 sentences) with a clear next question when helpful.\n'
      : '- Be concise and professional; use a warm brand voice.\n';

  const systemInstruction = `You are an AI sales & support agent for ${businessName}.

RULES:
- Prefer answers grounded in BUSINESS CONTEXT, FAQs, RETRIEVED KNOWLEDGE, CUSTOMER MEMORY, and TOOL RESULTS
- ${variantExtra}- Reply in the user's language (Urdu, English, Arabic, or Roman Urdu)
- If you don't know, or the user asks for a human, set shouldEscalate to true
- Do not invent order statuses, stock, prices, or policies
- Confidence must be between 0 and 1
- Set buySignal true when the customer shows clear purchase intent
- leadScoreHint is 0-100 urgency/opportunity for a human sales agent

BUSINESS CONTEXT:
${aiContext}

FREQUENTLY ASKED QUESTIONS:
${faqs}

RETRIEVED KNOWLEDGE:
${formatKnowledgeForPrompt(knowledge)}

CUSTOMER MEMORY:
${formatMemoryForPrompt(memory)}

QUALITY IMPROVEMENT HINTS (avoid repeating past mistakes):
${hints.length ? hints.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'None'}
`;

  return { systemInstruction, confidenceThreshold, memory, knowledgeCount: knowledge.length, promptVariant };
}

export async function runAIPipeline(
  message: string,
  businessId: string,
  history: AIHistoryItem[],
  options: RunAIPipelineOptions = {}
): Promise<AIPipelineResult> {
  let effectiveMessage = message;
  if (options.media && options.media.type && options.media.type !== 'text') {
    effectiveMessage = await understandMediaMessage(businessId, {
      ...options.media,
      text: message,
    });
  }

  const toolCalls = detectLikelyTools(effectiveMessage);
  const toolResults: ToolResult[] = [];
  for (const call of toolCalls) {
    toolResults.push(
      await executeTool(businessId, call, {
        customerId: options.customerId,
      })
    );
  }

  const { systemInstruction, confidenceThreshold, memory, knowledgeCount } = await buildSystemInstruction(
    businessId,
    effectiveMessage,
    options.customerId
  );

  const toolBlock = formatToolResultsForPrompt(toolResults);
  const userPayload = toolResults.length
    ? `${effectiveMessage}\n\nTOOL RESULTS:\n${toolBlock}`
    : effectiveMessage;

  const response = await ai.models.generateContent({
    model: AI_MODEL,
    contents: [
      ...history.map(item => ({ role: item.role as any, parts: [{ text: item.content }] })),
      { role: 'user' as any, parts: [{ text: userPayload }] },
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
          leadScoreHint: { type: Type.NUMBER },
          buySignal: { type: Type.BOOLEAN },
        },
        required: ['intent', 'language', 'confidence', 'reply', 'shouldEscalate'],
      },
    },
  });

  const result = JSON.parse(response.text || '{}');
  const confidence = result.confidence ?? 0;
  let shouldEscalate = Boolean(result.shouldEscalate) || confidence < confidenceThreshold;

  const rules = await listWorkflows(businessId);
  const workflow = evaluateWorkflows(rules, {
    message: effectiveMessage,
    intent: result.intent,
    channel: options.channel,
    confidence,
  });

  if (workflow.shouldEscalate) shouldEscalate = true;
  if (workflow.skipAi) {
    shouldEscalate = true;
  }

  const pipelineResult: AIPipelineResult = {
    intent: result.intent || 'unknown',
    language: result.language || 'unknown',
    confidence,
    reply: workflow.skipAi
      ? 'Thanks — connecting you with a specialist now.'
      : result.reply || 'Let me connect you with a human agent.',
    shouldEscalate,
    leadScoreHint: typeof result.leadScoreHint === 'number' ? result.leadScoreHint : memory?.leadScoreHint,
    buySignal: Boolean(result.buySignal),
    toolsUsed: toolResults.map(t => t.name),
    workflow,
    knowledgeUsed: knowledgeCount,
  };

  if (options.customerId) {
    void updateCustomerMemory({
      businessId,
      customerId: options.customerId,
      customerMessage: effectiveMessage,
      aiReply: pipelineResult.reply,
      intent: pipelineResult.intent,
      existing: memory,
    });
  }

  return pipelineResult;
}

export async function processAIMessage(message: string, conversationId: string, businessId: string) {
  const convSnap = await db.doc(`businesses/${businessId}/conversations/${conversationId}`).get();
  const customerId = convSnap.data()?.customerId as string | undefined;
  const channel = convSnap.data()?.channel as string | undefined;

  const messagesRef = db.collection(`businesses/${businessId}/conversations/${conversationId}/messages`);
  const historySnap = await messagesRef.orderBy('timestamp', 'desc').limit(10).get();
  const history = historySnap.docs
    .reverse()
    .map(doc => ({
      role: (doc.data().senderType === 'customer' ? 'user' : 'model') as 'user' | 'model',
      content: doc.data().content as string,
    }))
    .filter(item => item.content);

  return runAIPipeline(message, businessId, history, { customerId, channel });
}

export async function suggestReplyForConversation(businessId: string, conversationId: string) {
  const conversationRef = db.doc(`businesses/${businessId}/conversations/${conversationId}`);
  const conversationSnap = await conversationRef.get();
  if (!conversationSnap.exists) {
    throw new Error('Conversation not found');
  }

  const conv = conversationSnap.data() || {};
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
    })),
    { customerId: conv.customerId, channel: conv.channel }
  );

  return {
    suggestedReply: result.reply,
    intent: result.intent,
    confidence: result.confidence,
    leadScoreHint: result.leadScoreHint,
    toolsUsed: result.toolsUsed,
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
  const knowledge = await retrieveRelevantKnowledge(businessId, objective, 3);

  const response = await ai.models.generateContent({
    model: AI_MODEL,
    contents: [
      {
        role: 'user' as any,
        parts: [{
          text: `Create a concise broadcast campaign idea for ${businessName}.
Objective: ${objective}
Segment: ${segmentName || 'general audience'}
Template context: ${templateName || 'not provided'}
Knowledge:
${formatKnowledgeForPrompt(knowledge)}

Return JSON with fields:
- campaignName
- rationale (short)
- messageDraft (ready-to-send body)
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
          messageDraft: { type: Type.STRING },
        },
        required: ['campaignName', 'rationale', 'messageDraft'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  return {
    campaignName: parsed.campaignName || 'New Campaign',
    rationale: parsed.rationale || 'Generated from campaign objective.',
    messageDraft: parsed.messageDraft || '',
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
  const customerId = convSnap.data()?.customerId as string | undefined;
  const memory = customerId ? await getCustomerMemory(businessId, customerId) : null;

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
    model: AI_MODEL,
    contents: [
      {
        role: 'user' as any,
        parts: [{
          text: `Summarize this customer support thread for "${businessName}" in plain language.
Provide a short summary (3-6 sentences) and one recommended next action for a human agent.
Customer memory:
${formatMemoryForPrompt(memory)}
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

/** CRM copilot: next best action for a customer */
export async function generateCustomerCopilot(businessId: string, customerId: string) {
  const custRef = db.doc(`businesses/${businessId}/customers/${customerId}`);
  const custSnap = await custRef.get();
  if (!custSnap.exists) throw new Error('Customer not found');
  const customer = custSnap.data() || {};
  const memory = await getCustomerMemory(businessId, customerId);

  let recent = '';
  try {
    const convSnap = await db
      .collection(`businesses/${businessId}/conversations`)
      .where('customerId', '==', customerId)
      .orderBy('updatedAt', 'desc')
      .limit(3)
      .get();
    recent = convSnap.docs
      .map(d => {
        const x = d.data();
        return `- ${x.channel}: ${x.lastMessage} (status=${x.status}, priority=${x.leadPriority || 'n/a'})`;
      })
      .join('\n');
  } catch {
    const convSnap = await db
      .collection(`businesses/${businessId}/conversations`)
      .where('customerId', '==', customerId)
      .limit(5)
      .get();
    recent = convSnap.docs
      .map(d => {
        const x = d.data();
        return `- ${x.channel}: ${x.lastMessage} (status=${x.status})`;
      })
      .join('\n');
  }

  const response = await ai.models.generateContent({
    model: AI_MODEL,
    contents: [
      {
        role: 'user' as any,
        parts: [{
          text: `You are a CRM sales copilot. Suggest the next best action for this lead.
Customer: ${customer.name} (${customer.channel})
Tags: ${(customer.tags || []).join(', ') || 'none'}
Notes: ${customer.notes || 'none'}
Memory:
${formatMemoryForPrompt(memory)}
Recent conversations:
${recent || 'none'}`,
        }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nextBestAction: { type: Type.STRING },
          rationale: { type: Type.STRING },
          suggestedMessage: { type: Type.STRING },
          priority: { type: Type.STRING },
        },
        required: ['nextBestAction', 'rationale', 'suggestedMessage', 'priority'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  return {
    nextBestAction: parsed.nextBestAction || 'Follow up',
    rationale: parsed.rationale || '',
    suggestedMessage: parsed.suggestedMessage || '',
    priority: parsed.priority || 'medium',
    memory: memory as CustomerMemory | null,
  };
}
