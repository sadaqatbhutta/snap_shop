import { Request, Response, NextFunction } from 'express';
import { scheduleBroadcast } from '../services/broadcast.service.js';

export async function triggerBroadcast(req: Request, res: Response, next: NextFunction) {
  try {
    const broadcastId = req.params.broadcastId;
    const { businessId, scheduledAt } = req.body;
    const result = await scheduleBroadcast(broadcastId, businessId, scheduledAt, (req as any).requestId);
    return res.status(202).json(result);
  } catch (err) {
    next(err);
  }
}
