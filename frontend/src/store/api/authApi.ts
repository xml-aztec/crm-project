import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';

// Типы данных для запросов и ответов
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

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  position_id: number;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface MessageResponse {
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Создание API с использованием RTK Query
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Positions', 'Roles'],
  endpoints: (builder) => ({
    // Вход в систему — FastAPI's OAuth2PasswordRequestForm требует
    // form-urlencoded тело с полями username/password, не JSON.
    login: builder.mutation<MessageResponse, LoginRequest>({
      query: ({ email, password }) => {
        const body = new URLSearchParams();
        body.append('username', email);
        body.append('password', password);
        return {
          url: '/auth/login',
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        };
      },
    }),

    // Выход из системы
    logout: builder.mutation<MessageResponse, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),

    // Получение списка позиций
    getPositions: builder.query<Position[], void>({
      query: () => '/positions/',
      providesTags: ['Positions']
    }),
    
    // Получение списка ролей
    getRoles: builder.query<Role[], void>({
      query: () => '/roles/',
      providesTags: ['Roles']
    }),
    
    // Регистрация нового пользователя
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Запрос сброса пароля по email
    forgotPassword: builder.mutation<MessageResponse, ForgotPasswordRequest>({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),

    // Сброс пароля по токену из письма
    resetPassword: builder.mutation<MessageResponse, ResetPasswordRequest>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

// Экспорт хуков для использования в компонентах
export const {
  useLoginMutation,
  useLogoutMutation,
  useGetPositionsQuery,
  useGetRolesQuery,
  useRegisterMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;