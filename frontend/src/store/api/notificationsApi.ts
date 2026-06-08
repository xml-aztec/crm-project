import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';

export interface AppNotification {
  id: number;
  title: string;
  message: string | null;
  is_read: boolean;
  type: string | null;
  entity_id: number | null;
  created_at: string;
}

export interface UnreadCount {
  count: number;
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notification'],
  endpoints: (builder) => ({
    getNotifications: builder.query<AppNotification[], void>({
      query: () => 'notifications',
      providesTags: ['Notification'],
    }),
    getUnreadCount: builder.query<UnreadCount, void>({
      query: () => 'notifications/unread-count',
      providesTags: ['Notification'],
    }),
    markRead: builder.mutation<AppNotification, number>({
      query: (id) => ({ url: `notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
    markAllRead: builder.mutation<void, void>({
      query: () => ({ url: 'notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} = notificationsApi;
