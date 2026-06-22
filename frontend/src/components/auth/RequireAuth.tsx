import { Navigate, useLocation } from 'react-router';
import { useAppSelector } from '../../hooks/reduxHooks';

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, initialized } = useAppSelector(state => state.auth);
  const location = useLocation();

  // Единственная проверка сессии запускается из App.tsx (dispatch(fetchCurrentUser())
  // при !initialized). Раньше RequireAuth дублировал этот dispatch сам — два
  // независимых вызова создавали гонку, из-за которой прямой переход на
  // защищённый роут на холодную мог увести через /signin не туда, куда нужно.
  // Здесь только читаем готовое состояние и ничего не диспатчим.

  // Пока идёт первичная проверка сессии — показываем загрузку, а не редирект.
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // Проверка завершена и не авторизован - редирект на вход
  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    if (currentPath !== '/signin') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }
    return <Navigate to="/signin" replace />;
  }

  // Если авторизован - показываем запрошенную страницу
  return <>{children}</>;
}