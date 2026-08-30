import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { UserRead } from './userApi';

export interface UserPage {
  items: UserRead[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UsersPaginationParams {
  search?: string;
  role_id?: number;
  is_active?: boolean;
  sort_by?: 'full_name' | 'email' | 'created_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

// Тип для пользователя, ожидающего одобрения
export interface PendingUser {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  // Должность больше не задаётся при регистрации — всегда null до одобрения,
  // администратор выбирает её в форме одобрения (см. PendingUsersTable).
  position_id: number | null;
  role_id: number;
  position?: {
    id: number;
    name: string;
  };
  role?: {
    id: number;
    name: string;
  };
  created_at: string;
}

// Запрос на обновление пользователя
export interface UpdateUserRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  role_id?: number;
  position_id?: number;
  is_active?: boolean;
}

// Запрос на обновление пользователя администратором
export interface AdminUpdateUserRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  role_id?: number;
  position_id?: number;
  is_active?: boolean;
  salary_base?: number; 
}

// API для управления пользователями
export const usersManagementApi = createApi({
  reducerPath: 'usersManagementApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Users', 'PendingUsers'],
  endpoints: (builder) => ({
    // Получение всех пользователей
    getAllUsers: builder.query<UserRead[], void>({
      query: () => '/users/',
      providesTags: ['Users']
    }),

    getUsersPaginated: builder.query<UserPage, UsersPaginationParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              search.append(key, String(value));
            }
          });
        }
        return `/users/paginated?${search.toString()}`;
      },
      providesTags: ['Users']
    }),

    // Получение пользователей, ожидающих одобрения
    getPendingUsers: builder.query<PendingUser[], void>({
      query: () => '/users/pending',
      providesTags: ['PendingUsers']
    }),

    // Получение конкретного пользователя
    getUserById: builder.query<UserRead, number>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Users', id }]
    }),

    // Одобрение пользователя — должность больше не запрашивается при
    // регистрации, поэтому администратор выбирает её здесь.
    approveUser: builder.mutation<UserRead, { id: number; position_id: number }>({
      query: ({ id, position_id }) => ({
        url: `/users/${id}/approve`,
        method: 'PUT',
        body: { position_id },
      }),
      invalidatesTags: ['Users', 'PendingUsers']
    }),

    // Удаление пользователя из ожидающих
    deletePendingUser: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/users/pending/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['PendingUsers']
    }),

    // Удаление пользователя
    deleteUser: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Users']
    }),

    // Обновление пользователя
    updateUser: builder.mutation<UserRead, { id: number; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'Users', 
        { type: 'Users', id }
      ]
    }),

    // Обновление пользователя администратором
    adminUpdateUser: builder.mutation<UserRead, { id: number; data: AdminUpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}/admin`,
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: ['Users']
    }),

    // Переключение статуса пользователя
    toggleUserStatus: builder.mutation<UserRead, { id: number; is_active: boolean }>({
      query: ({ id, is_active }) => ({
        url: `/users/${id}/status`,
        method: 'PATCH',
        body: { is_active }
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'Users', 
        { type: 'Users', id }
      ]
    }),

    // Переключение статуса пользователя администратором
    adminToggleUserStatus: builder.mutation<UserRead, { id: number; is_active: boolean }>({
      query: ({ id, is_active }) => ({
        url: `/users/${id}/admin`,
        method: 'PATCH',
        body: { is_active }
      }),
      invalidatesTags: ['Users']
    }),
  })
});

export const {
  useGetAllUsersQuery,
  useGetUsersPaginatedQuery,
  useGetPendingUsersQuery,
  useGetUserByIdQuery,
  useApproveUserMutation,
  useDeletePendingUserMutation,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
  useAdminUpdateUserMutation,
  useAdminToggleUserStatusMutation,
} = usersManagementApi;

export type { UserRead };
