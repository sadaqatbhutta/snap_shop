import { describe, expect, it } from 'vitest';
import { withRetry } from '../src/utils/retry.js';

describe('withRetry', () => {
  it('resolves immediately on first success', async () => {
    const result = await withRetry(() => Promise.resolve('ok'), 'test');
    expect(result).toBe('ok');
  });

  it('retries on 5xx and succeeds on 3rd attempt', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) {
          const error: any = new Error('server error');
          error.status = 503;
          throw error;
        }
        return 'recovered';
      },
      'test',
      { baseDelayMs: 5 }
    );
    expect(result).toBe('recovered');
    expect(calls).toBe(3);
  });

  it('does NOT retry on 4xx — throws immediately after 1 attempt', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          const error: any = new Error('bad request');
          error.status = 400;
          throw error;
        },
        'test',
        { baseDelayMs: 5 }
      )
    ).rejects.toMatchObject({ status: 400 });
    expect(calls).toBe(1);
  });

  it('exhausts all retries and throws the last error', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          const error: any = new Error('server error');
          error.status = 500;
          throw error;
        },
        'test',
        { maxAttempts: 3, baseDelayMs: 5 }
      )
    ).rejects.toMatchObject({ status: 500 });
    expect(calls).toBe(3);
  });

  it('times out and retries, then exhausts', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'ok';
        },
        'test',
        { maxAttempts: 2, baseDelayMs: 5, timeoutMs: 10 }
      )
    ).rejects.toThrow('Request timed out');
    expect(calls).toBe(2);
  });

  it('does not retry on 422 validation error', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          const error: any = new Error('unprocessable');
          error.status = 422;
          throw error;
        },
        'test',
        { baseDelayMs: 5 }
      )
    ).rejects.toMatchObject({ status: 422 });
    expect(calls).toBe(1);
  });
});
