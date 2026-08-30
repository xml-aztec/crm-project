import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';

export type TaskStatus = 'pending' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  due_at: string;
  reminder_at: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  customer_id: number | null;
  order_id: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface TaskPage {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  due_at: string;
  reminder_at?: string | null;
  priority?: TaskPriority;
  customer_id?: number | null;
  order_id?: number | null;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  due_at?: string;
  reminder_at?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  customer_id?: number | null;
  order_id?: number | null;
}

export interface TasksQueryParams {
  status?: TaskStatus;
  date_from?: string;
  date_to?: string;
  customer_id?: number;
  order_id?: number;
  user_id?: number;
  page?: number;
  page_size?: number;
}

function buildQueryString(params?: Record<string, unknown>): string {
  const search = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.append(key, String(value));
      }
    });
  }
  return search.toString();
}

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Task'],
  endpoints: (builder) => ({
    getTasksPaginated: builder.query<TaskPage, TasksQueryParams | void>({
      query: (params) => `tasks?${buildQueryString(params as Record<string, unknown>)}`,
      providesTags: ['Task'],
    }),
    getTask: builder.query<Task, number>({
      query: (id) => `tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),
    createTask: builder.mutation<Task, CreateTaskRequest>({
      query: (body) => ({ url: 'tasks', method: 'POST', body }),
      invalidatesTags: ['Task'],
    }),
    updateTask: builder.mutation<Task, { id: number; data: UpdateTaskRequest }>({
      query: ({ id, data }) => ({ url: `tasks/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['Task'],
    }),
    updateTaskStatus: builder.mutation<Task, { id: number; status: TaskStatus }>({
      query: ({ id, status }) => ({ url: `tasks/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Task'],
    }),
    deleteTask: builder.mutation<void, number>({
      query: (id) => ({ url: `tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Task'],
    }),
  }),
});

export const {
  useGetTasksPaginatedQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
} = tasksApi;
