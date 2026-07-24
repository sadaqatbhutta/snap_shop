import { Request, Response, NextFunction } from 'express';
import {
  processAIMessage,
  suggestReplyForConversation,
  generateBroadcastCopy,
  summarizeConversation,
  generateCustomerCopilot,
} from '../services/ai.service.js';
import { assertWithinPlanLimit, incrementUsage } from '../services/usage.service.js';
import {
  upsertKnowledgeDocument,
  listKnowledgeDocuments,
  deleteKnowledgeDocument,
} from '../services/rag.service.js';
import {
  listWorkflows,
  upsertWorkflow,
  deleteWorkflow,
} from '../services/workflow.service.js';
import { recordAiFeedback, listRecentFeedback } from '../services/feedback.service.js';
import { db } from '../config/firebase.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { AppError } from '../utils/errors.js';

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

export async function customerCopilot(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId, customerId } = req.body;
    await assertWithinPlanLimit(businessId, 'aiCalls');
    const result = await generateCustomerCopilot(businessId, customerId);
    await incrementUsage(businessId, 'aiCalls');
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function submitFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user;
    const result = await recordAiFeedback({
      ...req.body,
      authorUid: user?.uid,
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const businessId = String(req.query.businessId || '');
    const rows = await listRecentFeedback(businessId);
    return res.status(200).json({ items: rows });
  } catch (err) {
    next(err);
  }
}

export async function upsertKnowledge(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId, title, content, source, docId } = req.body;
    const doc = await upsertKnowledgeDocument(businessId, { title, content, source, docId });
    return res.status(200).json(doc);
  } catch (err: any) {
    const message = err?.message || 'Failed to index knowledge document';
    if (typeof message === 'string' && (message.includes('embedding') || message.includes('Empty'))) {
      return next(new AppError('EMBEDDING_FAILED', message, 502));
    }
    next(err);
  }
}

export async function listKnowledge(req: Request, res: Response, next: NextFunction) {
  try {
    const businessId = String(req.query.businessId || req.body.businessId || '');
    const items = await listKnowledgeDocuments(businessId);
    return res.status(200).json({ items });
  } catch (err) {
    next(err);
  }
}

export async function removeKnowledge(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId, docId } = req.body;
    await deleteKnowledgeDocument(businessId, docId);
    return res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function getWorkflows(req: Request, res: Response, next: NextFunction) {
  try {
    const businessId = String(req.query.businessId || '');
    const items = await listWorkflows(businessId);
    return res.status(200).json({ items });
  } catch (err) {
    next(err);
  }
}

export async function saveWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId, ...rule } = req.body;
    const item = await upsertWorkflow(businessId, rule);
    return res.status(200).json(item);
  } catch (err) {
    next(err);
  }
}

export async function removeWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId, ruleId } = req.body;
    await deleteWorkflow(businessId, ruleId);
    return res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function setPromptVariant(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId, variant } = req.body;
    await db.doc(`businesses/${businessId}`).set(
      { aiPromptVariant: variant, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return res.status(200).json({ variant });
  } catch (err) {
    next(err);
  }
}
