import { Router } from 'express';
import { validateBody } from '../middlewares/validation.js';
import { verifyFirebaseToken, verifyBusinessAccess } from '../middlewares/auth.js';
import {
  ProcessAIMessageSchema,
  SuggestReplySchema,
  GenerateBroadcastCopySchema,
  SummarizeConversationSchema,
} from '../validations/ai.js';
import { processAI, suggestReply, generateBroadcast, summarizeThread } from '../controllers/ai.controller.js';

export const aiRouter = Router();

aiRouter.post('/process', verifyFirebaseToken, verifyBusinessAccess, validateBody(ProcessAIMessageSchema), processAI);
aiRouter.post('/suggest-reply', verifyFirebaseToken, verifyBusinessAccess, validateBody(SuggestReplySchema), suggestReply);
aiRouter.post('/generate-broadcast', verifyFirebaseToken, verifyBusinessAccess, validateBody(GenerateBroadcastCopySchema), generateBroadcast);
aiRouter.post('/summarize', verifyFirebaseToken, verifyBusinessAccess, validateBody(SummarizeConversationSchema), summarizeThread);
