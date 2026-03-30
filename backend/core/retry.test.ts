/**
 * Tests for backend/core/retry.ts
 * Run with: npx tsx backend/core/retry.test.ts
 */
import { withRetry } from './retry';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// ── Test 1: Succeeds on first attempt ────────────────────────────────────────
await test('succeeds on first attempt', async () => {
  const result = await withRetry(() => Promise.resolve('ok'), 'test');
  assert(result === 'ok', `Expected 'ok', got '${result}'`);
});

// ── Test 2: Retries and succeeds on 3rd attempt ───────────────────────────────
await test('retries and succeeds on 3rd attempt', async () => {
  let calls = 0;
  const result = await withRetry(
    () => {
      calls++;
      if (calls < 3) throw Object.assign(new Error('network error'), { status: 503 });
      return Promise.resolve('recovered');
    },
    'test',
    { baseDelayMs: 10 }
  );
  assert(result === 'recovered', `Expected 'recovered'`);
  assert(calls === 3, `Expected 3 calls, got ${calls}`);
});

// ── Test 3: Does NOT retry on 4xx ─────────────────────────────────────────────
await test('does not retry on 4xx error', async () => {
  let calls = 0;
  try {
    await withRetry(
      () => {
        calls++;
        throw Object.assign(new Error('bad request'), { status: 400 });
      },
      'test',
      { baseDelayMs: 10 }
    );
    throw new Error('Should have thrown');
  } catch (err: any) {
    assert(err.status === 400, `Expected status 400`);
    assert(calls === 1, `Expected 1 call (no retry), got ${calls}`);
  }
});

// ── Test 4: Exhausts all retries and throws ───────────────────────────────────
await test('exhausts retries and throws last error', async () => {
  let calls = 0;
  try {
    await withRetry(
      () => {
        calls++;
        throw Object.assign(new Error('server error'), { status: 500 });
      },
      'test',
      { maxAttempts: 3, baseDelayMs: 10 }
    );
    throw new Error('Should have thrown');
  } catch (err: any) {
    assert(err.status === 500, `Expected status 500`);
    assert(calls === 3, `Expected 3 calls, got ${calls}`);
  }
});

// ── Test 5: Timeout triggers retry ───────────────────────────────────────────
await test('times out and retries', async () => {
  let calls = 0;
  try {
    await withRetry(
      () => {
        calls++;
        return new Promise(resolve => setTimeout(resolve, 500)); // hangs
      },
      'test',
      { maxAttempts: 2, baseDelayMs: 10, timeoutMs: 50 }
    );
    throw new Error('Should have thrown');
  } catch (err: any) {
    assert(err.message === 'Request timed out', `Expected timeout error`);
    assert(calls === 2, `Expected 2 calls, got ${calls}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
