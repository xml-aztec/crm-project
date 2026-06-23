import { useMemo } from 'react';
import { useGetMyPermissionsQuery } from '../store/api/userApi';
import { useAppSelector } from './reduxHooks';

export const usePermissions = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { data: permissions = [], isLoading } = useGetMyPermissionsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const hasPermission = (code: string) => permissionSet.has(code);

  return { permissions: permissionSet, hasPermission, isLoading: isAuthenticated && isLoading };
};
