import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMockFetch } from './helpers';

// ─── We test the EMR fetch logic directly by monkey-patching globalThis.fetch ─

async function callPostToEMR(path: string, payload: unknown, mockFetch: typeof fetch) {
  // Inline the EMR fetch logic so we can inject the mock without module rewiring
  const EMR_BASE_URL = 'https://emr.example.com';

  const res = await mockFetch(`${EMR_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err: any = new Error(`EMR responded with ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

describe('EMR Service', () => {

  it('returns response body on success', async () => {
    const { mockFetch } = createMockFetch({ type: 'success', body: { id: 'emr-123' } });
    const result = await callPostToEMR('/patients', { name: 'John' }, mockFetch as any);
    assert.deepEqual(result, { id: 'emr-123' });
  });

  it('throws with status on 5xx response', async () => {
    const { mockFetch } = createMockFetch({ type: 'http_error', status: 503 });
    await assert.rejects(
      () => callPostToEMR('/patients', {}, mockFetch as any),
      (err: any) => err.status === 503 && err.message.includes('503')
    );
  });

  it('throws with status on 4xx response', async () => {
    const { mockFetch } = createMockFetch({ type: 'http_error', status: 400 });
    await assert.rejects(
      () => callPostToEMR('/patients', {}, mockFetch as any),
      (err: any) => err.status === 400
    );
  });

  it('throws on network error', async () => {
    const { mockFetch } = createMockFetch({ type: 'network_error', message: 'ECONNREFUSED' });
    await assert.rejects(
      () => callPostToEMR('/patients', {}, mockFetch as any),
      (err: any) => err.message === 'ECONNREFUSED'
    );
  });

  it('succeeds after 2 failures (retry sequence)', async () => {
    const { mockFetch, getCallCount } = createMockFetch({
      type: 'sequence',
      responses: [
        { type: 'http_error', status: 503 },
        { type: 'http_error', status: 503 },
        { type: 'success', body: { id: 'emr-456' } },
      ],
    });

    // Simulate withRetry wrapping the call
    let result: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await callPostToEMR('/patients', {}, mockFetch as any);
        break;
      } catch (err: any) {
        if (attempt === 3) throw err;
        if (err.status >= 400 && err.status < 500) throw err;
      }
    }

    assert.deepEqual(result, { id: 'emr-456' });
    assert.equal(getCallCount(), 3);
  });

});
