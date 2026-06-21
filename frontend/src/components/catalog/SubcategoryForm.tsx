import { useState, useEffect } from 'react';
import { useCreateSubcategoryMutation, useUpdateSubcategoryMutation, useGetCategoriesQuery } from '../../store/api/catalogApi';
import { Subcategory } from '../../types/catalog';
import EntityForm from './EntityForm';

interface SubcategoryFormProps {
  subcategory?: Subcategory;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubcategoryForm({ subcategory, isOpen, onClose, onSuccess }: SubcategoryFormProps) {
  const { data: categories = [] } = useGetCategoriesQuery();
  const [createSubcategory, { isLoading: isCreating }] = useCreateSubcategoryMutation();
  const [updateSubcategory, { isLoading: isUpdating }] = useUpdateSubcategoryMutation();

  const isLoading = isCreating || isUpdating;
  const isEditMode = !!subcategory;

  const [values, setValues] = useState({ name: '', category_id: '' });

  useEffect(() => {
    setValues({
      name: subcategory?.name ?? '',
      category_id: subcategory ? subcategory.category_id.toString() : '',
    });
  }, [subcategory]);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!values.name.trim() || !values.category_id) return;

    try {
      const data = {
        name: values.name.trim(),
        category_id: parseInt(values.category_id),
      };

      if (isEditMode && subcategory) {
        await updateSubcategory({ id: subcategory.id, data }).unwrap();
      } else {
        await createSubcategory(data).unwrap();
      }

      onSuccess();
    } catch (error) {
      // Обработка ошибки без алерта
    }
  };

  return (
    <EntityForm
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      isValid={!!values.name.trim() && !!values.category_id}
      title={isEditMode ? 'Редактировать подкатегорию' : 'Новая подкатегория'}
      submitLabel={isEditMode ? 'Сохранить изменения' : 'Создать подкатегорию'}
      submitLoadingLabel={isEditMode ? 'Сохранение...' : 'Создание...'}
      fields={[
        { key: 'name', label: 'Название подкатегории *', placeholder: 'Введите название подкатегории', type: 'text' },
        {
          key: 'category_id',
          label: 'Категория *',
          placeholder: 'Выберите категорию',
          type: 'select',
          options: categories.map((category) => ({ value: category.id.toString(), label: category.name })),
        },
      ]}
      values={values}
      onChange={handleChange}
    />
  );
}
