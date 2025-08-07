export interface User {
  id: number;
  full_name: string;
  email?: string;
  phone?: string;
  position?: {
    id: number;
    name: string;
  };
  role?: {
    id: number;
    name: string;
  } | null;
  branch_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserCreate {
  full_name: string;
  email?: string;
  phone?: string;
  position_id?: number;
  role_id?: number;
  branch_id?: number;
  password: string;
}

export interface UserUpdate {
  full_name?: string;
  email?: string;
  phone?: string;
  position_id?: number;
  role_id?: number;
  branch_id?: number;
}