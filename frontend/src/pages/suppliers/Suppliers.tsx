import React, { useState, useCallback } from 'react';
import { asApiError } from '../../types/apiError';
import { useNavigate } from "react-router";
import {
  useGetSuppliersPaginatedQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest
} from '../../store/api/suppliersApi';
import { useTableUrlState } from '../../hooks/useTableUrlState';
import Button from '../../components/ui/button/Button';
import SupplierModal from '../../components/suppliers/SupplierModal';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import Pagination from '../../components/common/Pagination';
import CatalogSearchInput from '../../components/catalog/CatalogSearchInput';

const PAGE_SIZE = 20;

const Suppliers: React.FC = () => {
  const navigate = useNavigate();

  const { page, search, setPage, setSearch, reset } = useTableUrlState({
    prefix: 'supplier',
    defaultSortBy: 'name',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>();
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // API запросы
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch
  } = useGetSuppliersPaginatedQuery({
    search: search || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const [createSupplier, { isLoading: isCreating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: isUpdating }] = useUpdateSupplierMutation();
  const [deleteSupplier, { isLoading: isDeleting }] = useDeleteSupplierMutation();

  const suppliers = data?.items ?? [];

  // Обработчики
  const handleCreateSupplier = useCallback(() => {
    setEditingSupplier(undefined);
    setIsModalOpen(true);
  }, []);

  const handleEditSupplier = useCallback((supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingSupplier(undefined);
  }, []);

  const handleSubmitSupplier = useCallback(async (data: CreateSupplierRequest | UpdateSupplierRequest) => {
    try {
      if (editingSupplier) {
        await updateSupplier({ id: editingSupplier.id, data }).unwrap();
      } else {
        await createSupplier(data as CreateSupplierRequest).unwrap();
      }
      handleCloseModal();
    } catch (rawError) {
      const error = asApiError(rawError);
      console.error('Ошибка при сохранении поставщика:', error);
    }
  }, [editingSupplier, createSupplier, updateSupplier, handleCloseModal]);

  const handleDeleteSupplier = useCallback(async () => {
    if (!supplierToDelete) return;

    try {
      await deleteSupplier(supplierToDelete.id).unwrap();
      setSupplierToDelete(null);
    } catch (error) {
      console.error('Ошибка при удалении поставщика:', error);
    }
  }, [supplierToDelete, deleteSupplier]);

  // Обработка ошибок загрузки
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Ошибка загрузки
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4">
            Не удалось загрузить список поставщиков
          </p>
          <Button onClick={() => refetch()}>
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Управление поставщиками
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Просмотр и управление базой поставщиков{data ? ` (всего: ${data.total})` : ''}
          </p>
        </div>

        <Button onClick={handleCreateSupplier}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить поставщика
        </Button>
      </div>

      {/* Поиск и быстрые действия */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <CatalogSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Поиск по названию, контактному лицу, контактам или адресу..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {search && (
              <Button variant="outline" onClick={reset} className="whitespace-nowrap">
                Сбросить поиск
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate('/supplies')}
              className="whitespace-nowrap"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Поставки
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/warehouses')}
              className="whitespace-nowrap"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Склады
            </Button>
          </div>
        </div>
      </div>

      {/* Таблица поставщиков */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Загрузка поставщиков...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {search ? 'Поставщики не найдены' : 'Нет поставщиков'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {search
                ? 'Попробуйте изменить параметры поиска'
                : 'Добавьте первого поставщика'
              }
            </p>
            <Button onClick={handleCreateSupplier}>
              Добавить поставщика
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {isFetching && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-200 dark:bg-blue-800 overflow-hidden z-20">
                <div className="h-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Поставщик
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Контактное лицо
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Контакты
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Адрес
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${isFetching ? 'opacity-70' : ''}`}>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {supplier.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {supplier.contact_person}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {supplier.contact_info}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {supplier.address}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditSupplier(supplier)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded"
                          title="Редактировать"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setSupplierToDelete(supplier)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                          title="Удалить"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <Pagination page={page} totalPages={data.total_pages} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Модал для добавления/редактирования поставщика */}
      <SupplierModal
        isOpen={isModalOpen}
        supplier={editingSupplier}
        isLoading={isCreating || isUpdating}
        onSubmit={handleSubmitSupplier}
        onCancel={handleCloseModal}
      />

      {/* Модал подтверждения удаления */}
      <DeleteConfirmModal
        isOpen={!!supplierToDelete}
        title="Удалить поставщика"
        itemName={supplierToDelete?.name || ''}
        confirmText="Удалить"
        isLoading={isDeleting}
        onConfirm={handleDeleteSupplier}
        onClose={() => setSupplierToDelete(null)}
      />
    </div>
  );
};

export default Suppliers;
