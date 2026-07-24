/** Optional frontend Sentry — no-ops if VITE_SENTRY_DSN unset or package missing. */
export async function initFrontendSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
    });
  } catch {
    // optional dependency
  }
}
