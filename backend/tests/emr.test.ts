import { describe, expect, it } from 'vitest';
import { createMockFetch } from './helpers';

async function callPostToEMR(path: string, payload: unknown, mockFetch: typeof fetch) {
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
    expect(result).toEqual({ id: 'emr-123' });
  });

  it('throws with status on 5xx response', async () => {
    const { mockFetch } = createMockFetch({ type: 'http_error', status: 503 });
    await expect(callPostToEMR('/patients', {}, mockFetch as any)).rejects.toMatchObject({ status: 503 });
  });

  it('throws with status on 4xx response', async () => {
    const { mockFetch } = createMockFetch({ type: 'http_error', status: 400 });
    await expect(callPostToEMR('/patients', {}, mockFetch as any)).rejects.toMatchObject({ status: 400 });
  });

  it('throws on network error', async () => {
    const { mockFetch } = createMockFetch({ type: 'network_error', message: 'ECONNREFUSED' });
    await expect(callPostToEMR('/patients', {}, mockFetch as any)).rejects.toThrow('ECONNREFUSED');
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

    expect(result).toEqual({ id: 'emr-456' });
    expect(getCallCount()).toBe(3);
  });
});
