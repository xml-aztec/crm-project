import { useMemo } from 'react';
import { 
  formatDateTime, 
  formatDate, 
  formatTime, 
  formatMonth, 
  formatShortDate,
  getNowInBishkek
} from '../utils/dateUtils';

/**
 * Хук для переиспользования форматтеров дат и времени
 * Все функции автоматически конвертируют UTC время в местное время Бишкека (UTC+6)
 */
export const useDateFormatters = () => {
  return useMemo(() => ({
    // Полная дата и время (01.12.2025, 14:30)
    dateTime: (date: string | Date) => formatDateTime(date),
    
    // Только дата (01.12.2025)
    date: (date: string | Date) => formatDate(date),
    
    // Только время (14:30) - автоматически конвертирует из UTC
    time: (date: string | Date) => formatTime(date),
    
    // Месяц в длинном формате (Декабрь 2025)
    month: (monthString: string) => formatMonth(monthString),
    
    // Короткая дата (01.12.25)
    shortDate: (date: string | Date) => formatShortDate(date),
    
    // Цена с валютой KGS
    price: (price: number) => new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KGS',
      minimumFractionDigits: 0
    }).format(price),
    
    // Число без валюты с суффиксом "сом"
    amount: (amount: number) => new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' сом',
    
    // Текущее время в Бишкеке
    now: () => getNowInBishkek()
  }), []);
};