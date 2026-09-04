import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
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

/**
 * Базовый запрос с авто-выходом при 401.
 *
 * Типы здесь важны не сами по себе: раньше сигнатура была
 * `(args: any, api: any, extraOptions: any)`, и этот `any` протекал в тип
 * КАЖДОГО эндпоинта — то есть типобезопасности не было во всём слое доступа
 * к данным, несмотря на strict в tsconfig. Теперь это полноценный
 * BaseQueryFn, и ошибки в описании эндпоинтов ловит компилятор.
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) {
    return result;
  }

  // Сам /auth/logout тоже может ответить 401 — не зацикливаемся на нём.
  const url = typeof args === 'string' ? args : args.url;
  const isLogoutRequest = url.includes('/auth/logout');
  if (isLogoutRequest) {
    return result;
  }

  try {
    // Дожидаемся завершения thunk'а, но без unwrap(): его ошибку мы всё
    // равно глотаем — локальная сессия чистится в любом случае, а редирект
    // ниже выполняется независимо от ответа сервера.
    await (api.dispatch(logoutUser() as never) as unknown as Promise<unknown>);
  } catch {
    // Ошибку серверного logout игнорируем.
  }

  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/signin') {
      // Куда вернуть пользователя после повторного входа.
      localStorage.setItem('redirectAfterLogin', currentPath);
    }
    window.location.href = '/signin';
  }

  return result;
};
