import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useState, useMemo } from "react";
import { useGetSalesByMonthQuery, useGetRevenueProfitDataQuery } from "../../store/api/ordersApi";

export default function StatisticsChart() {
  const [selectedMetric, setSelectedMetric] = useState<'sales' | 'revenue-profit'>('sales');

  // ✅ Получаем данные продаж по месяцам
  const {
    data: salesData,
    isLoading: salesLoading,
    error: salesError,
  } = useGetSalesByMonthQuery(undefined, {
    pollingInterval: 300000, // Обновляем каждые 5 минут
    refetchOnMountOrArgChange: 300,
  });

  // ✅ Получаем данные выручки и прибыли
  const {
    data: revenueProfitData,
    isLoading: revenueProfitLoading,
    error: revenueProfitError,
  } = useGetRevenueProfitDataQuery(undefined, {
    pollingInterval: 300000,
    refetchOnMountOrArgChange: 300,
  });

  // ✅ Маппинг месяцев с английского на русский
  const monthTranslations: Record<string, string> = useMemo(() => ({
    'Jan': 'Янв',
    'Feb': 'Фев',
    'Mar': 'Мар',
    'Apr': 'Апр',
    'May': 'Май',
    'Jun': 'Июн',
    'Jul': 'Июл',
    'Aug': 'Авг',
    'Sep': 'Сен',
    'Oct': 'Окт',
    'Nov': 'Ноя',
    'Dec': 'Дек'
  }), []);

  // ✅ Маппинг номера месяца в название
  const monthNames = useMemo(() => [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
  ], []);

  // ✅ Мемоизируем обработку данных
  const chartData = useMemo(() => {
    if (selectedMetric === 'sales') {
      if (!salesData) {
        return {
          categories: monthNames,
          series: [{ name: "Продажи", data: Array(12).fill(0) }]
        };
      }

      return {
        categories: salesData.map(item => monthTranslations[item.month] || item.month),
        series: [{
          name: "Продажи",
          data: salesData.map(item => item.total)
        }]
      };
    } else {
      if (!revenueProfitData) {
        return {
          categories: monthNames,
          series: [
            { name: "Выручка", data: Array(12).fill(0) },
            { name: "Прибыль", data: Array(12).fill(0) }
          ]
        };
      }

      return {
        categories: revenueProfitData.map((_, index) => monthNames[index]),
        series: [
          {
            name: "Выручка",
            data: revenueProfitData.map(item => item.revenue)
          },
          {
            name: "Прибыль", 
            data: revenueProfitData.map(item => item.profit)
          }
        ]
      };
    }
  }, [selectedMetric, salesData, revenueProfitData, monthTranslations, monthNames]);

  // ✅ Мемоизируем форматирование валюты
  const formatCurrency = useMemo(() => {
    return (val: number) => {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + "M сом";
      } else if (val >= 1000) {
        return (val / 1000).toFixed(0) + "K сом";
      }
      return new Intl.NumberFormat("ru-RU", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val) + " сом";
    };
  }, []);

  // ✅ Определяем состояние загрузки и ошибки
  const isLoading = selectedMetric === 'sales' ? salesLoading : revenueProfitLoading;
  const error = selectedMetric === 'sales' ? salesError : revenueProfitError;

  // ✅ ИСПРАВЛЯЕМ: Настройки графика с правильным tooltip
  const options: ApexOptions = useMemo(() => ({
    legend: {
      show: chartData.series.length > 1,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    colors: selectedMetric === 'sales' ? ["#465FFF"] : ["#465FFF", "#22C55E"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: selectedMetric === 'sales' ? "area" : "line",
      toolbar: {
        show: false,
      },
      animations: {
        enabled: !isLoading,
      },
      // ✅ ДОБАВЛЯЕМ: Ключ для перерендера при смене типа
      id: `chart-${selectedMetric}`,
    },
    stroke: {
      curve: "smooth",
      width: selectedMetric === 'sales' ? [3] : [3, 3],
    },
    fill: {
      type: selectedMetric === 'sales' ? "gradient" : "solid",
      gradient: selectedMetric === 'sales' ? {
        opacityFrom: 0.55,
        opacityTo: 0,
      } : undefined,
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
      borderColor: '#E5E7EB',
    },
    dataLabels: {
      enabled: false,
    },
    // ✅ ИСПРАВЛЯЕМ: Улучшенные настройки tooltip
    tooltip: {
      enabled: true,
      shared: true, // ✅ Включаем shared tooltip
      intersect: false, // ✅ Отключаем intersect
      followCursor: false, // ✅ Фиксированная позиция
      fixed: {
        enabled: false,
      },
      custom: undefined, // ✅ Убираем кастомный tooltip если был
      x: {
        show: true,
        format: 'dd MMM',
        formatter: undefined,
      },
      y: {
        formatter: (val: number,) => {
          // ✅ Проверяем что значение не undefined/null
          if (val === undefined || val === null) return '';
          return formatCurrency(val);
        },
        title: {
          formatter: (seriesName: string) => seriesName + ': ',
        },
      },
      marker: {
        show: true,
      },
      style: {
        fontSize: '12px',
        fontFamily: 'Outfit, sans-serif',
      },
      theme: 'light',
      // ✅ ДОБАВЛЯЕМ: Настройки для стабильности
      hideEmptySeries: true,
      onDestroy: undefined,
    },
    xaxis: {
      type: "category",
      categories: chartData.categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '12px',
        },
      },
      // ✅ ДОБАВЛЯЕМ: Настройки для корректной работы tooltip
      tooltip: {
        enabled: false, // Отключаем tooltip на оси X
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
        formatter: (val: number) => formatCurrency(val),
      },
      title: {
        text: "",
        style: {
          fontSize: "0px",
        },
      },
    },
    // ✅ ДОБАВЛЯЕМ: Настройки hover состояний
    states: {
      hover: {
        filter: {
          type: 'lighten',
          value: 0.15,
        }
      },
      active: {
        allowMultipleDataPointsSelection: false,
        filter: {
          type: 'darken',
          value: 0.35,
        }
      }
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 250,
          },
          legend: {
            position: "bottom",
          },
          tooltip: {
            enabled: true, // ✅ Убеждаемся что tooltip включен на мобильных
          },
        },
      },
    ],
  }), [chartData.categories, selectedMetric, isLoading, formatCurrency, chartData.series.length]);

  // ✅ Обработчик переключения метрик
  const handleMetricChange = (metric: 'sales' | 'revenue-profit') => {
    setSelectedMetric(metric);
  };

  // ✅ Состояние ошибки
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 pt-5 dark:border-red-800 dark:bg-red-900/20 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
              Ошибка загрузки данных
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400">
              Не удалось загрузить статистику
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Статистика
            </h3>
            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Загрузка...</span>
              </div>
            )}
          </div>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {selectedMetric === 'sales' 
              ? 'Динамика продаж по месяцам' 
              : 'Выручка и прибыль по месяцам'
            }
          </p>
        </div>
        
        {/* ✅ Кастомные табы для переключения метрик */}
        <div className="flex items-start w-full gap-3 sm:justify-end">
          <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => handleMetricChange('sales')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedMetric === 'sales'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Выручка
            </button>
            <button
              onClick={() => handleMetricChange('revenue-profit')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedMetric === 'revenue-profit'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Прибыль
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-[310px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка графика...</p>
              </div>
            </div>
          ) : (
            <Chart 
              key={`chart-${selectedMetric}`} 
              options={options} 
              series={chartData.series} 
              type={selectedMetric === 'sales' ? "area" : "line"} 
              height={310} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
