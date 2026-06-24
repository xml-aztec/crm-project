import { useCallback, useMemo } from 'react';
import { useGetMyPermissionsQuery } from '../store/api/userApi';
import { useAppSelector } from './reduxHooks';

const EMPTY_PERMISSIONS: string[] = [];

export const usePermissions = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { data: permissions = EMPTY_PERMISSIONS, isLoading } = useGetMyPermissionsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  // useCallback здесь не для оптимизации: без стабильной ссылки на hasPermission
  // любой ре-рендер AppSidebar пересоздаёт visibleNavItems (он в зависимостях
  // useMemo), что перезапускает эффект синхронизации openSubmenu с текущим
  // location — и тот немедленно закрывает только что открытое подменю
  // ("Склады"/"Поставки"/"Финансы" не разворачиваются по клику).
  const hasPermission = useCallback(
    (code: string) => permissionSet.has(code),
    [permissionSet]
  );

  return { permissions: permissionSet, hasPermission, isLoading: isAuthenticated && isLoading };
};
