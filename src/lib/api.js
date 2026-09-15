function resolveApiBase() {
  const configured = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  if (configured === '/api' || configured.endsWith('/api')) return configured;
  return `${configured}/api`;
}

const apiBase = resolveApiBase();

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Tidak dapat terhubung ke API (${apiBase}). Pastikan backend berjalan dan VITE_API_URL sudah benar.`);
  }
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    throw new Error(data?.error || `API tidak tersedia (HTTP ${response.status}).`);
  }
  return data;
}
