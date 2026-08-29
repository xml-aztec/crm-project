import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Position, Role } from './userApi'; // Переиспользуем типы из userApi

export const rolesPositionsApi = createApi({
  reducerPath: 'rolesPositionsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Roles', 'Positions'],
  endpoints: (builder) => ({
    // Получение всех ролей
    getRoles: builder.query<Role[], void>({
      query: () => '/roles/',
      providesTags: ['Roles']
    }),
    
    // Получение всех должностей
    getPositions: builder.query<Position[], void>({
      query: () => '/positions/',
      providesTags: ['Positions']
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetPositionsQuery,
} = rolesPositionsApi;