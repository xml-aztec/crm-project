import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';

// Тип данных для пользователя
export interface Position {
  id: number;
  name: string;
  description?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface UserRead {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  position?: Position; 
  position_id?: number; 
  role?: Role;          
  role_id?: number;    
  is_active: boolean;
  salary_base?: number; 
  created_at?: string;
  updated_at?: string;
}

// Тип для запроса обновления пользователя
export interface UserUpdate {
  full_name?: string;
  email?: string;
  phone?: string;
}

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['CurrentUser'],
  endpoints: (builder) => ({
    // Получение данных текущего пользователя
    getCurrentUser: builder.query<UserRead, void>({
      query: () => '/users/me',
      providesTags: ['CurrentUser'],
    }),
    
    // Обновление данных текущего пользователя
    updateCurrentUser: builder.mutation<UserRead, UserUpdate>({
      query: (userData) => ({
        url: '/users/me',
        method: 'PATCH',
        body: userData,
      }),
      invalidatesTags: ['CurrentUser'],
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useUpdateCurrentUserMutation,
} = userApi;