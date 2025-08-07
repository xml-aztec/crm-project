import { useEffect } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Russian } from "flatpickr/dist/l10n/ru";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  minDate?: DateOption;
  maxDate?: DateOption;
  enableTime?: boolean;
  dateFormat?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder = "Выберите дату",
  disabled = false,
  required = false,
  error,
  minDate,
  maxDate,
  enableTime = false,
  dateFormat,
  className = "",
  size = 'md'
}: PropsType) {
  
  // Размеры компонента
  const sizeClasses = {
    sm: 'h-9 px-3 py-1.5 text-sm',
    md: 'h-11 px-4 py-2.5 text-sm', 
    lg: 'h-12 px-4 py-3 text-base'
  };

  // Определяем формат даты по умолчанию
  const getDefaultFormat = () => {
    if (dateFormat) return dateFormat;
    if (enableTime) return "d.m.Y H:i";
    if (mode === "range") return "d.m.Y";
    return "d.m.Y";
  };

  useEffect(() => {
    const flatPickr = flatpickr(`#${id}`, {
      mode: mode || "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: getDefaultFormat(),
      defaultDate,
      onChange,
      locale: Russian, // Русская локализация
      minDate,
      maxDate,
      enableTime,
      time_24hr: true, // 24-часовой формат
      allowInput: true, // Разрешить ввод с клавиатуры
      clickOpens: !disabled, // Не открывать если отключен
      altInput: true, // Альтернативный ввод для лучшего UX
      altFormat: enableTime ? "d.m.Y H:i" : "d.m.Y",
      weekNumbers: false, // Убираем номера недель
      disableMobile: false, // Поддержка мобильных устройств
      // Настройки для времени
      ...(enableTime && {
        enableSeconds: false,
        minuteIncrement: 1
      }),
      // Настройки для диапазона
      ...(mode === "range" && {
        conjunction: " — " // Разделитель для диапазона
      })
    });

    // Отключаем поле если нужно
    if (disabled) {
      const input = document.querySelector(`#${id}`) as HTMLInputElement;
      if (input) {
        input.disabled = true;
      }
    }

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
    };
  }, [mode, onChange, id, defaultDate, disabled, minDate, maxDate, enableTime, dateFormat]);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <Label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded-lg border appearance-none shadow-theme-xs placeholder:text-gray-400 
            focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300
            dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 
            dark:border-gray-700 dark:focus:border-brand-800
            bg-transparent text-gray-800 border-gray-300
            ${sizeClasses[size]}
            ${error ? 'border-red-300 dark:border-red-600' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}
            pr-11
          `}
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-5" />
        </span>
      </div>

      {/* Отображение ошибки */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
