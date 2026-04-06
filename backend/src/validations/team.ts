import { z } from 'zod';

export const InviteTeamSchema = z.object({
  businessId: z.string().trim().min(1, 'businessId is required'),
  email: z.string().email('email must be valid'),
  role: z.enum(['admin', 'agent']),
});

export const AcceptInviteSchema = z.object({
  token: z.string().trim().min(1, 'token is required'),
});
