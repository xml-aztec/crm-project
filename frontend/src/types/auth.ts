/**
 * Типы для аутентификации и авторизации пользователей
 */

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
}

export interface Position {
  id: number;
  name: string;
  description?: string;
}

export interface Branch {
  id: number;
  name: string;
  location?: string;
  phone?: string;
  email?: string;
}

export interface UserRead {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  is_verified: boolean;
  is_admin?: boolean;
  role?: Role;
  role_id?: number;
  position?: Position;
  position_id?: number;
  branch?: Branch;
  branch_id?: number;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role_id?: number;
  position_id?: number;
  branch_id?: number;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  phone?: string;
  role_id?: number;
  position_id?: number;
  branch_id?: number;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserRead;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  full_name: string;
  phone?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
  new_password_confirm: string;
}

export interface AuthState {
  user: UserRead | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export interface ApiError {
  detail: string;
  status?: number;
  code?: string;
}

// Утилитарные типы для работы с правами доступа
export type UserRole = 'admin' | 'manager' | 'staff';

export interface PermissionCheck {
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
}