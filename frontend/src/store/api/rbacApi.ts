import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Permission {
  id: number;
  resource: string;
  action: string;
  code: string;
}

export interface RbacRole {
  id: number;
  name: string;
  branch_id: number | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  permission_codes: string[];
  user_count: number;
}

export interface CreateRoleRequest {
  name: string;
  branch_id?: number | null;
  permission_codes: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  permission_codes?: string[];
}

export interface RoleUser {
  id: number;
  full_name: string | null;
  email: string;
}

export const rbacApi = createApi({
  reducerPath: 'rbacApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Permission', 'RbacRole', 'UserRoles', 'RoleUsers'],
  endpoints: (builder) => ({
    getPermissions: builder.query<Permission[], void>({
      query: () => 'rbac/permissions',
      providesTags: ['Permission'],
    }),

    getRoles: builder.query<RbacRole[], void>({
      query: () => 'rbac/roles',
      providesTags: ['RbacRole'],
    }),

    createRole: builder.mutation<RbacRole, CreateRoleRequest>({
      query: (data) => ({
        url: 'rbac/roles',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['RbacRole'],
    }),

    updateRole: builder.mutation<RbacRole, { id: number; data: UpdateRoleRequest }>({
      query: ({ id, data }) => ({
        url: `rbac/roles/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['RbacRole'],
    }),

    deleteRole: builder.mutation<void, number>({
      query: (id) => ({
        url: `rbac/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RbacRole'],
    }),

    getUserRoles: builder.query<RbacRole[], number>({
      query: (userId) => `rbac/users/${userId}/roles`,
      providesTags: (_result, _error, userId) => [{ type: 'UserRoles', id: userId }],
    }),

    getRoleUsers: builder.query<RoleUser[], number>({
      query: (roleId) => `rbac/roles/${roleId}/users`,
      providesTags: (_result, _error, roleId) => [{ type: 'RoleUsers', id: roleId }],
    }),

    assignRoleToUser: builder.mutation<void, { roleId: number; userId: number }>({
      query: ({ roleId, userId }) => ({
        url: `rbac/roles/${roleId}/assign`,
        method: 'POST',
        body: { user_id: userId },
      }),
      invalidatesTags: (_result, _error, { roleId, userId }) => [
        'RbacRole',
        { type: 'UserRoles', id: userId },
        { type: 'RoleUsers', id: roleId },
      ],
    }),

    unassignRoleFromUser: builder.mutation<void, { roleId: number; userId: number }>({
      query: ({ roleId, userId }) => ({
        url: `rbac/roles/${roleId}/assign/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { roleId, userId }) => [
        'RbacRole',
        { type: 'UserRoles', id: userId },
        { type: 'RoleUsers', id: roleId },
      ],
    }),
  }),
});

export const {
  useGetPermissionsQuery,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetUserRolesQuery,
  useGetRoleUsersQuery,
  useAssignRoleToUserMutation,
  useUnassignRoleFromUserMutation,
} = rbacApi;
