import { Request, Response, NextFunction } from 'express';

interface WindowEntry {
  count: number;
  windowStart: number;
}

const windows = new Map<string, WindowEntry>();

interface RateLimitOptions {
  windowMs: number;   // window duration in ms
  maxRequests: number; // max requests per window per key
}

function getClientKey(req: Request): string {
  // Use X-Forwarded-For if behind a proxy, fall back to socket IP
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])
    ?? req.socket.remoteAddress
    ?? 'unknown';
  return ip.trim();
}

export function rateLimiter({ windowMs, maxRequests }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = getClientKey(req);
    const now = Date.now();

    const entry = windows.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      // Start a new window
      windows.set(key, { count: 1, windowStart: now });
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfterSec = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        status:  'error',
        code:    'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      });
    }

    next();
  };
}

// Periodically clean up stale entries to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (now - entry.windowStart > 60_000) windows.delete(key);
  }
}, 60_000);
