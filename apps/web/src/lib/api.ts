const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_BASE = rawBase.replace(/\/+$/, '').endsWith('/api')
  ? rawBase.replace(/\/+$/, '')
  : `${rawBase.replace(/\/+$/, '')}/api`;

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { idempotencyKey?: string; token?: string } = {},
): Promise<T> {
  const { idempotencyKey, token, headers = {}, ...rest } = options;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Determine whether this request is in an Admin context
  const isAdminRequest =
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) ||
    cleanEndpoint.startsWith('/admin') ||
    cleanEndpoint.includes('/reports/') ||
    cleanEndpoint.includes('/history') ||
    cleanEndpoint.includes('/force-vacate') ||
    cleanEndpoint.includes('/status') ||
    cleanEndpoint.includes('/settle') ||
    cleanEndpoint.startsWith('/menu/items');

  // Prioritize appropriate token based on context (skip auth token on login endpoint)
  let activeToken: string | null | undefined = token;
  if (!activeToken && typeof window !== 'undefined' && cleanEndpoint !== '/auth/login') {
    if (isAdminRequest) {
      activeToken = localStorage.getItem('cp_admin_token');
    } else {
      activeToken = localStorage.getItem('cp_session_token');
      // Only fall back to admin token if we're not on customer order/session endpoints
      if (
        !activeToken &&
        !cleanEndpoint.startsWith('/sessions/verify') &&
        !cleanEndpoint.startsWith('/orders') &&
        !cleanEndpoint.startsWith('/tables/contact-manager')
      ) {
        activeToken = localStorage.getItem('cp_admin_token') || null;
      }
    }
  }

  if (activeToken && cleanEndpoint !== '/auth/login') {
    defaultHeaders['Authorization'] = `Bearer ${activeToken}`;
  }

  if (idempotencyKey) {
    defaultHeaders['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE}${cleanEndpoint}`, {
    ...rest,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  // Auto-handle expired or invalid admin session (401 only)
  if (response.status === 401) {
    if (
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/admin') &&
      !window.location.pathname.includes('/admin/login')
    ) {
      console.warn('[Auth] Admin session expired. Redirecting to login.');
      localStorage.removeItem('cp_admin_token');
      localStorage.removeItem('cp_admin_user');
      window.location.href = '/admin/login?session_expired=1';
    }
  }

  if (!response.ok) {
    const error: any = new Error(data.message || `Request failed with status ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  return data as T;
}
