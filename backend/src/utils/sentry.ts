/**
 * Optional Sentry bootstrap. No-ops when SENTRY_DSN / VITE_SENTRY_DSN is unset
 * or the @sentry/* package is not installed.
 */

export async function initBackendSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    });
  } catch {
    // Package optional
  }
}

export async function captureBackendException(err: unknown): Promise<void> {
  try {
    const Sentry = await import('@sentry/node');
    Sentry.captureException(err);
  } catch {
    // ignore
  }
}
