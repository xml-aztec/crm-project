interface ProductsStatsProps {
  isLoading?: boolean;
  totalProducts?: number;
  inStockProducts?: number;
  outOfStockProducts?: number;
}

const StatsCard = ({ title, value, subtext, color }: {
  title: string;
  value: string | number;
  subtext?: string;
  color: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-center">
      <div className={`p-3 rounded-lg ${color}`}>
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <div className="ml-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{value}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        {subtext && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtext}</p>
        )}
      </div>
    </div>
  </div>
);

export default function ProductsStats({
  isLoading = false,
  totalProducts = 0,
  inStockProducts = 0,
  outOfStockProducts = 0
}: ProductsStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
              <div className="ml-4">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatsCard
        title="Всего товаров"
        value={totalProducts}
        color="bg-blue-500"
      />
      <StatsCard
        title="В наличии"
        value={inStockProducts}
        subtext={totalProducts > 0 ? `${((inStockProducts / totalProducts) * 100).toFixed(1)}% от общего количества` : undefined}
        color="bg-green-500"
      />
      <StatsCard
        title="Нет в наличии"
        value={outOfStockProducts}
        subtext="Требуют пополнения"
        color="bg-red-500"
      />
    </div>
  );
}