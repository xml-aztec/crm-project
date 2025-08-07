import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Branch {
  id: number;
  name: string;
  location: string;
}

export interface CreateBranchRequest {
  name: string;
  location: string;
}

export interface UpdateBranchRequest {
  name?: string;
  location?: string;
}

export const branchesApi = createApi({
  reducerPath: 'branchesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Branch'],
  endpoints: (builder) => ({
    getBranches: builder.query<Branch[], void>({
      query: () => 'branches/',
      providesTags: ['Branch'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    getBranchById: builder.query<Branch, number>({
      query: (id) => `branches/${id}`,
      providesTags: (_, __, id) => [{ type: 'Branch', id }],
    }),

    createBranch: builder.mutation<Branch, CreateBranchRequest>({
      query: (branch) => ({
        url: 'branches/',
        method: 'POST',
        body: branch,
      }),
      invalidatesTags: ['Branch'],
    }),

    updateBranch: builder.mutation<Branch, { id: number; data: UpdateBranchRequest }>({
      query: ({ id, data }) => ({
        url: `branches/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Branch', id }, 'Branch'],
    }),

    deleteBranch: builder.mutation<void, number>({
      query: (id) => ({
        url: `branches/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Branch'],
    }),
  }),
});

export const {
  useGetBranchesQuery,
  useGetBranchByIdQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} = branchesApi;