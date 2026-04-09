import { Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase.js';
import { AppError } from '../utils/errors.js';
import { AuthenticatedRequest } from './auth.js';

/**
 * Middleware to verify that the authenticated user has access to the businessId
 * in the request (from params, query, or body).
 * 
 * Checks:
 * 1. User is the business owner (ownerEmail matches)
 * 2. User is an agent in the business
 * 3. User is a platform admin
 */
export async function verifyBusinessAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    // Extract businessId from params, query, or body
    const businessId = req.params.businessId || req.query.businessId || (req.body as any)?.businessId;
    
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('BAD_REQUEST', 'businessId is required', 400);
    }

    // Check if user is platform admin
    const adminDoc = await db.doc(`admins/${user.uid}`).get();
    if (adminDoc.exists) {
      (req as any).businessId = businessId;
      (req as any).userRole = 'platform_admin';
      return next();
    }

    // Check if user is business owner
    const businessDoc = await db.doc(`businesses/${businessId}`).get();
    if (!businessDoc.exists) {
      throw new AppError('NOT_FOUND', 'Business not found', 404);
    }

    const business = businessDoc.data();
    if (business?.ownerEmail === user.email) {
      (req as any).businessId = businessId;
      (req as any).userRole = 'owner';
      return next();
    }

    // Check if user is an agent
    const agentDoc = await db.doc(`businesses/${businessId}/agents/${user.uid}`).get();
    if (agentDoc.exists) {
      const agent = agentDoc.data();
      (req as any).businessId = businessId;
      (req as any).userRole = agent?.role || 'agent';
      return next();
    }

    // User has no access to this business
    throw new AppError('FORBIDDEN', 'You do not have access to this business', 403);
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware to require admin role (owner or admin agent)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userRole = (req as any).userRole;
  if (userRole === 'owner' || userRole === 'admin' || userRole === 'platform_admin') {
    return next();
  }
  next(new AppError('FORBIDDEN', 'Admin access required', 403));
}
