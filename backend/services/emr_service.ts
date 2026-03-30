import { withRetry } from '../core/retry';
import { config } from '../core/config';

async function emrFetch(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${config.EMR_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.EMR_API_KEY && { Authorization: `Bearer ${config.EMR_API_KEY}` }),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err: any = new Error(`EMR responded with ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export async function postToEMR(path: string, payload: unknown): Promise<unknown> {
  return withRetry(
    () => emrFetch(path, payload),
    `EMR:${path}`,
    { maxAttempts: config.QUEUE_MAX_RETRIES, baseDelayMs: 1000, timeoutMs: config.EMR_TIMEOUT_MS }
  );
}
