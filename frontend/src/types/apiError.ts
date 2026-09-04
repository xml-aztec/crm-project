/**
 * Форма ошибки, которую отдаёт бэкенд и прокидывает RTK Query.
 *
 * До этого по кодовой базе было рассыпано около сотни `any`, почти все —
 * вокруг обработки ошибок: `catch (error: any)`, `(error: any) => string`,
 * `error: any` в пропсах. При включённом strict в tsconfig это означало, что
 * весь путь обработки ошибок не проверялся вовсе: опечатка в `error.data.detai`
 * прошла бы компиляцию и молча дала бы undefined в сообщении пользователю.
 *
 * FastAPI отдаёт ошибку валидации (422) как МАССИВ объектов в `detail`, а
 * обычную ошибку — как строку. Оба варианта описаны здесь, поэтому код,
 * разбирающий `detail`, обязан обработать оба.
 */
export interface ApiValidationIssue {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

export interface ApiError {
  /** HTTP-код или строковый код RTK Query (например, 'FETCH_ERROR'). */
  status?: number | string;
  data?: {
    detail?: string | ApiValidationIssue[];
    message?: string;
    /** Пофайловые ошибки формы: { email: 'занят' } или { email: ['занят'] }. */
    errors?: Record<string, string | string[]>;
    /** Часть эндпоинтов кладёт ошибку поля прямо в data, минуя `errors`. */
    [field: string]: unknown;
  };
  /** Сообщение сериализованной JS-ошибки, если запрос не дошёл до сервера. */
  message?: string;
  error?: string;
}

/** Приводит пойманное значение к разбираемой форме. */
export function asApiError(error: unknown): ApiError {
  return (error ?? {}) as ApiError;
}

/** Человекочитаемое сообщение с запасным вариантом. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = asApiError(error);
  const detail = apiError.data?.detail;

  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    const first = detail.find((issue) => issue?.msg);
    if (first?.msg) return first.msg;
  }
  return apiError.data?.message || apiError.message || fallback;
}


/**
 * Ошибка конкретного поля формы.
 *
 * Ищет её в обоих местах, где бэкенд её кладёт: в `data.errors.<поле>` и
 * прямо в `data.<поле>`; значение может быть строкой или массивом строк.
 */
export function getFieldError(error: unknown, field: string): string | undefined {
  const data = asApiError(error).data;
  if (!data) return undefined;

  const value = data.errors?.[field] ?? data[field];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}
