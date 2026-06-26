import { useState } from 'react';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Alert from '../../components/ui/alert/Alert';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal';
import CustomerTypeForm from '../../components/customers/CustomerTypeForm';
import {
  useGetCustomerTypesQuery,
  useDeleteCustomerTypeMutation,
  CustomerType,
} from '../../store/api/customerTypesApi';

interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Иконки как в SubcategoriesTable
const CustomerTypeIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 3a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function CustomerTypes() {
  const { data: customerTypes = [], isLoading, error } = useGetCustomerTypesQuery();
  const [deleteCustomerType, { isLoading: isDeleting }] = useDeleteCustomerTypeMutation();

  // Состояния модального окна
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomerType, setEditingCustomerType] = useState<CustomerType | null>(null);

  // Состояния для удаления (как в SubcategoriesTable)
  const [customerTypeToDelete, setCustomerTypeToDelete] = useState<CustomerType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Поиск
  const [searchTerm, setSearchTerm] = useState('');

  // Состояние для алертов
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Функции для показа алертов
  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({
      show: true,
      type,
      title,
      message
    });
    
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const showSuccess = (message: string) => {
    showAlert('success', 'Успешно', message);
  };

  const showError = (message: string) => {
    showAlert('error', 'Ошибка', message);
  };

  // Фильтрация по поиску
  const filteredCustomerTypes = customerTypes.filter((type) =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Обработчики
  const openCreateForm = () => {
    setEditingCustomerType(null);
    setIsFormOpen(true);
  };

  const openEditForm = (customerType: CustomerType) => {
    setEditingCustomerType(customerType);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCustomerType(null);
  };

  const handleFormSuccess = () => {
    closeForm();
    showSuccess(editingCustomerType ? 'Тип клиента успешно обновлен' : 'Тип клиента успешно создан');
  };

  // Обработчики удаления (как в SubcategoriesTable)
  const handleDeleteClick = (customerType: CustomerType) => {
    setCustomerTypeToDelete(customerType);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setCustomerTypeToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (customerTypeToDelete && !isDeleting) {
      try {
        await deleteCustomerType(customerTypeToDelete.id).unwrap();
        setCustomerTypeToDelete(null);
        setIsDeleteModalOpen(false);
        showSuccess('Тип клиента успешно удален');
      } catch (error: any) {
        console.error('Delete customer type error:', error);
        if (error?.data?.detail) {
          showError(error.data.detail);
        } else {
          showError('Ошибка при удалении типа клиента');
        }
      }
    }
  };

  // Loading state (как в SubcategoriesTable)
  if (isLoading) {
    return (
      <>
        <PageBreadcrumb pageTitle="Типы клиентов" />
        <LoadingSpinner text="Загрузка типов клиентов..." />
      </>
    );
  }

  // Error state (как в SubcategoriesTable)
  if (error) {
    return (
      <>
        <PageBreadcrumb pageTitle="Типы клиентов" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Ошибка загрузки
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Не удалось загрузить список типов клиентов
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Типы клиентов | LeadFlow"
        description="Управление типами клиентов интернет-магазина"
      />
      <PageBreadcrumb pageTitle="Типы клиентов" />
      
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {/* Alert */}
        {alert.show && (
          <div 
            className="fixed top-20 left-1/2 transform -translate-x-1/2 max-w-md w-full mx-4 animate-fade-in-down"
            style={{ zIndex: 9999999 }}
          >
            <Alert
              variant={alert.type}
              title={alert.title}
              message={alert.message}
              showLink={false}
              onClose={() => setAlert(prev => ({ ...prev, show: false }))
              }
            />
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Типы клиентов
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Управляйте типами клиентов вашего магазина
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Найдено: <span className="font-medium text-gray-900 dark:text-white">{filteredCustomerTypes.length}</span> из {customerTypes.length}
            </div>
            <Button onClick={openCreateForm}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить тип
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              placeholder="Поиск типов клиентов..."
            />
          </div>
        </div>

        {/* Empty State (как в SubcategoriesTable) */}
        {!filteredCustomerTypes.length && !isLoading && (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
              <CustomerTypeIcon />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'Типы клиентов не найдены' : 'Типы клиентов не найдены'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
              {searchTerm ? 'Попробуйте изменить параметры поиска' : 'Создайте типы клиентов для лучшей организации клиентской базы'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Button onClick={openCreateForm}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Создать тип клиента
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Table (точная копия стиля из SubcategoriesTable) */}
        {filteredCustomerTypes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Тип клиента
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCustomerTypes.map((customerType, index) => (
                    <tr 
                      key={customerType.id} 
                      className={`transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            #{customerType.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-sm">
                              <CustomerTypeIcon />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {customerType.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditForm(customerType)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                          >
                            <EditIcon />
                            <span className="hidden sm:inline">Изменить</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(customerType)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500"
                          >
                            <TrashIcon />
                            <span className="hidden sm:inline">Удалить</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Customer Type Form Modal */}
      <CustomerTypeForm
        customerType={editingCustomerType}
        isOpen={isFormOpen}
        onClose={closeForm}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal (как в SubcategoriesTable) */}
      <DeleteConfirmModal
        title="Удалить тип клиента?"
        itemName={customerTypeToDelete?.name || ''}
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
}