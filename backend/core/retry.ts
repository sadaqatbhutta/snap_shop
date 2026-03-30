import { log } from './logger';

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  { maxAttempts = 3, baseDelayMs = 1000, timeoutMs = 10_000 }: RetryOptions = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
        ),
      ]);
      return result;
    } catch (err: any) {
      lastError = err;

      // Do not retry on 4xx client errors
      const status = err?.status ?? err?.response?.status;
      if (status && status >= 400 && status < 500) {
        throw err;
      }

      if (attempt < maxAttempts) {
        const waitMs = baseDelayMs * 2 ** (attempt - 1);
        log({
          timestamp: new Date().toISOString(),
          level: 'warn',
          context,
          attempt,
          next_retry_ms: waitMs,
          error: err?.message ?? String(err),
        });
        await delay(waitMs);
      } else {
        log({
          timestamp: new Date().toISOString(),
          level: 'error',
          context,
          message: 'All retry attempts exhausted',
          attempts: maxAttempts,
          error: err?.message ?? String(err),
        });
      }
    }
  }

  throw lastError;
}
