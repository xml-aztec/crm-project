import { useGetSubcategoriesQuery, useGetCategoriesQuery, useDeleteSubcategoryMutation } from '../../store/api/catalogApi';
import { Subcategory } from '../../types/catalog';
import EntityTable from './EntityTable';

interface SubcategoriesTableProps {
  onEdit?: (subcategory: Subcategory) => void;
}

const SubcategoryIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

export default function SubcategoriesTable({ onEdit }: SubcategoriesTableProps) {
  const { data: subcategories = [], isLoading, error } = useGetSubcategoriesQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [deleteSubcategory, { isLoading: isDeleting }] = useDeleteSubcategoryMutation();

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || `Категория #${categoryId}`;
  };

  return (
    <EntityTable
      items={subcategories}
      isLoading={isLoading}
      error={error}
      isDeleting={isDeleting}
      icon={SubcategoryIcon}
      theme="purple"
      loadingText="Загрузка подкатегорий..."
      errorText="Не удалось загрузить список подкатегорий"
      emptyTitle="Подкатегории не найдены"
      emptyDescription="Создайте подкатегории для лучшей организации товаров в каталоге"
      nameColumnLabel="Подкатегория"
      deleteModalTitle="Удалить подкатегорию?"
      extraColumn={{
        label: 'Родительская категория',
        render: (subcategory) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            {getCategoryName(subcategory.category_id)}
          </span>
        ),
      }}
      onEdit={onEdit}
      onDelete={async (subcategory) => {
        await deleteSubcategory(subcategory.id).unwrap();
      }}
    />
  );
}
