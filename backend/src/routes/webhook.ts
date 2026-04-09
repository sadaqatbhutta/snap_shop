import { Router } from 'express';
import { verifyChannelWebhookSignature } from '../middlewares/webhookAuth.js';
import { enqueueWebhookJob, getWebhookJobStatus, verifyWebhookChallenge } from '../controllers/webhook.controller.js';

export const webhookRouter = Router();

webhookRouter.post('/:channel', verifyChannelWebhookSignature, enqueueWebhookJob);
webhookRouter.get('/:channel', verifyWebhookChallenge);
webhookRouter.get('/job/:jobId', getWebhookJobStatus);
