import { Router } from 'express';
import { validateBody } from '../middlewares/validation.js';
import { verifyAnyWebhookSignature } from '../middlewares/webhookAuth.js';
import { WebhookSchema } from '../validations/webhook.js';
import { enqueueWebhookJob, getWebhookJobStatus, verifyWebhookChallenge } from '../controllers/webhook.controller.js';

export const webhookRouter = Router();

webhookRouter.post('/:channel', verifyAnyWebhookSignature, validateBody(WebhookSchema), enqueueWebhookJob);
webhookRouter.get('/:channel', verifyWebhookChallenge);
webhookRouter.get('/job/:jobId', getWebhookJobStatus);
