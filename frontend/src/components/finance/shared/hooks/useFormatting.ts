import { useCallback } from 'react';

export const useFormatting = () => {
  const formatAmount = useCallback((amount: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' сом';
  }, []);

  const formatMonth = useCallback((monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('ru-RU', { 
      year: 'numeric', 
      month: 'long' 
    });
  }, []);

  const getCompletionColor = useCallback((percentage: number): string => {
    if (percentage >= 100) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }, []);

  return {
    formatAmount,
    formatMonth,
    getCompletionColor
  };
};