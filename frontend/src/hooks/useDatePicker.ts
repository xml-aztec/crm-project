import { useState, useCallback } from 'react';
import { isValidDate } from '../utils/dateValidation';

interface UseDatePickerOptions {
  initialValue?: string;
  onDateChange?: (date: string) => void;
  validateDate?: (date: string) => string | null;
}

export const useDatePicker = (options: UseDatePickerOptions = {}) => {
  const { initialValue = '', onDateChange, validateDate } = options;
  
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleDateChange = useCallback((newDate: string) => {
    setValue(newDate);
    
    // Очищаем ошибку при изменении
    if (error) {
      setError(null);
    }
    
    // Валидация
    if (newDate) {
      if (!isValidDate(newDate)) {
        setError('Некорректная дата');
        return;
      }
      
      if (validateDate) {
        const validationError = validateDate(newDate);
        if (validationError) {
          setError(validationError);
          return;
        }
      }
    }
    
    // Вызываем callback если все валидно
    onDateChange?.(newDate);
  }, [error, validateDate, onDateChange]);

  const reset = useCallback(() => {
    setValue('');
    setError(null);
  }, []);

  const setErrorMessage = useCallback((message: string | null) => {
    setError(message);
  }, []);

  return {
    value,
    error,
    onChange: handleDateChange,
    reset,
    setError: setErrorMessage,
    isValid: !error && (value === '' || isValidDate(value))
  };
};