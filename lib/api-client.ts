export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001/api/v1';

  // If endpoint starts with http, use it directly; otherwise combine with baseUrl
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach token if present in client runtime
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('estim_access_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = 'An unexpected error occurred';
      try {
        const errorJson = await response.json();
        if (typeof errorJson.detail === 'string') {
          errorDetail = errorJson.detail;
        } else if (errorJson.detail) {
          errorDetail = JSON.stringify(errorJson.detail);
        } else if (errorJson.message) {
          errorDetail = errorJson.message;
        }
      } catch {
        errorDetail = response.statusText || `Request failed with code ${response.status}`;
      }

      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('estim_access_token');
        localStorage.removeItem('estim_user');
        if (
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.includes('/login')
        ) {
          window.location.href = '/login';
        }
      }

      throw new ApiError(response.status, errorDetail);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network error / Failed to fetch';
    throw new ApiError(0, message);
  }
}
