import { getNowInBishkek } from './dateUtils';

/**
 * Утилиты для валидации и проверки дат
 */

/**
 * Проверяет, что дата не в прошлом (с учетом временной зоны Бишкека)
 */
export const isDateNotInPast = (dateString: string): boolean => {
  try {
    const inputDate = new Date(dateString);
    const today = getNowInBishkek();
    today.setHours(0, 0, 0, 0);
    
    return inputDate >= today;
  } catch (error) {
    return false;
  }
};

/**
 * Проверяет валидность даты
 */
export const isValidDate = (dateString: string | Date): boolean => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
};

/**
 * Получает начало дня в Бишкеке
 */
export const getStartOfDayBishkek = (date?: Date): Date => {
  const targetDate = date || getNowInBishkek();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
};

/**
 * Получает конец дня в Бишкеке
 */
export const getEndOfDayBishkek = (date?: Date): Date => {
  const targetDate = date || getNowInBishkek();
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
};