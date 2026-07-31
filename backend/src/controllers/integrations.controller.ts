import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import * as integrations from '../services/integrations.service.js';
import { syncMetaTemplates } from '../services/metaTemplates.service.js';

export async function getIntegrations(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId } = req.params;
    const status = await integrations.getIntegrationsStatus(businessId);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

export async function putIntegrations(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { businessId } = req.params;
    const status = await integrations.updateIntegrations(businessId, req.body || {}, user.uid);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

export async function syncMetaTemplatesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId } = req.params;
    const result = await syncMetaTemplates(businessId);
    res.json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
}
