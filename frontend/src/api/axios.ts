import axios from 'axios';
import { store } from '../store/store';
import { logoutUser } from '../store/slices/authSlice';

// Определяем базовый URL API в зависимости от окружения
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://leadflow-beta.fly.dev/api';

// Базовый API-клиент с поддержкой cookies
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// API клиент для авторизации
export const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  withCredentials: true,
});

// Перехватчик ответов для обработки ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Если ошибка 401 - выход из системы
    if (error.response && error.response.status === 401) {
      // Проверяем, что это не запрос logout (избегаем рекурсии)
      const isLogoutRequest = error.config?.url?.includes('/auth/logout');
      
      if (!isLogoutRequest) {
        // Используем dispatch для вызова logoutUser
        store.dispatch(logoutUser());
      }
    }
    
    return Promise.reject(error);
  }
);

// Сервисы API для работы с авторизацией
export const authService = {
  /**
   * Вход в систему
   * @param email - адрес электронной почты
   * @param password - пароль пользователя
   */
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // FastAPI OAuth2 ожидает username поле
    formData.append('password', password);
    
    const response = await authApi.post('/auth/login', formData);
    return response.data;
  },
  
  /**
   * Получение данных текущего пользователя
   */
  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  /**
   * Выход из системы
   * Вызывает новую ручку /auth/logout для корректного завершения сессии на сервере
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error: any) {
      // Логируем ошибку, но не прерываем процесс logout
      if (import.meta.env.DEV) {
        console.warn('Ошибка при выходе из системы на сервере:', error);
      }
      // В продакшене можно отправить в сервис мониторинга
    }
  },
};