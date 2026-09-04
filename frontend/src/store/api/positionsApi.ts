import { baseApi } from './baseApi';

export interface Position {
  id: number;
  name: string;
}

export interface CreatePositionRequest {
  name: string;
}

export interface UpdatePositionRequest {
  name?: string;
}

export const positionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPositions: builder.query<Position[], void>({
      query: () => '/positions/',
      providesTags: ['Position'],
    }),
    createPosition: builder.mutation<Position, CreatePositionRequest>({
      query: (data) => ({
        url: '/positions/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Position'],
    }),
    updatePosition: builder.mutation<Position, { id: number; data: UpdatePositionRequest }>({
      query: ({ id, data }) => ({
        url: `/positions/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Position'],
    }),
    deletePosition: builder.mutation<void, number>({
      query: (id) => ({
        url: `/positions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Position'],
    }),
  }),
});

export const {
  useGetPositionsQuery,
  useCreatePositionMutation,
  useUpdatePositionMutation,
  useDeletePositionMutation,
} = positionsApi;