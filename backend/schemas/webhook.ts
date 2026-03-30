import { z } from 'zod';

export const WebhookSchema = z.object({
  business_id: z.string().min(1, 'business_id is required'),
  user_id: z.string().min(1, 'user_id is required'),
  message: z.string().min(1, 'message is required'),
  type: z.enum(['text', 'image', 'voice']).default('text'),
  name: z.string().optional(),
  message_id: z.string().optional(),
});

export type WebhookPayload = z.infer<typeof WebhookSchema>;
