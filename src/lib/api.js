function resolveApiBase() {
  const rawUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  
  // Jika VITE_API_URL kosong, gunakan path relatif '/api'
  if (!rawUrl) return '/api';
  
  // Jika URL sudah diakhiri /api, langsung gunakan
  if (rawUrl.endsWith('/api')) return rawUrl;
  
  // Selebihnya tambahkan /api di belakang URL backend
  return `${rawUrl}/api`;
}

const apiBase = resolveApiBase();

export async function apiRequest(path, options = {}) {
  let response;
  
  // Memastikan path tidak memiliki awalan '/api' ganda
  const cleanPath = path.startsWith('/api/') ? path.replace('/api', '') : path;
  const targetUrl = `${apiBase}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;

  try {
    response = await fetch(targetUrl, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Tidak dapat terhubung ke API (${targetUrl}). Pastikan backend berjalan dan VITE_API_URL sudah benar.`);
  }
  
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  
  if (!response.ok) {
    throw new Error(data?.error || `API tidak tersedia (HTTP ${response.status}) pada ${targetUrl}. Periksa VITE_API_URL dan deploy ulang frontend.`);
  }
  return data;
}