/**
 * api.ts — Centralized HTTP and Authentication Fetch Utility
 */

const TOKEN_KEY = 'nm_auth_token';
const USER_KEY = 'nm_auth_user';

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredSession(token: string, user: any): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getStoredUser(): any | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('x-access-token', token);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    console.warn('[Auth] Session unauthenticated or expired for:', url);
    clearStoredSession();
    // Dispatch auth state change event if needed
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  return response;
}
