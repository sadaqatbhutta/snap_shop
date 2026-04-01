import { Router } from 'express';
import { WebhookSchema } from '../../schemas/webhook';
import { webhookQueue, emrQueue, getJobStatus } from '../../core/queue';
import { verifyWebhookSignature } from '../../core/webhookAuth';
import { config } from '../../core/config';

export const webhookRouter = Router();

/**
 * POST /api/webhook/:channel
 *
 * Validates payload and signature, pushes to webhook queue, returns immediately.
 * The full pipeline (Firestore + AI) runs asynchronously in the worker.
 */
webhookRouter.post('/:channel', verifyWebhookSignature, async (req, res, next) => {
  try {
    const body    = WebhookSchema.parse(req.body);
    const channel = req.params.channel;

    const job = await webhookQueue.add(
      'process-message',
      { channel, body, requestId: (req as any).requestId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600 },  // keep completed jobs 1h for status checks
        removeOnFail: false,              // keep failed jobs for inspection
      }
    );

    res.json({ status: 'queued', job_id: job.id });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/webhook/:channel
 *
 * Verification handler for Meta (WhatsApp/Instagram) webhooks.
 */
webhookRouter.get('/:channel', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  
  res.sendStatus(403);
});

/**
 * GET /api/webhook/job/:jobId
 *
 * Check the status of a queued webhook job.
 */
webhookRouter.get('/job/:jobId', async (req, res, next) => {
  try {
    const status = await getJobStatus(webhookQueue, req.params.jobId);
    if (!status) return res.status(404).json({ status: 'error', code: 'JOB_NOT_FOUND', message: 'Job not found' });
    res.json(status);
  } catch (err) {
    next(err);
  }
});
