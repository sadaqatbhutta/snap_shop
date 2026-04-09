import { Router } from 'express';
import { validateBody } from '../middlewares/validation.js';
import { verifyFirebaseToken, verifyBusinessAccess } from '../middlewares/auth.js';
import { ProcessAIMessageSchema } from '../validations/ai.js';
import { processAI } from '../controllers/ai.controller.js';

export const aiRouter = Router();

aiRouter.post('/process', verifyFirebaseToken, verifyBusinessAccess, validateBody(ProcessAIMessageSchema), processAI);
