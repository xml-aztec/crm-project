import { baseApi } from './baseApi';
import { User } from '../../types/user';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => 'users/',
      providesTags: ['User'],
    }),
    
    getUserById: builder.query<User, number>({
      query: (id) => `users/${id}`,
      providesTags: (_, __, id) => [{ type: 'User', id }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
} = usersApi;