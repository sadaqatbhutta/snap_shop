import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import * as billing from '../services/billing.service.js';
import * as usage from '../services/usage.service.js';

export async function getBilling(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId } = req.params;
    const [status, detail] = await Promise.all([
      billing.getBillingStatus(businessId),
      usage.getBusinessBilling(businessId),
    ]);
    res.json({ ...status, ...detail });
  } catch (err) {
    next(err);
  }
}

export async function startCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { businessId } = req.params;
    const plan = String(req.body?.plan || '');
    const result = await billing.createCheckoutSession(businessId, plan, user?.email || '');
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function openPortal(req: Request, res: Response, next: NextFunction) {
  try {
    const { businessId } = req.params;
    const result = await billing.createBillingPortalSession(businessId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function stripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = (req as any).rawBody as Buffer | undefined;
    if (!raw) {
      res.status(400).json({ status: 'error', message: 'Missing raw body for Stripe webhook' });
      return;
    }
    const signature = req.headers['stripe-signature'] as string | undefined;
    const result = await billing.handleStripeWebhook(raw, signature);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
