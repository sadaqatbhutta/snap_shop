import { z } from 'zod';

export const BroadcastSchema = z.object({
  businessId: z.string().trim().min(1, 'businessId is required'),
  scheduledAt: z.string().optional().refine(value => {
    if (!value) return true;
    return !Number.isNaN(Date.parse(value));
  }, 'scheduledAt must be a valid ISO timestamp'),
});
