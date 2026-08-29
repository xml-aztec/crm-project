import { useMemo } from 'react';
import { useAppSelector } from './reduxHooks';
import { UserRole, PermissionCheck } from '../types/auth';

/**
 * Хук для проверки прав доступа пользователя
 */
export const useRoleAccess = (): PermissionCheck & {
  user: any;
  isAuthenticated: boolean;
} => {
  const { user, isAuthenticated } = useAppSelector(state => state.auth);

  return useMemo(() => {
    const currentRole = user?.role?.name as UserRole;

    const hasRole = (role: UserRole): boolean => {
      return currentRole === role;
    };

    const hasAnyRole = (roles: UserRole[]): boolean => {
      return roles.includes(currentRole);
    };

    // Источник истины — RBAC на бэкенде (`/users/me` -> is_admin, вычисляется
    // через app.rbac.service.user_is_admin), а не легаси role.name/role_id:
    // бэкенд больше не считает roles.name достаточным для admin-доступа,
    // и объект user с /users/me вообще не содержит вложенный role.name.
    const isAdmin = user?.is_admin === true;
    const isManager = currentRole === 'manager' || isAdmin;
    const canEdit = isManager || currentRole === 'staff';
    const canDelete = isAdmin;
    const canView = isAuthenticated;

    return {
      user,
      isAuthenticated,
      hasRole,
      hasAnyRole,
      isAdmin,
      isManager,
      canEdit,
      canDelete,
      canView
    };
  }, [user, isAuthenticated]);
};