import { useState } from 'react';
import { useGetCategoriesQuery, useGetSubcategoriesQuery } from '../../store/api/catalogApi';
import { Subcategory } from '../../types/catalog';

interface SubcategoryTreeProps {
  onEdit?: (subcategory: Subcategory) => void;
}

export default function SubcategoryTree({ onEdit }: SubcategoryTreeProps) {
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useGetSubcategoriesQuery();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (categoriesLoading || subcategoriesLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Загрузка дерева категорий...</p>;
  }

  if (categories.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Категории не найдены</p>;
  }

  return (
    <div className="space-y-2">
      {categories.map((category) => {
        const subs = subcategories.filter((s) => s.category_id === category.id);
        const isCollapsed = collapsed.has(category.id);
        return (
          <div key={category.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(category.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 text-left hover:bg-gray-100 dark:hover:bg-gray-900/60"
            >
              <span className="font-medium text-gray-800 dark:text-gray-100">{category.name}</span>
              <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {subs.length === 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">Нет подкатегорий</span>
                ) : (
                  `${subs.length} подкат.`
                )}
                <span className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>›</span>
              </span>
            </button>
            {!isCollapsed && subs.length > 0 && (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {subs.map((sub) => (
                  <li key={sub.id} className="px-6 py-2.5 flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{sub.name}</span>
                    <div className="flex items-center gap-2">
                      {!sub.is_active && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          неактивна
                        </span>
                      )}
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(sub)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                        >
                          Изменить
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
