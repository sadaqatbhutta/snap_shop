import { Router } from 'express';
import { verifyFirebaseToken, verifyBusinessAccess } from '../middlewares/auth.js';
import { deleteBusiness } from '../controllers/business.controller.js';

export const businessRouter = Router();

businessRouter.delete('/:businessId', verifyFirebaseToken, verifyBusinessAccess, deleteBusiness);
