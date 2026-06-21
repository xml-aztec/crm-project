import { useState } from 'react';
import Button from '../ui/button/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import DeleteConfirmModal from '../common/DeleteConfirmModal';

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

const THEME = {
  blue: {
    gradient: 'from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
    emptyBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700',
    emptyBg: 'bg-orange-50 dark:bg-orange-900/20',
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700',
    emptyBg: 'bg-purple-50 dark:bg-purple-900/20',
  },
} as const;

export type EntityTableTheme = keyof typeof THEME;

export interface EntityTableExtraColumn<T> {
  label: string;
  render: (item: T) => React.ReactNode;
}

export interface EntityTableProps<T extends { id: number; name: string }> {
  items: T[];
  isLoading: boolean;
  error?: unknown;
  isDeleting: boolean;
  icon: React.ComponentType;
  theme: EntityTableTheme;
  loadingText: string;
  errorText: string;
  emptyTitle: string;
  emptyDescription: string;
  nameColumnLabel: string;
  deleteModalTitle: string;
  extraColumn?: EntityTableExtraColumn<T>;
  onEdit?: (item: T) => void;
  onDelete: (item: T) => Promise<void>;
}

export default function EntityTable<T extends { id: number; name: string }>({
  items,
  isLoading,
  error,
  isDeleting,
  icon: Icon,
  theme,
  loadingText,
  errorText,
  emptyTitle,
  emptyDescription,
  nameColumnLabel,
  deleteModalTitle,
  extraColumn,
  onEdit,
  onDelete,
}: EntityTableProps<T>) {
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDeleteClick = (item: T) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setItemToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete && !isDeleting) {
      try {
        await onDelete(itemToDelete);
        setItemToDelete(null);
        setIsDeleteModalOpen(false);
      } catch (error) {
        // Обработка ошибки без алерта
      }
    }
  };

  if (isLoading) {
    return <LoadingSpinner text={loadingText} />;
  }

  if (error) {
    return (
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
          {errorText}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Обновить страницу
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="text-center py-16">
        <div className={`mx-auto h-16 w-16 rounded-full ${THEME[theme].emptyBg} flex items-center justify-center mb-6`}>
          <Icon />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {emptyTitle}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {nameColumnLabel}
                </th>
                {extraColumn && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {extraColumn.label}
                  </th>
                )}
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className={`transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        #{item.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${THEME[theme].gradient} flex items-center justify-center shadow-sm`}>
                          <Icon />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  {extraColumn && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {extraColumn.render(item)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit?.(item)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                      >
                        <EditIcon />
                        <span className="hidden sm:inline">Изменить</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteClick(item)}
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

      <DeleteConfirmModal
        title={deleteModalTitle}
        itemName={itemToDelete?.name || ''}
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
}
