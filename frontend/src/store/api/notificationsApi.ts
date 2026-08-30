import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';

export interface AppNotification {
  id: number;
  title: string;
  message: string | null;
  is_read: boolean;
  read_at: string | null;
  type: string | null;
  entity_id: number | null;
  created_at: string;
}

export interface NotificationPage {
  items: AppNotification[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UnreadCount {
  count: number;
}

export type NotificationChannel = 'email' | 'in_app';

export interface NotificationPreference {
  notification_type_code: string;
  notification_type_label: string;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface NotificationPreferenceUpdate {
  notification_type_code: string;
  channel: NotificationChannel;
  enabled: boolean;
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notification', 'NotificationPreference'],
  endpoints: (builder) => ({
    getNotifications: builder.query<AppNotification[], void>({
      query: () => 'notifications',
      providesTags: ['Notification'],
    }),
    // Постраничная лента для колокольчика — подгрузка при скролле: каждая
    // следующая страница дописывается в один и тот же кэш вместо замены.
    getNotificationsPaginated: builder.query<NotificationPage, number>({
      query: (page) => `notifications/paginated?page=${page}&page_size=20`,
      providesTags: ['Notification'],
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (currentCache, newResponse, { arg: page }) => {
        if (page === 1) return newResponse;
        return {
          ...newResponse,
          items: [...currentCache.items, ...newResponse.items],
        };
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
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
    getNotificationPreferences: builder.query<NotificationPreference[], void>({
      query: () => 'notifications/preferences',
      providesTags: ['NotificationPreference'],
    }),
    updateNotificationPreferences: builder.mutation<NotificationPreference[], NotificationPreferenceUpdate[]>({
      query: (body) => ({ url: 'notifications/preferences', method: 'PUT', body }),
      invalidatesTags: ['NotificationPreference'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetNotificationsPaginatedQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} = notificationsApi;
