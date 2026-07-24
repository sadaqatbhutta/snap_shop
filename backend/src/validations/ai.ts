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

export const CustomerCopilotSchema = z.object({
  businessId: z.string().trim().min(1),
  customerId: z.string().trim().min(1),
});

export const AiFeedbackSchema = z.object({
  businessId: z.string().trim().min(1),
  conversationId: z.string().trim().min(1),
  messageId: z.string().trim().optional(),
  rating: z.enum(['up', 'down']),
  note: z.string().trim().max(500).optional(),
});

export const KnowledgeUpsertSchema = z.object({
  businessId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(50000),
  source: z.string().trim().max(100).optional(),
  docId: z.string().trim().optional(),
});

export const KnowledgeDeleteSchema = z.object({
  businessId: z.string().trim().min(1),
  docId: z.string().trim().min(1),
});

export const WorkflowUpsertSchema = z.object({
  businessId: z.string().trim().min(1),
  id: z.string().trim().optional(),
  name: z.string().trim().min(1).max(120),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  match: z
    .object({
      intentContains: z.array(z.string()).optional(),
      messageContains: z.array(z.string()).optional(),
      channel: z.array(z.string()).optional(),
      confidenceBelow: z.number().min(0).max(1).optional(),
    })
    .optional(),
  actions: z.array(
    z.enum([
      'escalate',
      'tag_hot',
      'tag_urgent',
      'assign_sales',
      'assign_support',
      'assign_billing',
      'skip_ai',
      'add_tag',
    ])
  ).min(1),
  tagToAdd: z.string().trim().max(60).optional(),
});

export const WorkflowDeleteSchema = z.object({
  businessId: z.string().trim().min(1),
  ruleId: z.string().trim().min(1),
});

export const PromptVariantSchema = z.object({
  businessId: z.string().trim().min(1),
  variant: z.enum(['A', 'B']),
});
