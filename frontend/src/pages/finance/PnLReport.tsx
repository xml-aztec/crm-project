import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { useGetPnlReportQuery, useGetPnlYearlyQuery } from '../../store/api/analyticsApi';

const MONTH_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

function fmt(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
}

function fmtPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  color: 'blue' | 'orange' | 'green' | 'red' | 'purple';
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, color, subtitle }) => {
  const colorMap = {
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
    orange: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20',
    green: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
    red: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
    purple: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20',
  };
  const textMap = {
    blue: 'text-blue-700 dark:text-blue-300',
    orange: 'text-orange-700 dark:text-orange-300',
    green: 'text-green-700 dark:text-green-300',
    red: 'text-red-700 dark:text-red-300',
    purple: 'text-purple-700 dark:text-purple-300',
  };

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${colorMap[color]}`}>
      <p className={`text-xs sm:text-sm font-medium opacity-75 ${textMap[color]}`}>{label}</p>
      <p className={`mt-1 text-xl sm:text-2xl font-bold ${textMap[color]}`}>
        {fmt(value)} сом
      </p>
      {subtitle && (
        <p className={`mt-1 text-xs opacity-70 ${textMap[color]}`}>{subtitle}</p>
      )}
    </div>
  );
};

const PnLReport: React.FC = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data: report, isLoading, isError } = useGetPnlReportQuery({ year, month });
  const { data: yearlyData = [] } = useGetPnlYearlyQuery({ year });

  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      background: 'transparent',
    },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: '60%' },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: MONTH_NAMES,
      labels: { style: { colors: '#6b7280', fontSize: '12px' } },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `${Math.round(val / 1000)}K`,
        style: { colors: '#6b7280' },
      },
    },
    legend: {
      position: 'top',
      labels: { colors: '#6b7280' },
    },
    colors: ['#3b82f6', '#22c55e', '#f59e0b'],
    tooltip: {
      y: { formatter: (val: number) => `${fmt(val)} сом` },
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 4,
    },
    theme: { mode: 'light' },
  };

  const chartSeries = [
    { name: 'Выручка', data: yearlyData.map((d) => Math.round(d.revenue)) },
    { name: 'Валовая прибыль', data: yearlyData.map((d) => Math.round(d.gross_profit)) },
    { name: 'Чистая прибыль', data: yearlyData.map((d) => Math.round(d.net_profit)) },
  ];

  const yearOptions = [];
  for (let y = today.getFullYear(); y >= today.getFullYear() - 3; y--) {
    yearOptions.push(y);
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="P&L отчёт" />

      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">P&L отчёт</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Доходы, расходы и прибыль за выбранный период
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-6 text-center text-red-600 dark:text-red-400">
          Не удалось загрузить данные
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <MetricCard
              label="Выручка"
              value={report.revenue}
              color="blue"
              subtitle="Подтверждённые заказы"
            />
            <MetricCard
              label="Себестоимость (COGS)"
              value={report.cogs}
              color="orange"
              subtitle={`Маржа: ${fmtPct(report.gross_margin_percent)}`}
            />
            <MetricCard
              label="Валовая прибыль"
              value={report.gross_profit}
              color={report.gross_profit >= 0 ? 'green' : 'red'}
              subtitle={`${report.gross_margin_percent.toFixed(1)}% от выручки`}
            />
            <MetricCard
              label="Расходы на зарплату"
              value={report.payroll_total}
              color="red"
              subtitle="Payroll за месяц"
            />
            <MetricCard
              label="Чистая прибыль"
              value={report.net_profit}
              color={report.net_profit >= 0 ? 'green' : 'red'}
              subtitle={`${report.net_margin_percent.toFixed(1)}% от выручки`}
            />
          </div>

          {/* P&L breakdown bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Структура доходов и расходов — {MONTH_NAMES[month - 1]} {year}
            </h2>
            <div className="space-y-3">
              <BreakdownRow
                label="Выручка"
                value={report.revenue}
                maxValue={report.revenue}
                color="bg-blue-500"
              />
              <BreakdownRow
                label="Себестоимость"
                value={report.cogs}
                maxValue={report.revenue}
                color="bg-orange-400"
              />
              <BreakdownRow
                label="Валовая прибыль"
                value={report.gross_profit}
                maxValue={report.revenue}
                color="bg-green-500"
              />
              <BreakdownRow
                label="Расходы на зарплату"
                value={report.payroll_total}
                maxValue={report.revenue}
                color="bg-red-400"
              />
              <BreakdownRow
                label="Чистая прибыль"
                value={report.net_profit}
                maxValue={report.revenue}
                color={report.net_profit >= 0 ? 'bg-emerald-500' : 'bg-red-600'}
              />
            </div>
          </div>
        </>
      ) : null}

      {/* Yearly chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Динамика P&L за {year} год
        </h2>
        <Chart
          options={chartOptions}
          series={chartSeries}
          type="bar"
          height={280}
        />
      </div>
    </div>
  );
};

interface BreakdownRowProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

const BreakdownRow: React.FC<BreakdownRowProps> = ({ label, value, maxValue, color }) => {
  const pct = maxValue > 0 ? Math.min(Math.abs(value) / maxValue * 100, 100) : 0;
  const isNeg = value < 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0 text-xs text-gray-600 dark:text-gray-400 text-right">{label}</div>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`w-32 shrink-0 text-xs font-semibold text-right ${isNeg ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
        {isNeg ? '−' : ''}{fmt(Math.abs(value))} сом
      </div>
    </div>
  );
};

export default PnLReport;
