import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config.js';
import { buildError } from '../utils/errors.js';

export function verifyWebhookSignature(req: Request, res: Response, next: NextFunction) {
  const signatureHeader = req.headers['x-snap-signature'];
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return next(buildError('INVALID_SIGNATURE', 'Missing or invalid signature header', 401));
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    return next(buildError('INVALID_SIGNATURE', 'No payload to verify', 401));
  }

  const expectedSignature = crypto.createHmac('sha256', config.WEBHOOK_SECRET).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'ascii');
  const actualBuffer = Buffer.from(signatureHeader, 'ascii');

  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return next(buildError('INVALID_SIGNATURE', 'Signature verification failed', 401));
  }

  next();
}
