import { Request, Response, NextFunction } from 'express';
import { processAIMessage } from '../services/ai.service.js';

export async function processAI(req: Request, res: Response, next: NextFunction) {
  try {
    const { message, conversationId, businessId } = req.body;
    const result = await processAIMessage(message, conversationId, businessId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
