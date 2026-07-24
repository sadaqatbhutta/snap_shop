import { Router } from 'express';
import { validateBody } from '../middlewares/validation.js';
import { verifyFirebaseToken, verifyBusinessAccess } from '../middlewares/auth.js';
import {
  ProcessAIMessageSchema,
  SuggestReplySchema,
  GenerateBroadcastCopySchema,
  SummarizeConversationSchema,
  CustomerCopilotSchema,
  AiFeedbackSchema,
  KnowledgeUpsertSchema,
  KnowledgeDeleteSchema,
  WorkflowUpsertSchema,
  WorkflowDeleteSchema,
  PromptVariantSchema,
} from '../validations/ai.js';
import {
  processAI,
  suggestReply,
  generateBroadcast,
  summarizeThread,
  customerCopilot,
  submitFeedback,
  listFeedback,
  upsertKnowledge,
  listKnowledge,
  removeKnowledge,
  getWorkflows,
  saveWorkflow,
  removeWorkflow,
  setPromptVariant,
} from '../controllers/ai.controller.js';

export const aiRouter = Router();

aiRouter.post('/process', verifyFirebaseToken, verifyBusinessAccess, validateBody(ProcessAIMessageSchema), processAI);
aiRouter.post('/suggest-reply', verifyFirebaseToken, verifyBusinessAccess, validateBody(SuggestReplySchema), suggestReply);
aiRouter.post('/generate-broadcast', verifyFirebaseToken, verifyBusinessAccess, validateBody(GenerateBroadcastCopySchema), generateBroadcast);
aiRouter.post('/summarize', verifyFirebaseToken, verifyBusinessAccess, validateBody(SummarizeConversationSchema), summarizeThread);
aiRouter.post('/copilot', verifyFirebaseToken, verifyBusinessAccess, validateBody(CustomerCopilotSchema), customerCopilot);
aiRouter.post('/feedback', verifyFirebaseToken, verifyBusinessAccess, validateBody(AiFeedbackSchema), submitFeedback);
aiRouter.get('/feedback', verifyFirebaseToken, verifyBusinessAccess, listFeedback);

aiRouter.get('/knowledge', verifyFirebaseToken, verifyBusinessAccess, listKnowledge);
aiRouter.post('/knowledge', verifyFirebaseToken, verifyBusinessAccess, validateBody(KnowledgeUpsertSchema), upsertKnowledge);
aiRouter.post('/knowledge/delete', verifyFirebaseToken, verifyBusinessAccess, validateBody(KnowledgeDeleteSchema), removeKnowledge);

aiRouter.get('/workflows', verifyFirebaseToken, verifyBusinessAccess, getWorkflows);
aiRouter.post('/workflows', verifyFirebaseToken, verifyBusinessAccess, validateBody(WorkflowUpsertSchema), saveWorkflow);
aiRouter.post('/workflows/delete', verifyFirebaseToken, verifyBusinessAccess, validateBody(WorkflowDeleteSchema), removeWorkflow);

aiRouter.post('/prompt-variant', verifyFirebaseToken, verifyBusinessAccess, validateBody(PromptVariantSchema), setPromptVariant);
