import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { redactForLogs } from '../utils/redact.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `Resource ${req.originalUrl} not found`,
  });
}

export function registerErrorHandlers(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    const message = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    return res.status(422).json({ status: 'error', code: 'VALIDATION_ERROR', message });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ status: 'error', code: err.code, message: err.message });
  }

  const rawMsg = err instanceof Error ? err.message : String(err);
  logger.error(
    { request_id: (req as any).requestId, error: redactForLogs(rawMsg) },
    'Unhandled exception'
  );
  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again later.',
  });
}
