import { authFetch, setStoredSession, clearStoredSession, getStoredUser, getStoredToken } from './api';
import { User, LoginResponse } from '../types/auth';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.success && data.token && data.user) {
      setStoredSession(data.token, data.user);
    }
    return data;
  },

  async getMe(): Promise<{ success: boolean; user?: User; error?: string }> {
    const token = getStoredToken();
    if (!token) return { success: false, error: 'No token' };

    try {
      const res = await authFetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setStoredSession(token, data.user);
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async logout(): Promise<void> {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network failure on logout
    } finally {
      clearStoredSession();
    }
  },

  getCurrentUser(): User | null {
    return getStoredUser();
  },

  getToken(): string | null {
    return getStoredToken();
  }
};
