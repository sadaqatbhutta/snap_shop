import { Router } from 'express';
import { validateBody } from '../middlewares/validation.js';
import { WebchatMessageSchema } from '../validations/webchat.js';
import { receiveWebchatMessage } from '../controllers/webchat.controller.js';

export const webchatRouter = Router();

webchatRouter.post('/message', validateBody(WebchatMessageSchema), receiveWebchatMessage);
