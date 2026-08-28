import { useEffect, useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import Input from '../form/input/InputField';

interface CatalogSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CatalogSearchInput({
  value,
  onChange,
  placeholder = 'Поиск по названию...',
  className = '',
}: CatalogSearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounced = useDebounce(localValue, 400);

  // Keep in sync when the value changes externally (URL back/forward, reset button).
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (debounced !== value) {
      onChange(debounced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={`relative ${className}`}>
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}
