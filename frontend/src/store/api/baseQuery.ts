import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logoutUser } from '../slices/authSlice';

export const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  credentials: 'include',
  prepareHeaders: (headers) => {
    // Не перезаписываем Content-Type, если конкретный запрос уже задал свой
    // (например, /auth/login отправляет form-urlencoded для OAuth2PasswordRequestForm).
    if (!headers.get('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  },
});

export const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // Если получили 401 ошибку
  if (result.error && result.error.status === 401) {
    // Проверяем, что это не запрос logout (избегаем рекурсии)
    const isLogoutRequest = typeof args === 'object' && 
                           args.url && 
                           args.url.includes('/auth/logout');
    
    if (!isLogoutRequest) {
      // Используем logoutUser для корректного завершения сессии
      try {
        await api.dispatch(logoutUser()).unwrap();
      } catch (logoutError) {
        // Игнорируем ошибки logout в baseQuery
        if (import.meta.env.DEV) {
          console.warn('Logout error in baseQuery:', logoutError);
        }
      }
    }
    
    // Перенаправляем на страницу входа
    if (typeof window !== 'undefined') {
      // Сохраняем текущую страницу для возврата после входа
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== '/signin' && !isLogoutRequest) {
        localStorage.setItem('redirectAfterLogin', currentPath);
      }
      
      // Перенаправляем на страницу входа только если это не logout
      if (!isLogoutRequest) {
        window.location.href = '/signin';
      }
    }
  }
  
  return result;
};