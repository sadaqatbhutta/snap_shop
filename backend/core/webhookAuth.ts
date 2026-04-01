import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from './config';

export function verifyWebhookSignature(req: Request, res: Response, next: NextFunction) {
  if (config.NODE_ENV === 'test') {
    return next();
  }

  const signatureHeader = req.headers['x-snap-signature'];
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return res.status(401).json({ status: 'error', code: 'INVALID_SIGNATURE', message: 'Missing or invalid signature header' });
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    return res.status(401).json({ status: 'error', code: 'INVALID_SIGNATURE', message: 'No payload to verify' });
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', config.WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'ascii');
    const actualBuffer = Buffer.from(signatureHeader, 'ascii');

    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      return res.status(401).json({ status: 'error', code: 'INVALID_SIGNATURE', message: 'Signature verification failed' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ status: 'error', code: 'VERIFICATION_ERROR', message: 'Error verifying signature' });
  }
}
