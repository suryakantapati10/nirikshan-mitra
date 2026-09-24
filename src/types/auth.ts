export type Role = 'inspector' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  active?: boolean | number;
  created_at?: string;
  last_login?: string | null;
}

export interface AuthSession {
  token: string | null;
  user: User | null;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}
