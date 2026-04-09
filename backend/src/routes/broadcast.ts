import { Router } from 'express';
import { validateBody } from '../middlewares/validation.js';
import { verifyFirebaseToken, verifyBusinessAccess } from '../middlewares/auth.js';
import { BroadcastSchema } from '../validations/broadcast.js';
import { triggerBroadcast, deleteBroadcast } from '../controllers/broadcast.controller.js';

export const broadcastRouter = Router();

broadcastRouter.post('/:broadcastId', verifyFirebaseToken, verifyBusinessAccess, validateBody(BroadcastSchema), triggerBroadcast);
broadcastRouter.delete('/:broadcastId', verifyFirebaseToken, verifyBusinessAccess, validateBody(BroadcastSchema), deleteBroadcast);
