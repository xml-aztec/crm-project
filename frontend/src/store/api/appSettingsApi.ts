import { baseApi } from './baseApi';

export interface AppSettings {
  company_name: string | null;
  company_logo_url: string | null;
  company_address: string | null;
  company_phone: string | null;
  default_warehouse_id: number | null;
  default_branch_id: number | null;
  updated_at: string | null;
}

export interface UpdateAppSettingsRequest {
  company_name?: string | null;
  company_logo_url?: string | null;
  company_address?: string | null;
  company_phone?: string | null;
  default_warehouse_id?: number | null;
  default_branch_id?: number | null;
}

export const appSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppSettings: builder.query<AppSettings, void>({
      query: () => 'settings/general/',
      providesTags: ['AppSettings'],
    }),

    updateAppSettings: builder.mutation<AppSettings, UpdateAppSettingsRequest>({
      query: (data) => ({
        url: 'settings/general/',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['AppSettings'],
    }),
  }),
});

export const { useGetAppSettingsQuery, useUpdateAppSettingsMutation } = appSettingsApi;
