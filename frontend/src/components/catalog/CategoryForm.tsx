import { useState, useEffect } from 'react';
import { useCreateCategoryMutation, useUpdateCategoryMutation } from '../../store/api/catalogApi';
import { Category } from '../../types/catalog';
import EntityForm from './EntityForm';

interface CategoryFormProps {
  category?: Category;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CategoryForm({ category, isOpen, onClose, onSuccess }: CategoryFormProps) {
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();

  const isLoading = isCreating || isUpdating;
  const isEditMode = !!category;

  const [name, setName] = useState('');

  useEffect(() => {
    setName(category?.name ?? '');
  }, [category]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      const data = { name: name.trim() };

      if (isEditMode && category) {
        await updateCategory({ id: category.id, data }).unwrap();
      } else {
        await createCategory(data).unwrap();
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
      title={isEditMode ? 'Редактировать категорию' : 'Новая категория'}
      submitLabel={isEditMode ? 'Сохранить изменения' : 'Создать категорию'}
      submitLoadingLabel={isEditMode ? 'Сохранение...' : 'Создание...'}
      fields={[
        { key: 'name', label: 'Название категории *', placeholder: 'Введите название категории', type: 'text' },
      ]}
      values={{ name }}
      onChange={(_, value) => setName(value)}
    />
  );
}
