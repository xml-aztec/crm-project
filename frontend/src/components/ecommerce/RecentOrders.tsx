import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useDateFormatters } from "../../hooks/useDateFormatters";
import { useGetRecentOrdersQuery } from "../../store/api/ordersApi";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";

// ✅ Типы для отображения заказов
interface OrderDisplayItem {
  id: number;
  customerName: string;
  status: string;
  statusColor: "success" | "warning" | "error" | "info";
  totalPrice: string;
  itemsCount: string;
  createdAt: string;
}

export default function RecentOrders() {
  const navigate = useNavigate();
  const { dateTime } = useDateFormatters();

  // ✅ Получаем данные последних заказов
  const {
    data: recentOrders = [],
    isLoading,
    error,
    refetch,
  } = useGetRecentOrdersQuery(
    { limit: 5 },
    {
      pollingInterval: 300000, // Обновляем каждые 5 минут
      refetchOnMountOrArgChange: 180, // 3 минуты
    }
  );

  // ✅ Форматирование валюты
  const formatCurrency = useMemo(() => {
    return (amount: number) => {
      return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "KGS",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };
  }, []);

  // ✅ Определение цвета статуса
  const getStatusColor = useMemo(() => {
    return (status: string): "success" | "warning" | "error" | "info" => {
      const statusLower = status.toLowerCase();

      if (statusLower.includes("завершен") || statusLower.includes("доставлен")) {
        return "success";
      }
      if (statusLower.includes("в работе") || statusLower.includes("обработка")) {
        return "warning";
      }
      if (statusLower.includes("отменен") || statusLower.includes("отклонен")) {
        return "error";
      }
      return "info"; // Новый, Ожидание и т.д.
    };
  }, []);

  // ✅ Форматирование данных для отображения
  const displayData: OrderDisplayItem[] = useMemo(
    () =>
      recentOrders.map((order) => ({
        id: order.id,
        customerName: order.customer_name,
        status: order.status,
        statusColor: getStatusColor(order.status),
        totalPrice: formatCurrency(order.total_price),
        itemsCount: `${order.items_count} ${
          order.items_count === 1
            ? "товар"
            : order.items_count < 5
            ? "товара"
            : "товаров"
        }`,
        createdAt: dateTime(order.created_at),
      })),
    [recentOrders, getStatusColor, formatCurrency, dateTime]
  );

  // ✅ Обработчики
  const handleViewAllOrders = () => {
    navigate("/orders");
  };

  const handleViewOrder = (orderId: number) => {
    navigate(`/orders/${orderId}`);
  };

  const handleRefresh = () => {
    refetch();
  };

  // ✅ Состояние ошибки
  if (error) {
    return (
      <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-4 pb-2 pt-4 dark:border-red-800 dark:bg-red-900/20 sm:px-6 min-h-[600px] flex items-center justify-center">
        <div className="text-center py-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Ошибка загрузки заказов
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            Не удалось загрузить последние заказы
          </p>
          <button
            onClick={handleRefresh}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-2 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 min-h-[600px] flex flex-col">
      {/* ✅ Заголовок с индикатором загрузки */}
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Последние заказы
          </h3>
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Обновление...
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleViewAllOrders}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            Все заказы
          </button>
        </div>
      </div>

      {/* ✅ Контент таблицы - занимает оставшееся пространство */}
      <div className="max-w-full overflow-x-auto flex-1 flex flex-col">
        {isLoading && displayData.length === 0 ? (
          // Состояние загрузки
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-pulse flex items-center gap-3 py-3">
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : displayData.length === 0 ? (
          // Пустое состояние
          <div className="text-center py-12 flex-1 flex flex-col justify-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Пока нет заказов
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Последние заказы будут отображаться здесь
            </p>
            <button
              onClick={() => navigate("/orders/create")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Создать первый заказ
            </button>
          </div>
        ) : (
          // Таблица с данными
          <div className="flex-1">
            <Table>
              <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                <TableRow>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    Заказ
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    Клиент
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    Сумма
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    Статус
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {displayData.map((order) => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="py-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <svg
                            className="h-5 w-5 text-blue-600 dark:text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm dark:text-white/90">
                            Заказ #{order.id}
                          </p>
                          <span className="text-gray-500 text-xs dark:text-gray-400">
                            {order.createdAt}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div 
                        className="cursor-pointer"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <p className="font-medium text-gray-900 text-sm dark:text-white/90">
                          {order.customerName}
                        </p>
                        <span className="text-gray-500 text-xs dark:text-gray-400">
                          {order.itemsCount}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <span 
                        className="font-semibold text-gray-900 text-sm dark:text-white/90 cursor-pointer"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        {order.totalPrice}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      <div 
                        className="cursor-pointer"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <Badge size="sm" color={order.statusColor}>
                          {order.status}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
