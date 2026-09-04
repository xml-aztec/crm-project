import { useState, useEffect } from 'react';
import { useCreateBrandMutation, useUpdateBrandMutation } from '../../store/api/catalogApi';
import { Brand } from '../../types/catalog';
import EntityForm from './EntityForm';

interface BrandFormProps {
  brand?: Brand;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BrandForm({ brand, isOpen, onClose, onSuccess }: BrandFormProps) {
  const [createBrand, { isLoading: isCreating }] = useCreateBrandMutation();
  const [updateBrand, { isLoading: isUpdating }] = useUpdateBrandMutation();

  const isLoading = isCreating || isUpdating;
  const isEditMode = !!brand;

  const [name, setName] = useState('');

  useEffect(() => {
    setName(brand?.name ?? '');
  }, [brand]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      const data = { name: name.trim() };

      if (isEditMode && brand) {
        await updateBrand({ id: brand.id, data }).unwrap();
      } else {
        await createBrand(data).unwrap();
      }

      onSuccess();
    } catch {
      // Обработка ошибки без логирования
    }
  };

  return (
    <EntityForm
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      isValid={!!name.trim()}
      title={isEditMode ? 'Редактировать бренд' : 'Новый бренд'}
      submitLabel={isEditMode ? 'Сохранить изменения' : 'Создать бренд'}
      submitLoadingLabel={isEditMode ? 'Сохранение...' : 'Создание...'}
      fields={[
        { key: 'name', label: 'Название бренда *', placeholder: 'Введите название бренда', type: 'text' },
      ]}
      values={{ name }}
      onChange={(_, value) => setName(value)}
    />
  );
}
