import { Request, Response, NextFunction } from 'express';
import {
  processAIMessage,
  suggestReplyForConversation,
  generateBroadcastCopy,
  summarizeConversation,
} from '../services/ai.service.js';
import { assertWithinPlanLimit, incrementUsage } from '../services/usage.service.js';

export async function processAI(req: Request, res: Response, next: NextFunction) {
  try {
    const { message, conversationId, businessId } = req.body;
    await assertWithinPlanLimit(businessId, 'aiCalls');
    const result = await processAIMessage(message, conversationId, businessId);
    await incrementUsage(businessId, 'aiCalls');
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function suggestReply(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId, conversationId } = req.body;
    await assertWithinPlanLimit(businessId, 'aiCalls');
    const result = await suggestReplyForConversation(businessId, conversationId);
    await incrementUsage(businessId, 'aiCalls');
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function generateBroadcast(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId, objective, segmentName, templateName } = req.body;
    await assertWithinPlanLimit(businessId, 'aiCalls');
    const result = await generateBroadcastCopy(businessId, objective, segmentName, templateName);
    await incrementUsage(businessId, 'aiCalls');
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function summarizeThread(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId, conversationId } = req.body;
    await assertWithinPlanLimit(businessId, 'aiCalls');
    const result = await summarizeConversation(businessId, conversationId);
    await incrementUsage(businessId, 'aiCalls');
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
