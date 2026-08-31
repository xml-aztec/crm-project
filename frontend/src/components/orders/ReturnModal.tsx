import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/modal';
import Button from '../ui/button/Button';
import { Order } from '../../store/api/ordersApi';
import {
  useCreateReturnMutation,
  useGetReturnsQuery,
  ReturnItemCondition,
  CreateReturnItemRequest,
} from '../../store/api/returnsApi';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

interface RowState {
  selected: boolean;
  quantity: number;
  condition: ReturnItemCondition;
  reason: string;
}

export default function ReturnModal({ isOpen, onClose, order }: ReturnModalProps) {
  const [reason, setReason] = useState('');
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: existingReturns = [] } = useGetReturnsQuery(
    { order_id: order.id },
    { skip: !isOpen }
  );
  const [createReturn, { isLoading }] = useCreateReturnMutation();

  const alreadyReturned = useMemo(() => {
    const totals: Record<number, number> = {};
    for (const ret of existingReturns) {
      if (ret.status === 'rejected') continue;
      for (const item of ret.items) {
        totals[item.order_item_id] = (totals[item.order_item_id] || 0) + item.quantity;
      }
    }
    return totals;
  }, [existingReturns]);

  const returnableItems = useMemo(
    () =>
      (order.items || [])
        .map((item) => ({
          ...item,
          remaining: item.quantity - (alreadyReturned[item.id] || 0),
        }))
        .filter((item) => item.remaining > 0),
    [order.items, alreadyReturned]
  );

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setRows({});
      setError(null);
      return;
    }
    const initial: Record<number, RowState> = {};
    for (const item of returnableItems) {
      initial[item.id] = { selected: false, quantity: 1, condition: 'resalable', reason: '' };
    }
    setRows(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order.id]);

  const updateRow = (itemId: number, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  };

  const handleSubmit = async () => {
    setError(null);
    const items: CreateReturnItemRequest[] = returnableItems
      .filter((item) => rows[item.id]?.selected && rows[item.id].quantity > 0)
      .map((item) => ({
        order_item_id: item.id,
        quantity: rows[item.id].quantity,
        condition: rows[item.id].condition,
        reason: rows[item.id].reason || undefined,
      }));

    if (items.length === 0) {
      setError('Выберите хотя бы одну позицию для возврата');
      return;
    }

    try {
      await createReturn({ order_id: order.id, reason: reason || undefined, items }).unwrap();
      onClose();
    } catch (err: any) {
      setError(err?.data?.detail || 'Не удалось оформить возврат');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[640px] m-4">
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Оформить возврат по заказу #{order.id}
        </h3>

        {returnableItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
            По этому заказу больше нечего возвращать — всё уже возвращено.
          </p>
        ) : (
          <div className="space-y-4">
            {returnableItems.map((item) => {
              const row = rows[item.id];
              if (!row) return null;
              return (
                <div
                  key={item.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(e) => updateRow(item.id, { selected: e.target.checked })}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.product?.name || `Товар #${item.product_id}`}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (доступно к возврату: {item.remaining} из {item.quantity} шт.)
                    </span>
                  </label>

                  {row.selected && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-6">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Количество
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={item.remaining}
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(item.id, {
                              quantity: Math.max(1, Math.min(item.remaining, Number(e.target.value) || 1)),
                            })
                          }
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-1.5 text-sm dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Состояние
                        </label>
                        <select
                          value={row.condition}
                          onChange={(e) =>
                            updateRow(item.id, { condition: e.target.value as ReturnItemCondition })
                          }
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-1.5 text-sm dark:text-white dark:bg-gray-800"
                        >
                          <option value="resalable">Годный</option>
                          <option value="defective">Брак</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Причина (опционально)
                        </label>
                        <input
                          type="text"
                          value={row.reason}
                          onChange={(e) => updateRow(item.id, { reason: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-1.5 text-sm dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Общая причина возврата (опционально)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm dark:text-white"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          {returnableItems.length > 0 && (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Оформление...' : 'Оформить возврат'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
