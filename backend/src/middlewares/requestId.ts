import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id']?.toString() || uuidv4();
  (req as any).requestId = requestId;
  next();
}
