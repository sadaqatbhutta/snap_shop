import { z } from 'zod';

export const ProcessAIMessageSchema = z.object({
  message: z.string().trim().min(1, 'message is required'),
  conversationId: z.string().trim().min(1, 'conversationId is required'),
  businessId: z.string().trim().min(1, 'businessId is required'),
});
