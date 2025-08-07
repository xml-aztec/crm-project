import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import { useState, useMemo } from "react";
import { useGetSalesByMonthQuery } from "../../store/api/ordersApi";

export default function MonthlySalesChart() {
  const [isOpen, setIsOpen] = useState(false);

  // ✅ Получаем данные из API
  const {
    data: salesData,
    isLoading,
    error,
    refetch, 
  } = useGetSalesByMonthQuery(undefined, {
    pollingInterval: 300000, // Обновляем каждые 5 минут
    refetchOnMountOrArgChange: 300,
  });

  const monthTranslations: Record<string, string> = useMemo(
    () => ({
      Jan: "Янв",
      Feb: "Фев",
      Mar: "Мар",
      Apr: "Апр",
      May: "Май",
      Jun: "Июн",
      Jul: "Июл",
      Aug: "Авг",
      Sep: "Сен",
      Oct: "Окт",
      Nov: "Ноя",
      Dec: "Дек",
    }),
    []
  );

  const chartData = useMemo(() => {
    if (!salesData) {
      // Fallback данные пока загружается
      return {
        categories: [
          "Янв",
          "Фев",
          "Мар",
          "Апр",
          "Май",
          "Июн",
          "Июл",
          "Авг",
          "Сен",
          "Окт",
          "Ноя",
          "Дек",
        ],
        data: Array(12).fill(0),
      };
    }

    return {
      categories: salesData.map(
        (item) => monthTranslations[item.month] || item.month
      ),
      data: salesData.map((item) => item.total),
    };
  }, [salesData, monthTranslations]);

  const formatCurrency = useMemo(() => {
    return (val: number) => {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + "M сом";
      } else if (val >= 1000) {
        return (val / 1000).toFixed(0) + "K сом";
      }
      return (
        new Intl.NumberFormat("ru-RU", {
          style: "decimal",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val) + " сом"
      );
    };
  }, []);

  const options: ApexOptions = useMemo(
    () => ({
      colors: ["#465fff"],
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "bar",
        height: 180,
        toolbar: {
          show: false,
        },
        animations: {
          enabled: !isLoading, // Отключаем анимацию при загрузке
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "39%",
          borderRadius: 5,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 4,
        colors: ["transparent"],
      },
      xaxis: {
        categories: chartData.categories,
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          style: {
            colors: "#6B7280",
            fontSize: "12px",
          },
        },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        fontFamily: "Outfit",
      },
      yaxis: {
        title: {
          text: undefined,
        },
        labels: {
          style: {
            colors: "#6B7280",
            fontSize: "12px",
          },
          formatter: (val: number) => formatCurrency(val),
        },
      },
      grid: {
        yaxis: {
          lines: {
            show: true,
          },
        },
        borderColor: "#E5E7EB",
      },
      fill: {
        opacity: 1,
      },
      tooltip: {
        x: {
          show: true,
        },
        y: {
          formatter: (val: number) => formatCurrency(val),
        },
        theme: "light",
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 200,
            },
            plotOptions: {
              bar: {
                columnWidth: "50%",
              },
            },
          },
        },
      ],
    }),
    [chartData.categories, formatCurrency, isLoading]
  );

  const series = useMemo(
    () => [
      {
        name: "Продажи",
        data: chartData.data,
      },
    ],
    [chartData.data]
  );

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const handleRefresh = () => {
    refetch(); // Принудительно обновляем данные
    closeDropdown();
  };

  if (error) {
    return (
      <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-5 pt-5 dark:border-red-800 dark:bg-red-900/20 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <svg
              className="w-12 h-12 text-red-500 mx-auto mb-4"
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
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
              Ошибка загрузки данных
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400">
              Не удалось загрузить статистику продаж
            </p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      {/* Заголовок с индикатором загрузки */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Продажи по месяцам
          </h3>
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Загрузка...
              </span>
            </div>
          )}
        </div>

        <div className="relative inline-block">
          <button
            className="dropdown-toggle p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={toggleDropdown}
            aria-label="Дополнительные действия"
          >
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-2">
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Экспорт данных
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* График */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-[180px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Загрузка графика...
                </p>
              </div>
            </div>
          ) : (
            <Chart options={options} series={series} type="bar" height={180} />
          )}
        </div>
      </div>
    </div>
  );
}
