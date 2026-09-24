import { authFetch } from './api';
import { User } from '../types/auth';
import { RuleDefinition } from '../types/compliance';

export const adminService = {
  async getUsers(): Promise<{ success: boolean; users: User[]; error?: string }> {
    const res = await authFetch('/api/users');
    return await res.json();
  },

  async createUser(userData: {
    name: string;
    email: string;
    role: string;
    password?: string;
  }): Promise<{ success: boolean; user: User; error?: string }> {
    const res = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await res.json();
  },

  async updateUserStatus(
    userId: number | string,
    active: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const res = await authFetch(`/api/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });
    return await res.json();
  },

  async getRules(): Promise<{ success: boolean; rules: RuleDefinition[]; error?: string }> {
    const res = await authFetch('/api/rules');
    return await res.json();
  },

  async updateRuleStatus(
    ruleId: string,
    active: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const res = await authFetch(`/api/rules/${encodeURIComponent(ruleId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });
    return await res.json();
  }
};
