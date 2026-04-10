const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;

function redactString(value: string): string {
  return value.replace(EMAIL_RE, '[redacted-email]').replace(PHONE_RE, '[redacted-phone]');
}

export function redactForLogs<T>(value: T, depth = 0): T {
  if (depth > 6) return '[max-depth]' as T;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value) as T;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(v => redactForLogs(v, depth + 1)) as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const keyLower = k.toLowerCase();
      if (
        keyLower.includes('password') ||
        keyLower.includes('token') ||
        keyLower.includes('secret') ||
        keyLower === 'authorization'
      ) {
        out[k] = '[redacted]';
        continue;
      }
      out[k] = redactForLogs(v, depth + 1);
    }
    return out as T;
  }
  return value;
}
