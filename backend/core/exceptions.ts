import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { log } from './logger';

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

function errorResponse(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ status: 'error', code, message });
}

export function handleZodError(err: ZodError, _req: Request, res: Response, _next: NextFunction) {
  const message = err.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
  return errorResponse(res, 422, 'VALIDATION_ERROR', message);
}

export function handleAppError(err: AppError, _req: Request, res: Response, next: NextFunction) {
  if (!(err instanceof AppError)) return next(err);
  return errorResponse(res, err.statusCode, err.code, err.message);
}

export function handleUnknownError(err: unknown, req: Request, res: Response, _next: NextFunction) {
  log({
    timestamp: new Date().toISOString(),
    level: 'error',
    request_id: (req as any).requestId,
    path: req.path,
    error: err instanceof Error ? err.message : String(err),
  });
  return errorResponse(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
}

// Registers all error handlers — call after all routes
export function registerErrorHandlers(app: import('express').Application) {
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ZodError) return handleZodError(err, req, res, next);
    if (err instanceof AppError) return handleAppError(err, req, res, next);
    return handleUnknownError(err, req, res, next);
  });
}
