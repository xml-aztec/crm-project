import { useMemo } from 'react';
import { 
  formatDateTime, 
  formatDate, 
  formatTime, 
  formatMonth, 
  getNowInBishkek,
  getRelativeTime 
} from '../utils/dateUtils';

/**
 * Универсальный хук для всех типов форматирования
 * Заменяет все локальные форматтеры в компонентах
 */
export const useUniversalFormatters = () => {
  return useMemo(() => ({
    // === ДАТА И ВРЕМЯ ===
    
    // Полная дата и время с автоматической конвертацией UTC→Бишкек
    dateTime: (date: string | Date | null | undefined): string => {
      if (!date) return '-';
      try {
        return formatDateTime(date);
      } catch (error) {
        return 'Ошибка даты';
      }
    },
    
    // Только дата
    date: (date: string | Date | null | undefined): string => {
      if (!date) return '-';
      try {
        return formatDate(date);
      } catch (error) {
        return 'Ошибка даты';
      }
    },
    
    // Только время с конвертацией UTC→Бишкек
    time: (date: string | Date | null | undefined): string => {
      if (!date) return '-';
      try {
        return formatTime(date);
      } catch (error) {
        return 'Ошибка времени';
      }
    },
    
    // Относительное время (2 часа назад, вчера)
    relative: (date: string | Date | null | undefined): string => {
      if (!date) return '-';
      try {
        return getRelativeTime(date);
      } catch (error) {
        return 'неизвестно';
      }
    },
    
    // Месяц и год (Январь 2025)
    month: (monthString: string | null | undefined): string => {
      if (!monthString) return '-';
      try {
        return formatMonth(monthString);
      } catch (error) {
        return 'Ошибка месяца';
      }
    },
    
    // === ДЕНЬГИ ===
    
    // Форматирование суммы с валютой KGS
    currency: (amount: number | string | null | undefined): string => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (numAmount === null || numAmount === undefined || isNaN(numAmount)) return '0 сом';
      
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KGS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numAmount);
    },
    
    // Форматирование суммы с суффиксом "сом"
    amount: (amount: number | string | null | undefined): string => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (numAmount === null || numAmount === undefined || isNaN(numAmount)) return '0 сом';
      
      return new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numAmount) + ' сом';
    },
    
    // === ЧИСЛА ===
    
    // Обычное число с разделителями тысяч
    number: (num: number | string | null | undefined): string => {
      const numValue = typeof num === 'string' ? parseFloat(num) : num;
      if (numValue === null || numValue === undefined || isNaN(numValue)) return '0';
      
      return new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numValue);
    },
    
    // Процент
    percent: (value: number | string | null | undefined, decimals: number = 1): string => {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (numValue === null || numValue === undefined || isNaN(numValue)) return '0%';
      
      return numValue.toFixed(decimals) + '%';
    },
    
    // === УТИЛИТЫ ===
    
    // Текущее время в Бишкеке
    now: () => getNowInBishkek(),
    
    // Безопасное значение
    safe: (value: any, fallback: string = '-'): string => {
      if (value === null || value === undefined || value === '' || 
          (typeof value === 'string' && value.trim() === '')) {
        return fallback;
      }
      return String(value);
    }
  }), []);
};