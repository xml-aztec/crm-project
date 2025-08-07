import { useGetCategoriesQuery, useGetSubcategoriesQuery, useGetBrandsQuery } from '../../store/api/catalogApi';
import { ProductFilters } from '../../types/catalog';
import Button from '../ui/button/Button';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import Select from '../form/Select';

interface ProductsFiltersProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
}

const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
  </svg>
);

export default function ProductsFilters({ filters, onFiltersChange }: ProductsFiltersProps) {
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: subcategories = [] } = useGetSubcategoriesQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  
  // ✅ ИСПРАВЛЯЕМ: Перемещаем функцию ПЕРЕД использованием
  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '';
  };
  
  // ✅ Создаем опции для Select компонентов
  const categoryOptions = categories.map(category => ({
    value: category.id.toString(),
    label: category.name
  }));

  const subcategoryOptions = subcategories
    .filter(sub => !filters.category_id || sub.category_id.toString() === filters.category_id)
    .map(sub => ({
      value: sub.id.toString(),
      label: `${sub.name} (${getCategoryName(sub.category_id)})`
    }));

  const brandOptions = brands.map(brand => ({
    value: brand.id.toString(),
    label: brand.name
  }));

  const stockOptions = [
    { value: 'in_stock', label: 'В наличии' },
    { value: 'out_of_stock', label: 'Нет в наличии' }
  ];

  const handleInputChange = (field: keyof ProductFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      brand_id: '',
      subcategory_id: '',
      category_id: '',
      in_stock: '',
      price_min: '', 
      price_max: '', 
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <FilterIcon />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Фильтры
        </h3>
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Очистить
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* ✅ Поиск */}
        <div className="lg:col-span-2">
          <Label>Поиск</Label>
          <div className="relative">
            <Input
              type="text"
              value={filters.search}
              onChange={(e) => handleInputChange('search', e.target.value)}
              placeholder="Поиск по названию или описанию..."
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
          </div>
        </div>

        {/* ✅ Категория */}
        <div>
          <Label>Категория</Label>
          <Select
            options={categoryOptions}
            onChange={(value) => handleInputChange('category_id', value)}
            placeholder="Все категории"
          />
        </div>

        {/* ✅ Подкатегория */}
        <div>
          <Label>Подкатегория</Label>
          <Select
            options={subcategoryOptions}
            onChange={(value) => handleInputChange('subcategory_id', value)}
            placeholder="Все подкатегории"
          />
        </div>

        {/* ✅ Бренд */}
        <div>
          <Label>Бренд</Label>
          <Select
            options={brandOptions}
            onChange={(value) => handleInputChange('brand_id', value)}
            placeholder="Все бренды"
          />
        </div>

        {/* ✅ Наличие */}
        <div>
          <Label>Наличие</Label>
          <Select
            options={stockOptions}
            onChange={(value) => handleInputChange('in_stock', value)}
            placeholder="Все товары"
          />
        </div>
      </div>

      {/* ✅ Цена */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Цена от (сом)</Label>
          <Input
            type="number"
            value={filters.price_min}
            onChange={(e) => handleInputChange('price_min', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label>Цена до (сом)</Label>
          <Input
            type="number"
            value={filters.price_max}
            onChange={(e) => handleInputChange('price_max', e.target.value)}
            placeholder="1000000"
          />
        </div>
      </div>
    </div>
  );
}