import { useGetCategoriesQuery, useDeleteCategoryMutation } from '../../store/api/catalogApi';
import { Category } from '../../types/catalog';
import EntityTable from './EntityTable';

interface CategoriesTableProps {
  onEdit?: (category: Category) => void;
}

const CategoryIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
  </svg>
);

export default function CategoriesTable({ onEdit }: CategoriesTableProps) {
  const { data: categories = [], isLoading, error } = useGetCategoriesQuery();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  return (
    <EntityTable
      items={categories}
      isLoading={isLoading}
      error={error}
      isDeleting={isDeleting}
      icon={CategoryIcon}
      theme="blue"
      loadingText="Загрузка категорий..."
      errorText="Не удалось загрузить список категорий"
      emptyTitle="Категории не найдены"
      emptyDescription="Создайте первую категорию товаров для организации вашего каталога"
      nameColumnLabel="Категория"
      deleteModalTitle="Удалить категорию?"
      onEdit={onEdit}
      onDelete={async (category) => {
        await deleteCategory(category.id).unwrap();
      }}
    />
  );
}
