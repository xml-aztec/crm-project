import React, { useState } from 'react';
import { useGetWarehousesQuery } from '../../store/api/warehouseApi';
import { useGetProductsQuery } from '../../store/api/catalogApi';
import { useTransferStockMutation } from '../../store/api/stockApi';
import Button from '../ui/button/Button';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: number;
  initialWarehouseId?: number;
}

const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  initialProductId,
  initialWarehouseId,
}) => {
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: products = [] } = useGetProductsQuery();
  const [transfer, { isLoading }] = useTransferStockMutation();

  const [fromWarehouseId, setFromWarehouseId] = useState<number>(initialWarehouseId ?? 0);
  const [toWarehouseId, setToWarehouseId] = useState<number>(0);
  const [productId, setProductId] = useState<number>(initialProductId ?? 0);
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fromWarehouseId || !toWarehouseId || !productId || quantity <= 0) {
      setError('Заполните все поля');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      setError('Исходный и целевой склад должны отличаться');
      return;
    }

    try {
      await transfer({
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        product_id: productId,
        quantity,
      }).unwrap();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      setError(detail ?? 'Ошибка при перемещении');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full z-[100000]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Перемещение товара
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Товар
                </label>
                <select
                  value={productId}
                  onChange={e => setProductId(Number(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                >
                  <option value={0}>— выберите товар —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Исходный склад
                </label>
                <select
                  value={fromWarehouseId}
                  onChange={e => setFromWarehouseId(Number(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                >
                  <option value={0}>— выберите склад —</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Целевой склад
                </label>
                <select
                  value={toWarehouseId}
                  onChange={e => setToWarehouseId(Number(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                >
                  <option value={0}>— выберите склад —</option>
                  {warehouses
                    .filter(w => w.id !== fromWarehouseId)
                    .map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Количество
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end px-6 pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    Перемещение...
                  </div>
                ) : (
                  'Переместить'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StockTransferModal;
