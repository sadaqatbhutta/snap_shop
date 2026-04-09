import { Request, Response, NextFunction } from 'express';
import { scheduleBroadcast, cancelBroadcast } from '../services/broadcast.service.js';

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

export async function deleteBroadcast(req: Request, res: Response, next: NextFunction) {
  try {
    const broadcastId = req.params.broadcastId;
    const { businessId } = req.body;
    const result = await cancelBroadcast(broadcastId, businessId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
