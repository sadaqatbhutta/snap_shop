import { Router } from 'express';
import { validateBody } from '../middlewares/validation.js';
import { WebchatMessageSchema, WebchatPollSchema } from '../validations/webchat.js';
import { receiveWebchatMessage, pollWebchatMessages } from '../controllers/webchat.controller.js';

export const webchatRouter = Router();

webchatRouter.post('/message', validateBody(WebchatMessageSchema), receiveWebchatMessage);
webchatRouter.post('/poll', validateBody(WebchatPollSchema), pollWebchatMessages);
