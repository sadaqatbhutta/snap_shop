import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import * as admin from '../services/admin.service.js';

export async function listBusinesses(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    await admin.assertPlatformAdmin(user.uid);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const businesses = await admin.listBusinessesForAdmin(limit);
    res.json({ businesses });
  } catch (err) {
    next(err);
  }
}

export async function setPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    await admin.assertPlatformAdmin(user.uid);
    const { businessId } = req.params;
    const plan = String(req.body?.plan || '');
    const result = await admin.setBusinessPlan(businessId, plan);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function meAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    try {
      await admin.assertPlatformAdmin(user.uid);
      res.json({ isPlatformAdmin: true });
    } catch {
      res.json({ isPlatformAdmin: false });
    }
  } catch (err) {
    next(err);
  }
}
