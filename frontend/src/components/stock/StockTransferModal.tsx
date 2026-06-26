import React, { useState } from 'react';
import { useGetWarehousesQuery } from '../../store/api/warehouseApi';
import { useGetProductsQuery } from '../../store/api/catalogApi';
import { useTransferStockMutation } from '../../store/api/stockApi';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Перемещение товара
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Товар
            </label>
            <select
              value={productId}
              onChange={e => setProductId(Number(e.target.value))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value={0}>— выберите склад —</option>
              {warehouses.filter(w => w.id !== fromWarehouseId).map(w => (
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Перемещение...' : 'Переместить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransferModal;
