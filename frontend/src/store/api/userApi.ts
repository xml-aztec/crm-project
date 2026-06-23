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

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
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

    // Смена пароля
    changePassword: builder.mutation<{ message: string }, PasswordChangeRequest>({
      query: (data) => ({
        url: '/users/me/password',
        method: 'PATCH',
        body: data,
      }),
    }),

    // Флэт-список кодов прав текущего пользователя (resource.action) — используется
    // для показа/скрытия разделов в сайдбаре и защиты роутов на фронтенде
    getMyPermissions: builder.query<string[], void>({
      query: () => '/users/me/permissions',
      providesTags: ['CurrentUser'],
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useUpdateCurrentUserMutation,
  useChangePasswordMutation,
  useGetMyPermissionsQuery,
} = userApi;