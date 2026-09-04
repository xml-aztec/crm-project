import { describe, expect, it } from 'vitest';

import { asApiError, getApiErrorMessage, getFieldError } from './apiError';

/**
 * Разбор ошибок теперь общий для всех форм приложения. Ключевой случай —
 * FastAPI отдаёт `detail` СТРОКОЙ при обычной ошибке и МАССИВОМ при ошибке
 * валидации (422). Раньше код был написан под `any` и подставлял массив в
 * строковое поле, из-за чего пользователь видел «[object Object]».
 */
describe('getApiErrorMessage', () => {
  it('возвращает detail, когда это строка', () => {
    expect(
      getApiErrorMessage({ data: { detail: 'Клиент уже существует' } }, 'запасное'),
    ).toBe('Клиент уже существует');
  });

  it('достаёт msg из массива ошибок валидации, а не отдаёт массив целиком', () => {
    const error = {
      data: {
        detail: [
          { loc: ['body', 'email'], msg: 'неверный формат', type: 'value_error' },
        ],
      },
    };
    const message = getApiErrorMessage(error, 'запасное');
    expect(message).toBe('неверный формат');
    expect(message).not.toContain('object');
  });

  it('пропускает элементы без msg и берёт первый содержательный', () => {
    const error = { data: { detail: [{ type: 'x' }, { msg: 'вот сообщение' }] } };
    expect(getApiErrorMessage(error, 'запасное')).toBe('вот сообщение');
  });

  it('падает на message, когда запрос не дошёл до сервера', () => {
    expect(getApiErrorMessage({ message: 'Network Error' }, 'запасное')).toBe(
      'Network Error',
    );
  });

  it('возвращает запасной текст на пустом и неизвестном вводе', () => {
    expect(getApiErrorMessage(null, 'запасное')).toBe('запасное');
    expect(getApiErrorMessage(undefined, 'запасное')).toBe('запасное');
    expect(getApiErrorMessage({}, 'запасное')).toBe('запасное');
    expect(getApiErrorMessage({ data: { detail: [] } }, 'запасное')).toBe('запасное');
  });
});

describe('getFieldError', () => {
  it('находит ошибку поля в data.errors', () => {
    expect(getFieldError({ data: { errors: { email: 'занят' } } }, 'email')).toBe(
      'занят',
    );
  });

  it('находит ошибку поля, положенную прямо в data', () => {
    expect(getFieldError({ data: { phone: 'некорректный' } }, 'phone')).toBe(
      'некорректный',
    );
  });

  it('берёт первый элемент, когда ошибка поля пришла массивом', () => {
    expect(getFieldError({ data: { errors: { email: ['занят', 'ещё'] } } }, 'email')).toBe(
      'занят',
    );
  });

  it('возвращает undefined, когда ошибки поля нет', () => {
    expect(getFieldError({ data: {} }, 'email')).toBeUndefined();
    expect(getFieldError(null, 'email')).toBeUndefined();
  });
});

describe('asApiError', () => {
  it('превращает null и undefined в пустой объект, а не роняет обращение', () => {
    expect(asApiError(null)).toEqual({});
    expect(asApiError(undefined)).toEqual({});
    expect(asApiError(null).data?.detail).toBeUndefined();
  });

  it('сохраняет статус', () => {
    expect(asApiError({ status: 422 }).status).toBe(422);
  });
});
