import React, { useState, useMemo } from 'react';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import {
  useGetCashflowEntriesQuery,
  useExportCashflowPdfMutation,
  type CashflowEntry,
} from '../../store/api/cashflowApi';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ── stat card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  color: 'green' | 'red' | 'blue';
}> = ({ label, value, color }) => {
  const colorMap = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  };

  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{formatAmount(value)} сом</p>
    </div>
  );
};

// ── type badge ────────────────────────────────────────────────────────────────

const TypeBadge: React.FC<{ name: string }> = ({ name }) => {
  const isIncome = name === 'income';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isIncome
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      }`}
    >
      {isIncome ? 'Доход' : 'Расход'}
    </span>
  );
};

// ── main page ─────────────────────────────────────────────────────────────────

const Finance: React.FC = () => {
  const today = new Date();
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = today.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(todayStr);
  const [typeFilter, setTypeFilter] = useState<'' | 'income' | 'expense'>('');

  const { data: entries = [], isLoading, isError } = useGetCashflowEntriesQuery({
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    type_name: typeFilter || undefined,
  });

  const [exportPdf, { isLoading: isExporting }] = useExportCashflowPdfMutation();

  const handleExport = async () => {
    try {
      const result = await exportPdf({
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        type_name: typeFilter || undefined,
      }).unwrap();
      downloadBlob(result, 'cashflow_report.pdf');
    } catch {
      // Обработка ошибки без алерта
    }
  };

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const e of entries) {
      if (e.type.name === 'income') inc += e.amount;
      else exp += e.amount;
    }
    return { totalIncome: inc, totalExpense: exp, balance: inc - exp };
  }, [entries]);

  return (
    <>
      <PageBreadcrumb pageTitle="Финансы" />

      <div className="space-y-6 p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Доходы" value={totalIncome} color="green" />
          <StatCard label="Расходы" value={totalExpense} color="red" />
          <StatCard
            label={balance >= 0 ? 'Баланс' : 'Дефицит'}
            value={Math.abs(balance)}
            color="blue"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">От</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">До</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Тип</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as '' | 'income' | 'expense')}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все</option>
              <option value="income">Доходы</option>
              <option value="expense">Расходы</option>
            </select>
          </div>
          <button
            onClick={() => { setFromDate(firstOfMonth); setToDate(todayStr); setTypeFilter(''); }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Сбросить
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isExporting ? 'Экспорт...' : 'Экспорт в PDF'}
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Движение средств
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {entries.length} операций
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              Загрузка...
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-16 text-red-500">
              Ошибка загрузки данных
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              Нет операций за выбранный период
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Дата</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Тип</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Категория</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Источник</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Описание</th>
                    <th className="px-5 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {entries.map((entry: CashflowEntry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-5 py-3">
                        <TypeBadge name={entry.type.name} />
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                        {entry.category?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                        {entry.source ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {entry.description ?? '—'}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${
                          entry.type.name === 'income'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {entry.type.name === 'income' ? '+' : '−'}{formatAmount(entry.amount)} сом
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Finance;
