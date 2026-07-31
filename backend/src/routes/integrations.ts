import { Router } from 'express';
import { verifyFirebaseToken, verifyBusinessAccess, requireAdmin } from '../middlewares/auth.js';
import { getIntegrations, putIntegrations, syncMetaTemplatesHandler } from '../controllers/integrations.controller.js';

export const integrationsRouter = Router({ mergeParams: true });

integrationsRouter.get('/', verifyFirebaseToken, verifyBusinessAccess, getIntegrations);
integrationsRouter.put('/', verifyFirebaseToken, verifyBusinessAccess, requireAdmin, putIntegrations);
integrationsRouter.post(
  '/meta-templates/sync',
  verifyFirebaseToken,
  verifyBusinessAccess,
  requireAdmin,
  syncMetaTemplatesHandler,
);
