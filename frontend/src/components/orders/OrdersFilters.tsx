import { useState, useEffect, useCallback } from 'react';
import { OrderFilters } from '../../store/api/ordersApi';
import { FilterDatePicker } from '../form/DatePickerVariants';
import Button from '../ui/button/Button';
import Label from '../form/Label';
import Input from '../form/input/InputField';

interface OrdersFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
}

// ✅ ИСПРАВЛЯЕМ: Добавляем классы для темной темы
const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
  </svg>
);

// Хук для debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function OrdersFilters({ filters, onFiltersChange }: OrdersFiltersProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.customer_name || '');
  
  // Используем debounce для поиска
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);

  // Обновляем фильтры при изменении debounced значения
  useEffect(() => {
    if (debouncedSearchTerm !== filters.customer_name) {
      onFiltersChange({
        ...filters,
        customer_name: debouncedSearchTerm,
      });
    }
  }, [debouncedSearchTerm, filters, onFiltersChange]);

  const handleInputChange = useCallback((field: keyof OrderFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    setLocalSearchTerm('');
    onFiltersChange({
      date_from: '',
      date_to: '',
      status_id: '',
      customer_name: '',
    });
  }, [onFiltersChange]);

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <FilterIcon />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Фильтры заказов
        </h3>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Очистить все
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Поиск по клиенту */}
        <div>
          <Label>Поиск по клиенту</Label>
          <div className="relative">
            <Input
              type="text"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder="Имя или телефон клиента..."
              className="pl-9"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              <SearchIcon />
            </div>
            {localSearchTerm && (
              <button
                onClick={() => setLocalSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Дата от */}
        <div>
          <Label>Дата от</Label>
          <FilterDatePicker
            id="orders-filter-date-from"
            placeholder="Дата от"
            value={filters.date_from || ''}
            onChange={(_dates, dateStr) => handleInputChange('date_from', dateStr)}
          />
        </div>

        {/* Дата до */}
        <div>
          <Label>Дата до</Label>
          <FilterDatePicker
            id="orders-filter-date-to"
            placeholder="Дата до"
            value={filters.date_to || ''}
            onChange={(_dates, dateStr) => handleInputChange('date_to', dateStr)}
          />
        </div>
      </div>

      {/* Индикатор активных фильтров */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {filters.customer_name && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                Клиент: {filters.customer_name}
                <button onClick={() => setLocalSearchTerm('')}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {(filters.date_from || filters.date_to) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded-full">
                Период: {filters.date_from || '...'} - {filters.date_to || '...'}
                <button onClick={() => {
                  handleInputChange('date_from', '');
                  handleInputChange('date_to', '');
                }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}