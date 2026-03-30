import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry } from '../core/retry';

describe('withRetry', () => {

  it('resolves immediately on first success', async () => {
    const result = await withRetry(() => Promise.resolve('ok'), 'test');
    assert.equal(result, 'ok');
  });

  it('retries on 5xx and succeeds on 3rd attempt', async () => {
    let calls = 0;
    const result = await withRetry(
      () => {
        calls++;
        if (calls < 3) throw Object.assign(new Error('server error'), { status: 503 });
        return Promise.resolve('recovered');
      },
      'test',
      { baseDelayMs: 5 }
    );
    assert.equal(result, 'recovered');
    assert.equal(calls, 3);
  });

  it('does NOT retry on 4xx — throws immediately after 1 attempt', async () => {
    let calls = 0;
    await assert.rejects(
      () => withRetry(
        () => { calls++; throw Object.assign(new Error('bad request'), { status: 400 }); },
        'test',
        { baseDelayMs: 5 }
      ),
      (err: any) => err.status === 400
    );
    assert.equal(calls, 1);
  });

  it('exhausts all retries and throws the last error', async () => {
    let calls = 0;
    await assert.rejects(
      () => withRetry(
        () => { calls++; throw Object.assign(new Error('server error'), { status: 500 }); },
        'test',
        { maxAttempts: 3, baseDelayMs: 5 }
      ),
      (err: any) => err.status === 500
    );
    assert.equal(calls, 3);
  });

  it('times out and retries, then exhausts', async () => {
    let calls = 0;
    await assert.rejects(
      () => withRetry(
        () => { calls++; return new Promise(r => setTimeout(r, 500)); },
        'test',
        { maxAttempts: 2, baseDelayMs: 5, timeoutMs: 30 }
      ),
      (err: any) => err.message === 'Request timed out'
    );
    assert.equal(calls, 2);
  });

  it('does not retry on 422 validation error', async () => {
    let calls = 0;
    await assert.rejects(
      () => withRetry(
        () => { calls++; throw Object.assign(new Error('unprocessable'), { status: 422 }); },
        'test',
        { baseDelayMs: 5 }
      ),
      (err: any) => err.status === 422
    );
    assert.equal(calls, 1);
  });

});
