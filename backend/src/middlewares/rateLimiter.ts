import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { connection } from '../queues/queue.js';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

function getClientIp(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.toString();
  return ip?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

export function rateLimiter({ windowMs, maxRequests, keyPrefix = 'rl' }: RateLimitOptions) {
  const durationSec = Math.ceil(windowMs / 1000) || 1;

  const limiter = connection
    ? new RateLimiterRedis({
        storeClient: connection as any,
        keyPrefix,
        points: maxRequests,
        duration: durationSec,
      })
    : new RateLimiterMemory({
        keyPrefix,
        points: maxRequests,
        duration: durationSec,
      });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await limiter.consume(getClientIp(req));
      next();
    } catch (err: any) {
      if (err instanceof RateLimiterRes) {
        const retryAfter = Math.ceil(err.msBeforeNext / 1000);
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          status: 'error',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        });
      }
      next(err);
    }
  };
}
