import { Router } from 'express';
import { verifyFirebaseToken } from '../middlewares/auth.js';
import { listBusinesses, setPlan, meAdmin } from '../controllers/admin.controller.js';

export const adminRouter = Router();

adminRouter.get('/me', verifyFirebaseToken, meAdmin);
adminRouter.get('/businesses', verifyFirebaseToken, listBusinesses);
adminRouter.post('/businesses/:businessId/plan', verifyFirebaseToken, setPlan);
