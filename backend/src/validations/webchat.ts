import { z } from 'zod';

export const WebchatMessageSchema = z.object({
  business_id: z.string().trim().min(1, 'business_id is required'),
  user_id: z.string().trim().min(1, 'user_id is required'),
  message: z.string().trim().min(1, 'message is required'),
  type: z.enum(['text', 'image', 'audio', 'video', 'document', 'voice']).default('text'),
  name: z.string().trim().optional(),
  message_id: z.string().trim().optional(),
  media_url: z.string().url().optional(),
});

export const WebchatPollSchema = z.object({
  business_id: z.string().trim().min(1),
  user_id: z.string().trim().min(1),
});
