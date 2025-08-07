import { isRejectedWithValue, Middleware } from '@reduxjs/toolkit';
import { logout } from '../slices/authSlice';

interface ErrorWithStatus {
  status?: number;
  data?: any;
}

/**
 * Middleware для централизованной обработки ошибок авторизации
 */
export const authErrorMiddleware: Middleware = ({ dispatch }) => next => action => {
  // Проверяем, содержит ли действие ошибку авторизации
  if (isRejectedWithValue(action)) {
    const payload = action.payload as ErrorWithStatus;
    
    // Если ошибка 401 - автоматически выходим из системы
    if (payload && payload.status === 401) {
      dispatch(logout());
      
      // Перенаправляем на страницу входа
      if (typeof window !== 'undefined') {
        window.location.href = '/signin';
      }
    }
  }

  return next(action);
};