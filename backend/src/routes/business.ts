import { Router } from 'express';
import { verifyFirebaseToken, verifyBusinessAccess } from '../middlewares/auth.js';
import { deleteBusiness } from '../controllers/business.controller.js';
import { integrationsRouter } from './integrations.js';

export const businessRouter = Router();

businessRouter.use('/:businessId/integrations', integrationsRouter);
businessRouter.delete('/:businessId', verifyFirebaseToken, verifyBusinessAccess, deleteBusiness);
