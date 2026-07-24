import { Request, Response, NextFunction } from 'express';
import { processWebhookJob } from '../services/webhook.service.js';
import { consumeWebchatOutbound } from '../services/channelSender.js';

export async function receiveWebchatMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const body = {
      ...req.body,
      mediaUrl: req.body.media_url,
    };
    const result = await processWebhookJob('webchat', body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function pollWebchatMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { business_id, user_id } = req.body;
    const messages = await consumeWebchatOutbound(business_id, user_id);
    return res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
}
