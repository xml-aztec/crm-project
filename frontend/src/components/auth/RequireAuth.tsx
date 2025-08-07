import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { fetchCurrentUser } from '../../store/slices/authSlice';

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, user, error } = useAppSelector(state => state.auth);
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated && !user && !loading && !error) {
      dispatch(fetchCurrentUser());
    }
  }, []);

  // Если есть ошибка 401 - сразу редирект
  if (error && (error as any).status === 401) {
    const currentPath = location.pathname + location.search;
    if (currentPath !== '/signin') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }
    return <Navigate to="/signin" replace />;
  }

  // Показываем загрузку только при первичной проверке
  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // Если не авторизован после проверки - редирект на вход
  if (!loading && !isAuthenticated && !user) {
    const currentPath = location.pathname + location.search;
    if (currentPath !== '/signin') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }
    return <Navigate to="/signin" replace />;
  }

  // Если авторизован - показываем запрошенную страницу
  return <>{children}</>;
}