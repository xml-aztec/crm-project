import { baseApi } from './baseApi';
import { Position, Role } from './userApi'; // Переиспользуем типы из userApi

export const rolesPositionsApi = baseApi.injectEndpoints({
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