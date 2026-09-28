const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { idempotencyKey?: string; token?: string } = {},
): Promise<T> {
  const { idempotencyKey, token, headers = {}, ...rest } = options;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add Session or Admin Token if available
  const activeToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('cp_session_token') || localStorage.getItem('cp_admin_token') : null);

  if (activeToken) {
    defaultHeaders['Authorization'] = `Bearer ${activeToken}`;
  }

  if (idempotencyKey) {
    defaultHeaders['Idempotency-Key'] = idempotencyKey;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE}${cleanEndpoint}`, {
    ...rest,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}
