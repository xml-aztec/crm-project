import React from 'react';
import DatePicker from './date-picker';

// Простой DatePicker для форм
export const FormDatePicker: React.FC<{
  id: string;
  label: string;
  value?: string;
  onChange?: (dates: Date[], dateStr: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}> = ({ id, label, onChange, error, required, placeholder, disabled, className, value }) => {
  return (
    <DatePicker
      id={id}
      label={label}
      defaultDate={value}
      onChange={onChange}
      error={error}
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      size="md"
    />
  );
};

// DatePicker с временем
export const DateTimePicker: React.FC<{
  id: string;
  label: string;
  value?: string;
  onChange?: (dates: Date[], dateStr: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}> = ({ id, label, onChange, error, required, placeholder, disabled, value }) => {
  return (
    <DatePicker
      id={id}
      label={label}
      defaultDate={value}
      onChange={onChange}
      error={error}
      required={required}
      placeholder={placeholder || "Выберите дату и время"}
      disabled={disabled}
      enableTime={true}
      size="md"
    />
  );
};

// DatePicker для диапазона дат
export const DateRangePicker: React.FC<{
  id: string;
  label: string;
  onChange?: (dates: Date[], dateStr: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}> = ({ id, label, onChange, error, required, placeholder, disabled }) => {
  return (
    <DatePicker
      id={id}
      label={label}
      mode="range"
      onChange={onChange}
      error={error}
      required={required}
      placeholder={placeholder || "Выберите период"}
      disabled={disabled}
      size="md"
    />
  );
};

// ✅ ИСПРАВЛЯЕМ: FilterDatePicker - убираем дублирование календарей
export const FilterDatePicker: React.FC<{
  id: string;
  onChange?: (dates: Date[], dateStr: string) => void;
  placeholder?: string;
  value?: string;
}> = ({ id, onChange, placeholder = "Дата", value }) => {
  return (
    <DatePicker
      id={id}
      defaultDate={value || undefined}
      onChange={onChange}
      placeholder={placeholder}
      size="md"
      className=""
      // Реальное значение в ISO-формате (для бэкенда), отображение — d.m.Y (через altFormat в DatePicker).
      dateFormat="Y-m-d"
      mode="single"
    />
  );
};

// DatePicker только для будущих дат
export const FutureDatePicker: React.FC<{
  id: string;
  label: string;
  onChange?: (dates: Date[], dateStr: string) => void;
  error?: string;
  required?: boolean;
  value?: string;
}> = ({ id, label, onChange, error, required, value }) => {
  const today = new Date();
  
  return (
    <DatePicker
      id={id}
      label={label}
      defaultDate={value}
      onChange={onChange}
      error={error}
      required={required}
      minDate={today}
      placeholder="Выберите дату в будущем"
      size="md"
    />
  );
};

// DatePicker только для прошлых дат
export const PastDatePicker: React.FC<{
  id: string;
  label: string;
  onChange?: (dates: Date[], dateStr: string) => void;
  error?: string;
  required?: boolean;
  value?: string;
}> = ({ id, label, onChange, error, required, value }) => {
  const today = new Date();
  
  return (
    <DatePicker
      id={id}
      label={label}
      defaultDate={value}
      onChange={onChange}
      error={error}
      required={required}
      maxDate={today}
      placeholder="Выберите дату в прошлом"
      size="md"
    />
  );
};