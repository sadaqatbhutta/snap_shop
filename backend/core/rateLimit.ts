import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { connection } from './queue';

interface RateLimitOptions {
  windowMs: number;    // window duration in ms
  maxRequests: number; // max requests per window per key
  keyPrefix?: string;  // Redis key prefix
}

function getClientKey(req: Request): string {
  // Use X-Forwarded-For if behind a proxy, fall back to socket IP
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])
    ?? req.socket.remoteAddress
    ?? 'unknown';
  return ip.trim();
}

/**
 * Redis-backed rate limiter middleware.
 * Uses rate-limiter-flexible and existing ioredis connection.
 */
export function rateLimiter({ windowMs, maxRequests, keyPrefix = 'rl' }: RateLimitOptions) {
  const limiter = new RateLimiterRedis({
    storeClient: connection,
    keyPrefix,
    points: maxRequests,
    duration: windowMs / 1000,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = getClientKey(req);

    try {
      await limiter.consume(key);
      next();
    } catch (rej: any) {
      if (rej instanceof RateLimiterRes) {
        const retryAfterSec = Math.ceil(rej.msBeforeNext / 1000);
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          status: 'error',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        });
      }
      // If Redis is down, we allow the request through in dev/prod 
      // but log the error.
      next();
    }
  };
}
