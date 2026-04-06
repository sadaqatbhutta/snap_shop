import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { recordRequest } from '../utils/metrics.js';
import { pushLog } from '../utils/logStore.js';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId as string;
  const start = Date.now();

  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    const responseTimeMs = Date.now() - start;
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    const entry = {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      method: req.method,
      path: req.originalUrl,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      level,
    };

    logger[level](entry, 'HTTP request completed');
    pushLog(entry);
    recordRequest(req.originalUrl, statusCode, responseTimeMs);
  });

  next();
}
