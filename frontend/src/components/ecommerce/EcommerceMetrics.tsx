import { useMemo } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIconLine,
  GroupIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";
import { useGetKPISummaryQuery } from "../../store/api/ordersApi";

export default function EcommerceMetrics() {
  // ✅ Получаем данные KPI из API
  const { 
    data: kpiData, 
    isLoading, 
    error 
  } = useGetKPISummaryQuery(undefined, {
    pollingInterval: 300000, // Обновляем каждые 5 минут
    refetchOnMountOrArgChange: 300
  });

  // ✅ Мемоизируем форматирование данных
  const metricsData = useMemo(() => {
    if (!kpiData) {
      return {
        customers: { count: 0, changePercent: 0 },
        orders: { count: 0, changePercent: 0 }
      };
    }

    return {
      customers: {
        count: kpiData.customers.count,
        changePercent: kpiData.customers.change_percent
      },
      orders: {
        count: kpiData.orders.count,
        changePercent: kpiData.orders.change_percent
      }
    };
  }, [kpiData]);

  // ✅ Вспомогательная функция для определения цвета бейджа
  const getBadgeColor = (changePercent: number) => {
    return changePercent >= 0 ? "success" : "error";
  };

  // ✅ Вспомогательная функция для иконки
  const getArrowIcon = (changePercent: number) => {
    return changePercent >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />;
  };

  // ✅ Форматирование процентов
  const formatPercent = (percent: number) => {
    return `${Math.abs(percent).toFixed(2)}%`;
  };

  // ✅ Состояние ошибки
  if (error) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20 md:p-6">
          <div className="text-center py-4">
            <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">
              Ошибка загрузки KPI
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* Клиенты */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Клиенты
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {isLoading ? (
                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-7 w-16 rounded"></div>
              ) : (
                metricsData.customers.count.toLocaleString('ru-RU')
              )}
            </h4>
          </div>
          
          {!isLoading && (
            <Badge color={getBadgeColor(metricsData.customers.changePercent)}>
              {getArrowIcon(metricsData.customers.changePercent)}
              {formatPercent(metricsData.customers.changePercent)}
            </Badge>
          )}
        </div>
      </div>

      {/* Заказы */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Заказы
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {isLoading ? (
                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-7 w-16 rounded"></div>
              ) : (
                metricsData.orders.count.toLocaleString('ru-RU')
              )}
            </h4>
          </div>

          {!isLoading && (
            <Badge color={getBadgeColor(metricsData.orders.changePercent)}>
              {getArrowIcon(metricsData.orders.changePercent)}
              {formatPercent(metricsData.orders.changePercent)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
