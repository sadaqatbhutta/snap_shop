import { Request, Response, NextFunction } from 'express';
import { deleteBusinessAccount } from '../services/business.service.js';

export async function deleteBusiness(req: Request, res: Response, next: NextFunction) {
  try {
    const businessId = req.params.businessId;
    const userRole = (req as any).userRole as string | undefined;
    if (userRole !== 'owner' && userRole !== 'platform_admin') {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Only the business owner may delete this account',
      });
    }
    const actorUid = (req as any).user?.uid || 'unknown';
    const result = await deleteBusinessAccount(businessId, actorUid);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
