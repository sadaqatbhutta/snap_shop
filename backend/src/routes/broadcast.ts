import { Router } from 'express';
import { validateBody } from '../middlewares/validation.js';
import { verifyFirebaseToken } from '../middlewares/auth.js';
import { BroadcastSchema } from '../validations/broadcast.js';
import { triggerBroadcast } from '../controllers/broadcast.controller.js';

export const broadcastRouter = Router();

broadcastRouter.post('/:broadcastId', verifyFirebaseToken, validateBody(BroadcastSchema), triggerBroadcast);
