import { useState } from 'react';
import Input from '../form/input/InputField';
import Button from '../ui/button/Button';
import { CategoryFilters } from '../../types/catalog';

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
  </svg>
);

interface CategoriesFiltersProps {
  filters: CategoryFilters;
  onFiltersChange: (filters: CategoryFilters) => void;
}

export default function CategoriesFilters({ filters, onFiltersChange }: CategoriesFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (field: keyof CategoryFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const handleReset = () => {
    onFiltersChange({
      search: '',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Фильтры поиска категорий
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <FilterIcon />
            {isExpanded ? 'Скрыть' : 'Показать'} фильтры
          </div>
        </Button>
      </div>

      {/* Поиск - всегда видимый */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </div>
          <div className="pl-10">
            <Input
              type="text"
              placeholder="Поиск по названию категории..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Кнопка сброса фильтров */}
      {isExpanded && filters.search && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="outline" onClick={handleReset}>
            Сбросить фильтры
          </Button>
        </div>
      )}
    </div>
  );
}