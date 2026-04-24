import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase.js';
import { AppError } from '../utils/errors.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    [key: string]: unknown;
  };
}

export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Missing authorization token', 401);
    }

    const idToken = header.slice(7);
    const decodedToken = await auth.verifyIdToken(idToken);
    (req as AuthenticatedRequest).user = {
      ...decodedToken,
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
    next();
  } catch (err: any) {
    next(new AppError('UNAUTHORIZED', err?.message || 'Invalid token', 401));
  }
}

export function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    }
    const role = (user as any).role as string | undefined;
    if (!role || !roles.includes(role)) {
      return next(new AppError('FORBIDDEN', 'Insufficient permissions', 403));
    }
    next();
  };
}

export { verifyBusinessAccess, requireAdmin } from './businessAccess.js';
