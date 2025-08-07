import { useState } from 'react';
import { Category, Subcategory, Brand } from '../../types/catalog';
import CategoriesTable from '../../components/catalog/CategoriesTable';
import SubcategoriesTable from '../../components/catalog/SubcategoriesTable';
import BrandsTable from '../../components/catalog/BrandsTable';
import CategoryForm from '../../components/catalog/CategoryForm';
import SubcategoryForm from '../../components/catalog/SubcategoryForm';
import BrandForm from '../../components/catalog/BrandForm';
import Button from '../../components/ui/button/Button';

type TabType = 'categories' | 'subcategories' | 'brands';
type FormType = 'category' | 'subcategory' | 'brand' | null;

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const CategoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const SubcategoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const BrandIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const tabs = [
  {
    id: 'categories' as TabType,
    name: 'Категории',
    icon: CategoryIcon,
    description: 'Основные категории товаров'
  },
  {
    id: 'subcategories' as TabType,
    name: 'Подкатегории',
    icon: SubcategoryIcon,
    description: 'Подкатегории внутри основных категорий'
  },
  {
    id: 'brands' as TabType,
    name: 'Бренды',
    icon: BrandIcon,
    description: 'Производители и торговые марки'
  }
];

export default function Categories() {
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<FormType>(null);
  
  // Состояния для редактирования
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | undefined>();
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>();

  const handleAddItem = () => {
    // Сбрасываем все состояния редактирования
    setEditingCategory(undefined);
    setEditingSubcategory(undefined);
    setEditingBrand(undefined);
    
    // Устанавливаем тип формы в зависимости от активной вкладки
    switch (activeTab) {
      case 'categories':
        setFormType('category');
        break;
      case 'subcategories':
        setFormType('subcategory');
        break;
      case 'brands':
        setFormType('brand');
        break;
    }
    
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditingSubcategory(undefined);
    setEditingBrand(undefined);
    setFormType('category');
    setIsFormOpen(true);
  };

  const handleEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setEditingCategory(undefined);
    setEditingBrand(undefined);
    setFormType('subcategory');
    setIsFormOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setEditingCategory(undefined);
    setEditingSubcategory(undefined);
    setFormType('brand');
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setFormType(null);
    setEditingCategory(undefined);
    setEditingSubcategory(undefined);
    setEditingBrand(undefined);
  };

  const handleFormSuccess = () => {
    // RTK Query автоматически обновит данные благодаря invalidatesTags
    handleFormClose();
  };

  const getAddButtonText = () => {
    switch (activeTab) {
      case 'categories': return 'Добавить категорию';
      case 'subcategories': return 'Добавить подкатегорию';
      case 'brands': return 'Добавить бренд';
      default: return 'Добавить';
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'categories':
        return <CategoriesTable onEdit={handleEditCategory} />;
      case 'subcategories':
        return <SubcategoriesTable onEdit={handleEditSubcategory} />;
      case 'brands':
        return <BrandsTable onEdit={handleEditBrand} />;
      default:
        return null;
    }
  };

  const renderForm = () => {
    switch (formType) {
      case 'category':
        return (
          <CategoryForm
            category={editingCategory}
            isOpen={isFormOpen}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        );
      case 'subcategory':
        return (
          <SubcategoryForm
            subcategory={editingSubcategory}
            isOpen={isFormOpen}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        );
      case 'brand':
        return (
          <BrandForm
            brand={editingBrand}
            isOpen={isFormOpen}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Управление категориями
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Создавайте и управляйте категориями, подкатегориями и брендами
          </p>
        </div>
        
        <Button 
          onClick={handleAddItem}
          className="inline-flex items-center gap-2 px-4 py-2"
        >
          <PlusIcon />
          {getAddButtonText()}
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Tab Headers */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon />
                  <div className="text-left">
                    <div className="font-medium">{tab.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderActiveTab()}
        </div>
      </div>

      {/* Form Modals */}
      {renderForm()}
    </div>
  );
}