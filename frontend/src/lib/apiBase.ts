/**
 * Base URL for the SnapShop API (no trailing slash).
 * Used for split hosting (dashboard on CDN, API on another origin) via VITE_API_BASE_URL at build time.
 */
export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.replace(/\/$/, '');
  }
  // Local dev: call the Vite dev server origin so `/api/*` is proxied to the backend (see frontend/vite.config.ts).
  // Avoids a hardcoded port mismatch when `PORT` in `.env.local` is not 3040.
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return window.location.origin;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

/** Absolute URL for an API path (path must start with `/`, e.g. `/api/health`). */
export function getApiUrl(apiPath: string): string {
  const base = getApiBaseUrl();
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  return `${base}${path}`;
}
