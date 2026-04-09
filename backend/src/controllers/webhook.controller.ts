import { Request, Response, NextFunction } from 'express';
import { enqueueWebhookMessage, getWebhookJobStatusById } from '../services/webhook.service.js';
import { buildError } from '../utils/errors.js';
import { config } from '../config/config.js';

export async function enqueueWebhookJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { channel } = req.params;
    if (!['whatsapp', 'instagram', 'facebook', 'tiktok'].includes(channel)) {
      throw buildError('UNSUPPORTED_CHANNEL', `Unsupported channel: ${channel}`, 422);
    }
    const job = await enqueueWebhookMessage(channel, req.body, (req as any).requestId);
    return res.status(202).json({ status: 'queued', job_id: job.id });
  } catch (err) {
    next(err);
  }
}

export async function getWebhookJobStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const status = await getWebhookJobStatusById(req.params.jobId);
    if (!status) {
      throw buildError('JOB_NOT_FOUND', 'Job not found', 404);
    }
    return res.json(status);
  } catch (err) {
    next(err);
  }
}

export function verifyWebhookChallenge(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge as string);
  }

  return res.sendStatus(403);
}
