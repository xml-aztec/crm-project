import { isRejectedWithValue, Middleware } from '@reduxjs/toolkit';
import { logout } from '../slices/authSlice';

interface ErrorWithStatus {
  status?: number;
  data?: unknown;
}

const PUBLIC_PATHS = ['/signin', '/signup'];

/**
 * Middleware для централизованной обработки ошибок авторизации
 */
export const authErrorMiddleware: Middleware = ({ dispatch }) => next => action => {
  // Проверяем, содержит ли действие ошибку авторизации
  if (isRejectedWithValue(action)) {
    const payload = action.payload as ErrorWithStatus;

    // 401 от fetchCurrentUser — это ожидаемый результат самой первой проверки
    // сессии ("вы ещё не вошли"), а не её истечение. RequireAuth уже корректно
    // редиректит на /signin по самому состоянию isAuthenticated. Жёсткий
    // window.location.href здесь создавал бесконечный цикл релоадов на любом
    // свежем неавторизованном заходе (включая сам /signin).
    const isInitialAuthCheck =
      typeof action.type === 'string' && action.type.startsWith('auth/fetchCurrentUser');

    // Если ошибка 401 (и это не первичная проверка) - автоматически выходим из системы
    if (payload?.status === 401 && !isInitialAuthCheck) {
      dispatch(logout());

      // Перенаправляем на страницу входа, если мы там ещё не находимся
      if (typeof window !== 'undefined' && !PUBLIC_PATHS.includes(window.location.pathname)) {
        window.location.href = '/signin';
      }
    }
  }

  return next(action);
};