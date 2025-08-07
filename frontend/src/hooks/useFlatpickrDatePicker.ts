import { useState, useCallback } from 'react';

interface UseFlatpickrDatePickerOptions {
  initialValue?: string;
  onDateChange?: (dateStr: string, dates: Date[]) => void;
  validateDate?: (dateStr: string) => string | null;
  // ✅ УБИРАЕМ: неиспользуемый параметр mode
  // mode?: "single" | "multiple" | "range" | "time";
}

export const useFlatpickrDatePicker = (options: UseFlatpickrDatePickerOptions = {}) => {
  const { initialValue = '', onDateChange, validateDate } = options;
  
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleDateChange = useCallback((dates: Date[], dateStr: string) => {
    setValue(dateStr);
    
    // Очищаем ошибку при изменении
    if (error) {
      setError(null);
    }
    
    // Валидация
    if (dateStr && validateDate) {
      const validationError = validateDate(dateStr);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    
    // Вызываем callback если все валидно
    onDateChange?.(dateStr, dates);
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
    isValid: !error && (value === '' || value.length > 0)
  };
};