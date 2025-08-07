import { isRejectedWithValue, Middleware } from '@reduxjs/toolkit';
import { logoutUser } from '../store/slices/authSlice';
import type { AppDispatch } from '../store/store';

interface ErrorWithStatus {
  status?: number;
  data?: any;
}

/**
 * Middleware для обработки ошибок авторизации
 * Использует logoutUser для корректного завершения сессии
 */
export const authErrorMiddleware: Middleware<{}, any, AppDispatch> = ({ dispatch }) => next => action => {
  // Проверяем, содержит ли действие ошибку авторизации
  if (isRejectedWithValue(action)) {
    const payload = action.payload as ErrorWithStatus;
    
    if (payload && payload.status === 401) {
      // Используем logoutUser для корректного завершения сессии
      dispatch(logoutUser() as any); // Приводим к типу any для совместимости
    }
  }

  return next(action);
};