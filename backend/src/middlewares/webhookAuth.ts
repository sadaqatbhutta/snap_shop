import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config.js';
import { buildError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Verify Meta's X-Hub-Signature-256 header (for WhatsApp/Instagram/Facebook webhooks)
 * Format: sha256=<hex_signature>
 */
export function verifyMetaSignature(req: Request, res: Response, next: NextFunction) {
  const signatureHeader = req.headers['x-hub-signature-256'];
  
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    logger.warn({ headers: req.headers }, 'Missing X-Hub-Signature-256 header');
    return next(buildError('INVALID_SIGNATURE', 'Missing Meta signature header', 401));
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    return next(buildError('INVALID_SIGNATURE', 'No payload to verify', 401));
  }

  // Meta format: "sha256=<hex>"
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return next(buildError('INVALID_SIGNATURE', 'Invalid signature format', 401));
  }

  const providedSignature = parts[1];
  const expectedSignature = crypto
    .createHmac('sha256', config.WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const actualBuffer = Buffer.from(providedSignature, 'hex');

  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    logger.warn({ provided: providedSignature, expected: expectedSignature }, 'Meta signature mismatch');
    return next(buildError('INVALID_SIGNATURE', 'Signature verification failed', 401));
  }

  next();
}

/**
 * Verify custom X-Snap-Signature header (for internal/testing webhooks)
 */
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

/**
 * Flexible webhook auth: accepts either Meta signature or custom signature
 * Use this for webhook endpoints that receive both Meta and internal payloads
 */
export function verifyAnyWebhookSignature(req: Request, res: Response, next: NextFunction) {
  const hasMetaSignature = req.headers['x-hub-signature-256'];
  const hasCustomSignature = req.headers['x-snap-signature'];

  if (hasMetaSignature) {
    return verifyMetaSignature(req, res, next);
  } else if (hasCustomSignature) {
    return verifyWebhookSignature(req, res, next);
  } else {
    logger.warn({ headers: req.headers }, 'No webhook signature found');
    return next(buildError('INVALID_SIGNATURE', 'Missing webhook signature', 401));
  }
}
