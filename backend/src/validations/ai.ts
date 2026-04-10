import { z } from 'zod';

export const ProcessAIMessageSchema = z.object({
  message: z.string().trim().min(1, 'message is required'),
  conversationId: z.string().trim().min(1, 'conversationId is required'),
  businessId: z.string().trim().min(1, 'businessId is required'),
});

export const SuggestReplySchema = z.object({
  businessId: z.string().trim().min(1, 'businessId is required'),
  conversationId: z.string().trim().min(1, 'conversationId is required'),
});

export const GenerateBroadcastCopySchema = z.object({
  businessId: z.string().trim().min(1, 'businessId is required'),
  objective: z.string().trim().min(1, 'objective is required'),
  segmentName: z.string().trim().optional(),
  templateName: z.string().trim().optional(),
});

export const SummarizeConversationSchema = z.object({
  businessId: z.string().trim().min(1, 'businessId is required'),
  conversationId: z.string().trim().min(1, 'conversationId is required'),
});
