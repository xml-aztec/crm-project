import React, { useState } from 'react';
import DatePicker from './DatePicker';

// Простой DatePicker для форм
export const FormDatePicker: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}> = ({ label, value, onChange, error, required, placeholder }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <DatePicker
      label={label}
      value={value}
      onChange={handleChange}
      error={error}
      required={required}
      placeholder={placeholder}
      size="md"
      variant="default"
    />
  );
};

// DatePicker только для будущих дат
export const FutureDatePicker: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}> = ({ label, value, onChange, error, required }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  
  return (
    <DatePicker
      label={label}
      value={value}
      onChange={handleChange}
      error={error}
      required={required}
      min={today}
      placeholder="Выберите дату в будущем"
      size="md"
    />
  );
};

// Компактный DatePicker для фильтров
export const FilterDatePicker: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = "Дата" }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <DatePicker
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      size="sm"
      variant="default"
      showIcon={true}
    />
  );
};

// Интерфейс для DateRangePicker
interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  label?: string;
  error?: string | null | undefined;
  disabled?: boolean;
  className?: string;
}

// DatePicker для диапазона дат
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = 'Период',
  error,
  disabled = false,
  className = ''
}) => {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStartDateChange(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEndDateChange(e.target.value);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <DatePicker
          value={startDate}
          onChange={handleStartDateChange}
          placeholder="Дата от"
          disabled={disabled}
          max={endDate || undefined}
          size="md"
        />
        
        <DatePicker
          value={endDate}
          onChange={handleEndDateChange}
          placeholder="Дата до"
          disabled={disabled}
          min={startDate || undefined}
          size="md"
        />
      </div>
      
      {/* ✅ ИСПРАВЛЯЕМ: Безопасно отображаем ошибку */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {typeof error === 'string' ? error : 'Ошибка выбора периода'}
        </p>
      )}
    </div>
  );
};

// Интерфейс для MonthPicker
interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
  label?: string;
  error?: string | null | undefined;
  disabled?: boolean;
  className?: string;
}

// Выбор месяца и года
export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  label = 'Месяц',
  error,
  disabled = false,
  className = ''
}) => {
  const currentYear = new Date().getFullYear();
  const months = [
    { value: '01', label: 'Январь' },
    { value: '02', label: 'Февраль' },
    { value: '03', label: 'Март' },
    { value: '04', label: 'Апрель' },
    { value: '05', label: 'Май' },
    { value: '06', label: 'Июнь' },
    { value: '07', label: 'Июль' },
    { value: '08', label: 'Август' },
    { value: '09', label: 'Сентябрь' },
    { value: '10', label: 'Октябрь' },
    { value: '11', label: 'Ноябрь' },
    { value: '12', label: 'Декабрь' }
  ];

  const [selectedYear, setSelectedYear] = useState(
    value ? value.split('-')[0] : currentYear.toString()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    value ? value.split('-')[1] : ''
  );

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (selectedMonth) {
      onChange(`${year}-${selectedMonth}`);
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    onChange(`${selectedYear}-${month}`);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div className="grid grid-cols-2 gap-2">
        {/* Год */}
        <select
          value={selectedYear}
          onChange={(e) => handleYearChange(e.target.value)}
          disabled={disabled}
          className={`
            block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
            <option key={year} value={year.toString()}>
              {year}
            </option>
          ))}
        </select>

        {/* Месяц */}
        <select
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          disabled={disabled}
          className={`
            block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <option value="">Выберите месяц</option>
          {months.map(month => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* ✅ ИСПРАВЛЯЕМ: Безопасно отображаем ошибку */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {typeof error === 'string' ? error : 'Ошибка выбора месяца'}
        </p>
      )}
    </div>
  );
};