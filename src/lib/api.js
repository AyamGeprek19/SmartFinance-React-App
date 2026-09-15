const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    throw new Error(data?.error || `API tidak tersedia (HTTP ${response.status}).`);
  }
  return data;
}
