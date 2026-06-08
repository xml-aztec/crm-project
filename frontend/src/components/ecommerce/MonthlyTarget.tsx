import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useGetMonthlyTargetSummaryQuery } from "../../store/api/analyticsApi";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString("ru-RU");
}

export default function MonthlyTarget() {
  const { data, isLoading } = useGetMonthlyTargetSummaryQuery();

  const progress = data?.progress_percent ?? 0;
  const target = data?.target ?? 0;
  const revenue = data?.revenue ?? 0;
  const todayRevenue = data?.today_revenue ?? 0;

  const options: ApexOptions = {
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 330,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: { size: "80%" },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "36px",
            fontWeight: "600",
            offsetY: -40,
            color: "#1D2939",
            formatter: (val) => val + "%",
          },
        },
      },
    },
    fill: { type: "solid", colors: ["#465FFF"] },
    stroke: { lineCap: "round" },
    labels: ["Выполнение"],
  };

  const now = new Date();
  const monthName = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              План месяца
            </h3>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400 capitalize">
              {monthName}
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="max-h-[330px]" id="chartDarkStyle">
            {isLoading ? (
              <div className="flex items-center justify-center h-[330px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
              </div>
            ) : (
              <Chart
                options={options}
                series={[Math.min(progress, 100)]}
                type="radialBar"
                height={330}
              />
            )}
          </div>

          {!isLoading && (
            <span className={`absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full px-3 py-1 text-xs font-medium ${
              progress >= 100
                ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                : "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
            }`}>
              {progress >= 100 ? "✓ Выполнен" : `${progress.toFixed(1)}%`}
            </span>
          )}
        </div>

        {target === 0 && !isLoading ? (
          <p className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-400">
            Планы на этот месяц не установлены
          </p>
        ) : (
          <p className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
            {progress >= 100
              ? `Поздравляем! План выполнен на ${progress.toFixed(0)}%`
              : `Выручка ${fmt(revenue)} сом из ${fmt(target)} сом по плану`}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
            План
          </p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {fmt(target)} сом
          </p>
        </div>

        <div className="w-px bg-gray-200 h-7 dark:bg-gray-800" />

        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
            Выручка
          </p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {fmt(revenue)} сом
          </p>
        </div>

        <div className="w-px bg-gray-200 h-7 dark:bg-gray-800" />

        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
            Сегодня
          </p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {fmt(todayRevenue)} сом
          </p>
        </div>
      </div>
    </div>
  );
}
