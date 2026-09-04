import { useState } from 'react';
import type { CreateCustomerRequest, UpdateCustomerRequest } from '../../store/api/customersApi';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import Pagination from '../../components/common/Pagination';
import CatalogSearchInput from '../../components/catalog/CatalogSearchInput';
import Button from '../../components/ui/button/Button';
import Alert from '../../components/ui/alert/Alert';
import CustomerModal from '../../components/customers/CustomerModal';
import TaskModal from '../../components/tasks/TaskModal';
import {
  useGetCustomersPaginatedQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useExportCustomersExcelMutation,
  Customer,
} from '../../store/api/customersApi';
import { useGetCustomerTypesQuery } from '../../store/api/customerTypesApi';
import { useTableUrlState } from '../../hooks/useTableUrlState';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

const PAGE_SIZE = 20;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Customers() {
  const { page, search, sortBy, sortOrder, filters, setPage, setSearch, setSort, setFilter, reset } = useTableUrlState({
    prefix: 'customer',
    defaultSortBy: 'name',
    defaultFilters: { customer_type_id: '' },
  });

  const { data, isLoading, isFetching, error } = useGetCustomersPaginatedQuery({
    search: search || undefined,
    customer_type_id: filters.customer_type_id ? Number(filters.customer_type_id) : undefined,
    sort_by: sortBy as 'name' | 'email' | 'created_at',
    sort_order: sortOrder,
    page,
    page_size: PAGE_SIZE,
  });
  const { data: customerTypes = [], isLoading: isLoadingTypes, error: typesError } = useGetCustomerTypesQuery();
  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();
  const [exportExcel] = useExportCustomersExcelMutation();
  const [exporting, setExporting] = useState<'filtered' | 'all' | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const customers = data?.items ?? [];

  const handleExport = async (mode: 'filtered' | 'all') => {
    setExporting(mode);
    try {
      const params = mode === 'filtered'
        ? {
            search: search || undefined,
            customer_type_id: filters.customer_type_id ? Number(filters.customer_type_id) : undefined,
          }
        : undefined;
      const result = await exportExcel(params).unwrap();
      downloadBlob(result, 'customers_export.xlsx');
    } catch {
      // Обработка ошибки без алерта
    } finally {
      setExporting(null);
    }
  };

  // Состояния модального окна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Состояние для алертов
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const showSuccess = (message: string) => showAlert('success', 'Успешно', message);
  const showError = (message: string) => showAlert('error', 'Ошибка', message);

  const hasActiveFilters = !!search || !!filters.customer_type_id || sortBy !== 'name';

  const handleCreateCustomer = async (data: CreateCustomerRequest) => {
    try {
      await createCustomer(data).unwrap();
      showSuccess('Клиент успешно создан');
      setIsModalOpen(false);
    } catch (error) {
      showError('Ошибка при создании клиента');
      console.error('Create customer error:', error);
    }
  };

  const handleUpdateCustomer = async (data: CreateCustomerRequest | UpdateCustomerRequest) => {
    if (!editingCustomer) return;

    try {
      await updateCustomer({ id: editingCustomer.id, data }).unwrap();
      showSuccess('Клиент успешно обновлен');
      setIsModalOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      showError('Ошибка при обновлении клиента');
      console.error('Update customer error:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomer(id).unwrap();
      showSuccess('Клиент успешно удален');
      setDeleteConfirm(null);
    } catch (error) {
      showError('Ошибка при удалении клиента');
      console.error('Delete customer error:', error);
    }
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const getCustomerTypeName = (typeId?: number) => {
    const type = customerTypes.find(t => t.id === typeId);
    return type?.name || 'Не указан';
  };

  if (error) {
    return (
      <>
        <PageBreadcrumb pageTitle="Все клиенты" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            Ошибка при загрузке клиентов: {error && typeof error === 'object' && 'data' in error
              ? JSON.stringify(error.data)
              : 'Неизвестная ошибка'}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Все клиенты | LeadFlow"
        description="Управление клиентами интернет-магазина"
      />
      <PageBreadcrumb pageTitle="Все клиенты" />

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
              onClose={() => setAlert(prev => ({ ...prev, show: false }))}
            />
          </div>
        )}

        {/* Header with title and stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Управление клиентами
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Управляйте клиентами магазина и их данными
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Найдено: <span className="font-medium text-gray-900 dark:text-white">{data?.total ?? 0}</span>
            </div>
            {(isLoading || isLoadingTypes || isFetching) && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-brand-500"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Загрузка...</span>
              </div>
            )}
            {/* Экспорт — сплит-кнопка (тот же паттерн, что и в Каталоге товаров) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((v) => !v)}
                disabled={exporting !== null}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-60 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {exporting !== null ? 'Экспорт...' : 'Экспорт'}
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {isExportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1.5 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        handleExport('filtered');
                      }}
                      className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <svg className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6" />
                      </svg>
                      <span>
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">С учётом фильтров</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">Найдено {data?.total ?? 0} клиентов</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        handleExport('all');
                      }}
                      className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <svg className="w-4 h-4 mt-0.5 text-gray-500 dark:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9h18M9 21V9" />
                      </svg>
                      <span>
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">Весь список</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">Без учёта фильтров и поиска · .xlsx</span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <Button onClick={openCreateModal}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить клиента
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Фильтры</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Поиск клиентов
              </label>
              <CatalogSearchInput
                value={search}
                onChange={setSearch}
                placeholder="Поиск по имени, email или телефону..."
              />
            </div>

            {/* Type Filter */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Тип клиента
              </label>
              <select
                id="type"
                value={filters.customer_type_id}
                onChange={(e) => setFilter('customer_type_id', e.target.value)}
                disabled={isLoadingTypes}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
              >
                <option value="">Все типы</option>
                {customerTypes.map(type => (
                  <option key={type.id} value={type.id.toString()}>{type.name}</option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Сортировка
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSort(e.target.value, e.target.value === 'created_at' ? 'desc' : 'asc')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="name">По имени</option>
                <option value="email">По email</option>
                <option value="created_at">По дате</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={reset}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              {/* Table Header */}
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Клиент
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Контакты
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Тип клиента
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Адрес
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Дата регистрации
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Действия
                  </TableCell>
                </TableRow>
              </TableHeader>

              {/* Table Body */}
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    {/* Клиент */}
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                            {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                          </span>
                        </div>
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {customer.name || 'Не указано'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Контакты */}
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white/90">
                          {customer.email || 'Не указан'}
                        </div>
                        {customer.phone && (
                          <div className="text-theme-xs text-gray-500 dark:text-gray-400">
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Тип клиента */}
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {getCustomerTypeName(customer.customer_type_id)}
                    </TableCell>

                    {/* Адрес */}
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <div className="max-w-xs truncate">
                        {customer.address || 'Не указан'}
                      </div>
                    </TableCell>

                    {/* Дата регистрации */}
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {customer.created_at ? new Date(customer.created_at).toLocaleDateString('ru-RU') : 'Не указана'}
                    </TableCell>

                    {/* Действия */}
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex gap-2">
                        {deleteConfirm === customer.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(customer.id)}
                              disabled={isDeleting}
                              className="flex items-center justify-center w-8 h-8 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                              title="Подтвердить удаление"
                            >
                              {isDeleting ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              disabled={isDeleting}
                              className="flex items-center justify-center w-8 h-8 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                              title="Отменить"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(customer)}
                              className="flex items-center justify-center w-8 h-8 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 transition-colors"
                              title="Редактировать клиента"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(customer.id)}
                              className="flex items-center justify-center w-8 h-8 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors"
                              title="Удалить клиента"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {customers.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Клиенты не найдены
              </div>
            )}
          </div>
        </div>

        {data && (
          <Pagination page={page} totalPages={data.total_pages} total={data.total} onPageChange={setPage} />
        )}
      </div>

      {/* Customer Modal */}
      {!typesError && (
        <CustomerModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCustomer(null);
          }}
          onSubmit={(data) =>
            editingCustomer
              ? handleUpdateCustomer(data)
              : // На создании name обязателен, и форма это уже провалидировала;
                // общий тип формы допускает частичные данные ради режима правки.
                handleCreateCustomer(data as CreateCustomerRequest)
          }
          onScheduleTask={() => setIsTaskModalOpen(true)}
          customer={editingCustomer}
          isLoading={isCreating || isUpdating}
          customerTypes={customerTypes}
        />
      )}

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        initialCustomerId={editingCustomer?.id}
        initialCustomerLabel={editingCustomer?.name}
      />
    </>
  );
}
