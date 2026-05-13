import { RequestHandler } from 'express';
import { config } from '../config/config.js';

/**
 * In development and test, logs/metrics stay open for local debugging.
 * In staging and production, set OBSERVABILITY_KEY and send X-Observability-Key on each request.
 */
export const requireObservabilityKey: RequestHandler = (req, res, next) => {
  if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
    return next();
  }

  const secret = config.OBSERVABILITY_KEY;
  if (!secret) {
    return res.status(403).json({
      status: 'error',
      code: 'OBSERVABILITY_DISABLED',
      message:
        'Logs and metrics are disabled until OBSERVABILITY_KEY is set on the server. Send matching header X-Observability-Key to access these endpoints.',
    });
  }

  if (req.header('x-observability-key') !== secret) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Invalid or missing X-Observability-Key header.',
    });
  }

  next();
};
