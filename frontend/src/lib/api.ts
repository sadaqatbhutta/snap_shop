import { auth } from '../firebase';
import { getApiUrl } from './apiBase';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const idToken = await auth.currentUser?.getIdToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (idToken) headers.set('Authorization', `Bearer ${idToken}`);

  const resp = await fetch(getApiUrl(path), { ...options, headers });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error((data as any)?.message || (data as any)?.error || `Request failed (${resp.status})`);
  }
  return data;
}
