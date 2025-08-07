import { store } from '../store/store';
import { logoutUser } from '../store/slices/authSlice';
import { api } from '../api/axios';

interface FetchOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

/**
 * Хелпер для выполнения авторизованных запросов к API
 * Автоматически использует cookies и обрабатывает ошибки аутентификации
 */
export const fetchWithAuth = async <T = any>({
  url,
  method = 'GET',
  data,
  params,
  headers = {}
}: FetchOptions): Promise<T> => {
  try {
    const response = await api.request({
      url,
      method,
      data,
      params,
      headers,
      withCredentials: true, // Убеждаемся, что cookies отправляются
    });
    
    return response.data;
  } catch (error: any) {
    // Обработка конкретных ошибок
    if (error.response) {
      // Сервер вернул ошибку со статусом
      if (error.response.status === 401) {
        store.dispatch(logoutUser());
        throw new Error('Сессия истекла. Пожалуйста, войдите снова');
      }
      
      if (error.response.status === 403) {
        throw new Error('У вас нет доступа к этому ресурсу');
      }
      
      // Возвращаем сообщение об ошибке от сервера, если оно есть
      if (error.response.data && error.response.data.detail) {
        throw new Error(error.response.data.detail);
      }
    }
    
    // Сетевые ошибки и прочие
    throw error;
  }
};

// Примеры использования:
// 
// 1. GET запрос:
// const users = await fetchWithAuth<User[]>({ url: '/users' });
// 
// 2. POST запрос:
// const newUser = await fetchWithAuth<User>({
//   url: '/users',
//   method: 'POST',
//   data: { name: 'John', email: 'john@example.com' }
// });
// 
// 3. С параметрами и заголовками:
// const result = await fetchWithAuth<SearchResult>({
//   url: '/search',
//   params: { query: 'test', page: 1 },
//   headers: { 'Accept-Language': 'ru' }
// });