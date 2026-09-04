import type { UserRead } from './auth';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  token: string | null; // Оставляем для совместимости, но не используем
  user: UserRead | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface LoginResponse {
  message?: string;
  user?: UserRead;
}