import { useEffect } from 'react';
import Button from '../ui/button/Button';
import { ImportPreviewResult } from '../../store/api/catalogApi';

interface ImportPreviewModalProps {
  isOpen: boolean;
  result: ImportPreviewResult | null;
  isImporting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  create: { label: 'Создать', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  update: { label: 'Обновить', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  error: { label: 'Ошибка', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

export default function ImportPreviewModal({ isOpen, result, isImporting, onClose, onConfirm }: ImportPreviewModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !result) return null;

  const { rows, summary } = result;
  const canImport = summary.to_create + summary.to_update > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isImporting) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Превью импорта</h3>
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <span className="text-green-700 dark:text-green-400">Будет создано: <b>{summary.to_create}</b></span>
            <span className="text-blue-700 dark:text-blue-400">Будет обновлено: <b>{summary.to_update}</b></span>
            <span className="text-red-700 dark:text-red-400">Строк с ошибками: <b>{summary.errors}</b></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Файл не содержит строк с данными.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  <th className="pb-2 pr-4">Строка</th>
                  <th className="pb-2 pr-4">SKU</th>
                  <th className="pb-2 pr-4">Название</th>
                  <th className="pb-2 pr-4">Действие</th>
                  <th className="pb-2">Ошибки</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((row) => {
                  const action = ACTION_LABELS[row.action];
                  return (
                    <tr key={row.row} className={row.action === 'error' ? 'bg-red-50/60 dark:bg-red-900/10' : ''}>
                      <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 align-top">{row.row}</td>
                      <td className="py-2 pr-4 font-mono text-xs align-top">{row.sku || '—'}</td>
                      <td className="py-2 pr-4 align-top">{row.name || '—'}</td>
                      <td className="py-2 pr-4 align-top whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${action.className}`}>{action.label}</span>
                      </td>
                      <td className="py-2 text-red-600 dark:text-red-400 text-xs align-top">
                        {row.errors.length > 0 ? row.errors.join('; ') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isImporting} className="flex-1">
            Отмена
          </Button>
          <Button onClick={onConfirm} disabled={isImporting || !canImport} className="flex-1">
            {isImporting ? 'Импорт...' : `Подтвердить импорт (${summary.to_create + summary.to_update})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
