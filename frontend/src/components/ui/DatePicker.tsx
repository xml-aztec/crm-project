import React, { forwardRef } from 'react';

interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  label?: string;
  error?: string | null | undefined; // ✅ Типизируем как string
  disabled?: boolean;
  required?: boolean;
  className?: string;
  min?: string;
  max?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled';
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(({
  id,
  name,
  value = '',
  onChange,
  onBlur,
  placeholder = 'Выберите дату',
  label,
  error,
  disabled = false,
  required = false,
  className = '',
  min,
  max,
  showIcon = true,
  size = 'md',
  variant = 'default',
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const variantClasses = {
    default: 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
    filled: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          type="date"
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          className={`
            block w-full rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${error ? 'border-red-300 dark:border-red-600' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${showIcon ? 'pl-10' : ''}
            text-gray-900 dark:text-white
          `}
          {...props}
        />
        
        {showIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* ✅ ИСПРАВЛЯЕМ: Безопасно отображаем ошибку */}
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {typeof error === 'string' ? error : 'Ошибка валидации'}
        </p>
      )}
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;