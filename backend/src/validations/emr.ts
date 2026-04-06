import { z } from 'zod';

export const EMRSchema = z.object({
  path: z.string().trim().min(1, 'path is required'),
  payload: z.record(z.string(), z.unknown()).default({}),
});
