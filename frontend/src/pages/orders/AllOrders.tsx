import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { OrderFilters, useExportOrdersExcelMutation } from '../../store/api/ordersApi';
import OrdersStats from '../../components/orders/OrdersStats';
import OrdersFilters from '../../components/orders/OrdersFilters';
import OrdersTable from '../../components/orders/OrdersTable';
import Button from '../../components/ui/button/Button';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const statusTabs = [
  { id: 'all', label: 'Все заказы', count: 0 },
  { id: '1', label: 'Новые', count: 0 },
  { id: '2', label: 'В работе', count: 0 },
  { id: '3', label: 'Завершенные', count: 0 },
  { id: '4', label: 'Отмененные', count: 0 },
];

export default function AllOrders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Получаем активную вкладку из URL параметров
  const activeTab = searchParams.get('status') || 'all';

  // Состояние фильтров
  const [filters, setFilters] = useState<OrderFilters>({
    status_id: activeTab === 'all' ? '' : activeTab,
    customer_name: searchParams.get('search') || '',
    date_from: '',
    date_to: '',
  });

  // Обработчики
  const handleTabChange = (tabId: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (tabId === 'all') {
      newParams.delete('status');
      setFilters(prev => ({ ...prev, status_id: '' }));
    } else {
      newParams.set('status', tabId);
      setFilters(prev => ({ ...prev, status_id: tabId }));
    }
    setSearchParams(newParams);
  };

  const handleViewDetails = (order: any) => {
    navigate(`/orders/${order.id}`);
  };

  const handleEdit = (order: any) => {
    navigate(`/orders/${order.id}/edit`);
  };

  const [exportExcel, { isLoading: isExporting }] = useExportOrdersExcelMutation();

  const handleExport = async () => {
    try {
      const result = await exportExcel({
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        status_id: filters.status_id || undefined,
        customer_name: filters.customer_name || undefined,
      }).unwrap();
      downloadBlob(result, 'orders_export.xlsx');
    } catch {
      // Обработка ошибки без алерта
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Заказы
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Управление заказами и их статусами
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={isExporting}
            title="Экспортировать заказы с учётом текущих фильтров"
          >
            {isExporting ? 'Экспорт...' : 'Экспорт в Excel'}
          </Button>
          <Button onClick={() => navigate('/orders/create')} className="sm:shrink-0 w-full sm:w-auto">
            Создать заказ
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <OrdersStats />

      {/* Вкладки статусов */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Фильтры */}
      <OrdersFilters
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Таблица заказов */}
      <OrdersTable
        filters={filters}
        onEdit={handleEdit}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
}