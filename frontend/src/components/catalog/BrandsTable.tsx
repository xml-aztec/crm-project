import { useGetBrandsQuery, useDeleteBrandMutation } from '../../store/api/catalogApi';
import { Brand } from '../../types/catalog';
import EntityTable from './EntityTable';

interface BrandsTableProps {
  onEdit?: (brand: Brand) => void;
}

const BrandIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

export default function BrandsTable({ onEdit }: BrandsTableProps) {
  const { data: brands = [], isLoading, error } = useGetBrandsQuery();
  const [deleteBrand, { isLoading: isDeleting }] = useDeleteBrandMutation();

  return (
    <EntityTable
      items={brands}
      isLoading={isLoading}
      error={error}
      isDeleting={isDeleting}
      icon={BrandIcon}
      theme="orange"
      loadingText="Загрузка брендов..."
      errorText="Не удалось загрузить список брендов"
      emptyTitle="Бренды не найдены"
      emptyDescription="Создайте бренды для лучшей организации товаров в каталоге"
      nameColumnLabel="Бренд"
      deleteModalTitle="Удалить бренд?"
      onEdit={onEdit}
      onDelete={async (brand) => {
        await deleteBrand(brand.id).unwrap();
      }}
    />
  );
}
