import React, { useState } from 'react';
import {
  useGetCashflowTypesQuery,
  useCreateCashflowTypeMutation,
  useUpdateCashflowTypeMutation,
  useDeleteCashflowTypeMutation,
  useGetCashflowCategoriesQuery,
  useCreateCashflowCategoryMutation,
  useUpdateCashflowCategoryMutation,
  useDeleteCashflowCategoryMutation,
  CashflowType,
  CashflowCategory
} from '../../store/api/cashflowApi';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import { useNavigate } from 'react-router';

type TabType = 'types' | 'categories';

const CashflowMetaManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('types');
  
  // Состояние для типов
  const [typeFormData, setTypeFormData] = useState({ 
    name: '',
    category_id: 0 // Добавить поле для категории
  });
  const [editingType, setEditingType] = useState<CashflowType | null>(null);
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState<CashflowType | null>(null);

  // Состояние для категорий
  const [categoryFormData, setCategoryFormData] = useState({ 
    name: '',
    type: 'income' as 'income' | 'expense' // Добавить обязательное поле type
  });
  const [editingCategory, setEditingCategory] = useState<CashflowCategory | null>(null);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<CashflowCategory | null>(null);

  // API хуки для типов
  const { data: types = [], isLoading: typesLoading } = useGetCashflowTypesQuery();
  const [createType, { isLoading: isCreatingType }] = useCreateCashflowTypeMutation();
  const [updateType, { isLoading: isUpdatingType }] = useUpdateCashflowTypeMutation();
  const [deleteType, { isLoading: isDeletingType }] = useDeleteCashflowTypeMutation();

  // API хуки для категорий
  const { data: categories = [], isLoading: categoriesLoading } = useGetCashflowCategoriesQuery();
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateCashflowCategoryMutation();
  const [updateCategory, { isLoading: isUpdatingCategory }] = useUpdateCashflowCategoryMutation();
  const [deleteCategory, { isLoading: isDeletingCategory }] = useDeleteCashflowCategoryMutation();

  const isSubmittingType = isCreatingType || isUpdatingType;
  const isSubmittingCategory = isCreatingCategory || isUpdatingCategory;

  // Обработчики для типов
  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeFormData.name.trim() || (!editingType && typeFormData.category_id === 0)) return;

    try {
      if (editingType) {
        await updateType({ 
          id: editingType.id, 
          data: { name: typeFormData.name.trim() } 
        }).unwrap();
      } else {
        await createType({ 
          name: typeFormData.name.trim(),
          category_id: typeFormData.category_id
        }).unwrap();
      }
      
      setTypeFormData({ name: '', category_id: 0 });
      setEditingType(null);
    } catch (error) {
      // Обработка ошибки без алерта
    }
  };

  const handleEditType = (type: CashflowType) => {
    setEditingType(type);
    setTypeFormData({ 
      name: type.name,
      category_id: type.category_id ?? 0
    });
  };

  const handleCancelEditType = () => {
    setEditingType(null);
    setTypeFormData({ name: '', category_id: 0 });
  };

  const handleDeleteType = async () => {
    if (!deleteTypeConfirm) return;
    
    try {
      await deleteType(deleteTypeConfirm.id).unwrap();
      setDeleteTypeConfirm(null);
    } catch (error) {
      // Обработка ошибки без алерта
    }
  };

  // Обработчики для категорий
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) return;

    try {
      if (editingCategory) {
        await updateCategory({ 
          id: editingCategory.id, 
          data: { 
            name: categoryFormData.name.trim(),
            type: categoryFormData.type
          } 
        }).unwrap();
      } else {
        await createCategory({ 
          name: categoryFormData.name.trim(),
          type: categoryFormData.type
        }).unwrap();
      }
      
      setCategoryFormData({ name: '', type: 'income' });
      setEditingCategory(null);
    } catch (error) {
      // Обработка ошибки без алерта
    }
  };

  const handleEditCategory = (category: CashflowCategory) => {
    setEditingCategory(category);
    setCategoryFormData({ 
      name: category.name,
      type: category.type ?? 'income'
    });
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', type: 'income' });
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryConfirm) return;
    
    try {
      await deleteCategory(deleteCategoryConfirm.id).unwrap();
      setDeleteCategoryConfirm(null);
    } catch (error) {
      // Обработка ошибки без алерта
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Настройка денежных потоков
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Управление типами и категориями финансовых операций
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/finance')}
        >
          ← Назад к финансам
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Типов потоков</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {types.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Категорий потоков</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {categories.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Всего настроено</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {types.length + categories.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('types')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'types'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Типы денежных потоков ({types.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'categories'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Категории потоков ({categories.length})
            </div>
          </button>
        </div>

        {/* Содержимое табов */}
        <div className="p-6">
          {activeTab === 'types' ? (
            <div className="space-y-6">
              {/* Описание типов */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">О типах денежных потоков</h4>
                    <p>Основные категории финансовых операций: доходы, расходы, инвестиции и т.д. Используются для верхнеуровневой классификации финансовых операций в системе.</p>
                  </div>
                </div>
              </div>

              {/* Форма для типов */}
              <form onSubmit={handleTypeSubmit} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {editingType ? '✏️ Редактировать тип' : '➕ Добавить новый тип'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Название типа</Label>
                    <Input
                      type="text"
                      value={typeFormData.name}
                      onChange={(e) => setTypeFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Введите название типа (например: Продажи, Закупки)"
                      disabled={isSubmittingType}
                      className="w-full"
                    />
                  </div>
                  
                  {!editingType && (
                    <div>
                      <Label>Категория</Label>
                      <select
                        value={typeFormData.category_id}
                        onChange={(e) => setTypeFormData(prev => ({ ...prev, category_id: parseInt(e.target.value) }))}
                        disabled={isSubmittingType || categoriesLoading}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      >
                        <option value={0}>Выберите категорию</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name} ({category.type === 'income' ? 'Доходы' : 'Расходы'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="flex gap-2 items-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        !typeFormData.name.trim() || 
                        isSubmittingType ||
                        (!editingType && typeFormData.category_id === 0)
                      }
                      className="w-full sm:w-auto"
                    >
                      {isSubmittingType ? (
                        <div className="flex items-center">
                          <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                          {editingType ? 'Обновление...' : 'Создание...'}
                        </div>
                      ) : (
                        editingType ? 'Обновить' : 'Создать'
                      )}
                    </Button>
                    {editingType && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditType}
                        disabled={isSubmittingType}
                        className="w-full sm:w-auto"
                      >
                        Отмена
                      </Button>
                    )}
                  </div>
                </div>
              </form>

              {/* Список типов */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  📋 Список типов денежных потоков
                </h3>
                
                {typesLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : types.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Пока нет типов</h4>
                    <p className="text-gray-600 dark:text-gray-400">Создайте первый тип для начала работы с финансовыми операциями</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {types.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-center flex-1">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-gray-900 dark:text-white font-medium text-sm block">
                              {type.name}
                            </span>
                            {type.category && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {type.category.name} ({type.category.type === 'income' ? 'Доходы' : 'Расходы'})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleEditType(type)}
                            className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            disabled={isSubmittingType}
                            title="Редактировать"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTypeConfirm(type)}
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            disabled={isSubmittingType}
                            title="Удалить"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Описание категорий */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">О категориях денежных потоков</h4>
                    <p>Основные группы финансовых операций: доходы и расходы. Каждая категория может содержать множество типов денежных потоков.</p>
                  </div>
                </div>
              </div>

              {/* Форма для категорий */}
              <form onSubmit={handleCategorySubmit} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {editingCategory ? '✏️ Редактировать категорию' : '➕ Добавить новую категорию'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Название категории</Label>
                    <Input
                      type="text"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Введите название категории (например: Операционные доходы)"
                      disabled={isSubmittingCategory}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label>Тип категории</Label>
                    <select
                      value={categoryFormData.type}
                      onChange={(e) => setCategoryFormData(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))}
                      disabled={isSubmittingCategory}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    >
                      <option value="income">Доходы</option>
                      <option value="expense">Расходы</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2 items-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!categoryFormData.name.trim() || isSubmittingCategory}
                      className="w-full sm:w-auto"
                    >
                      {isSubmittingCategory ? (
                        <div className="flex items-center">
                          <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                          {editingCategory ? 'Обновление...' : 'Создание...'}
                        </div>
                      ) : (
                        editingCategory ? 'Обновить' : 'Создать'
                      )}
                    </Button>
                    {editingCategory && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditCategory}
                        disabled={isSubmittingCategory}
                        className="w-full sm:w-auto"
                      >
                        Отмена
                      </Button>
                    )}
                  </div>
                </div>
              </form>

              {/* Список категорий */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  📁 Список категорий денежных потоков
                </h3>
                
                {categoriesLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Пока нет категорий</h4>
                    <p className="text-gray-600 dark:text-gray-400">Создайте первую категорию для детального учета финансов</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-center flex-1">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-gray-900 dark:text-white font-medium text-sm block">
                              {category.name}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              category.type === 'income' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {category.type === 'income' ? 'Доходы' : 'Расходы'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            disabled={isSubmittingCategory}
                            title="Редактировать"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteCategoryConfirm(category)}
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            disabled={isSubmittingCategory}
                            title="Удалить"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна удаления */}
      <DeleteConfirmModal
        isOpen={!!deleteTypeConfirm}
        onClose={() => setDeleteTypeConfirm(null)}
        onConfirm={handleDeleteType}
        title="Удалить тип денежного потока"
        itemName={deleteTypeConfirm?.name || ''}
        confirmText="Удалить"
        isLoading={isDeletingType}
      />

      <DeleteConfirmModal
        isOpen={!!deleteCategoryConfirm}
        onClose={() => setDeleteCategoryConfirm(null)}
        onConfirm={handleDeleteCategory}
        title="Удалить категорию денежного потока"
        itemName={deleteCategoryConfirm?.name || ''}
        confirmText="Удалить"
        isLoading={isDeletingCategory}
      />
    </div>
  );
};

export default CashflowMetaManagement;