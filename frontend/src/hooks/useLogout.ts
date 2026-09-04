import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppDispatch } from './reduxHooks';
import { logoutUser } from '../store/slices/authSlice';

interface UseLogoutOptions {
  showConfirm?: boolean;
  redirectTo?: string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * Универсальный хук для logout с использованием новой ручки /auth/logout
 */
export const useLogout = (options: UseLogoutOptions = {}) => {
  const {
    showConfirm = true,
    redirectTo = '/signin',
    onSuccess,
    onError
  } = options;

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(async () => {
    if (isLoading) return false; // Предотвращаем повторные вызовы

    if (showConfirm) {
      const confirmed = window.confirm('Вы уверены, что хотите выйти?');
      if (!confirmed) return false;
    }

    setIsLoading(true);
    
    try {
      await dispatch(logoutUser()).unwrap();
      onSuccess?.();
      navigate(redirectTo, { replace: true });
      return true;
    } catch (error) {
      onError?.(error);
      // Ошибка уже обработана в slice, просто перенаправляем
      if (import.meta.env.DEV) {
        console.warn('Logout error handled, redirecting...', error);
      }
      navigate(redirectTo, { replace: true });
      return true; // Всегда считаем logout успешным
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, navigate, isLoading, showConfirm, redirectTo, onSuccess, onError]);

  return { logout, isLoading };
};