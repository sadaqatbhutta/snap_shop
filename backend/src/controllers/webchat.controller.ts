import { Request, Response, NextFunction } from 'express';
import { processWebhookJob } from '../services/webhook.service.js';

export async function receiveWebchatMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await processWebhookJob('webchat', req.body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
