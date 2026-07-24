import { Router } from 'express';
import { verifyFirebaseToken, verifyBusinessAccess, requireAdmin } from '../middlewares/auth.js';
import { getBilling, startCheckout, openPortal, stripeWebhook } from '../controllers/billing.controller.js';

export const billingRouter = Router();

billingRouter.post('/webhook', stripeWebhook);
billingRouter.get('/:businessId', verifyFirebaseToken, verifyBusinessAccess, getBilling);
billingRouter.post('/:businessId/checkout', verifyFirebaseToken, verifyBusinessAccess, requireAdmin, startCheckout);
billingRouter.post('/:businessId/portal', verifyFirebaseToken, verifyBusinessAccess, requireAdmin, openPortal);
