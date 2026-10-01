const apiBase = (
  import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api')
).replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
  return payload;
}