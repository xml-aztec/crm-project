import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Modal } from '../ui/modal';
import {
  useGlobalSearchQuery,
  CustomerSearchResult,
  OrderSearchResult,
  ProductSearchResult,
  EmployeeSearchResult,
  SupplierSearchResult,
} from '../../store/api/searchApi';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

interface GroupConfig {
  key: 'customers' | 'orders' | 'products' | 'employees' | 'suppliers';
  icon: string;
  label: string;
}

const GROUPS: GroupConfig[] = [
  { key: 'customers', icon: '🧑', label: 'Клиенты' },
  { key: 'orders', icon: '📦', label: 'Заказы' },
  { key: 'products', icon: '🛒', label: 'Товары' },
  { key: 'employees', icon: '👤', label: 'Сотрудники' },
  { key: 'suppliers', icon: '🚚', label: 'Поставщики' },
];

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  const shouldSearch = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const { data, isFetching } = useGlobalSearchQuery(debouncedQuery, { skip: !shouldSearch });

  const goTo = (path: string) => {
    navigate(path);
    onClose();
  };

  const showAllPath = (key: GroupConfig['key']): string => {
    const q = encodeURIComponent(debouncedQuery);
    switch (key) {
      case 'customers': return `/customers?customer_search=${q}`;
      case 'orders': return `/orders?search=${q}`;
      case 'products': return `/products?search=${q}`;
      case 'employees': return `/users?user_search=${q}`;
      case 'suppliers': return `/suppliers?supplier_search=${q}`;
    }
  };

  const renderCustomer = (item: CustomerSearchResult) => (
    <button
      key={`customers-${item.id}`}
      onClick={() => goTo(`/customers?customer_search=${encodeURIComponent(item.name)}`)}
      className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      <span className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{item.phone || item.email || '—'}</span>
    </button>
  );

  const renderOrder = (item: OrderSearchResult) => (
    <button
      key={`orders-${item.id}`}
      onClick={() => goTo(`/orders/${item.id}`)}
      className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      <span className="text-sm font-medium text-gray-800 dark:text-white/90">Заказ #{item.id}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {item.customer_name || '—'} · {item.status_name || '—'}
      </span>
    </button>
  );

  const renderProduct = (item: ProductSearchResult) => (
    <button
      key={`products-${item.id}`}
      onClick={() => goTo(`/products?search=${encodeURIComponent(item.sku)}`)}
      className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      <span className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku}</span>
    </button>
  );

  const renderEmployee = (item: EmployeeSearchResult) => (
    <button
      key={`employees-${item.id}`}
      onClick={() => goTo(`/users?user_search=${encodeURIComponent(item.full_name || item.email)}`)}
      className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      <span className="text-sm font-medium text-gray-800 dark:text-white/90">{item.full_name || item.email}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{item.email}</span>
    </button>
  );

  const renderSupplier = (item: SupplierSearchResult) => (
    <button
      key={`suppliers-${item.id}`}
      onClick={() => goTo(`/suppliers?supplier_search=${encodeURIComponent(item.name)}`)}
      className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      <span className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{item.contact_person || '—'}</span>
    </button>
  );

  const RENDERERS: Record<GroupConfig['key'], (item: any) => React.ReactNode> = {
    customers: renderCustomer,
    orders: renderOrder,
    products: renderProduct,
    employees: renderEmployee,
    suppliers: renderSupplier,
  };

  const visibleGroups = GROUPS.filter((g) => data?.[g.key] && data[g.key]!.items.length > 0);
  const hasAnyResults = visibleGroups.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] m-4" isFullscreen={false}>
      <div className="flex max-h-[70vh] w-full max-w-[600px] flex-col rounded-2xl bg-white dark:bg-gray-900">
        <div className="border-b border-gray-100 p-4 dark:border-gray-700">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по клиентам, заказам, товарам, сотрудникам, поставщикам..."
            className="w-full border-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {!shouldSearch ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              Введите минимум {MIN_QUERY_LENGTH} символа для поиска
            </div>
          ) : isFetching ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              Поиск...
            </div>
          ) : !hasAnyResults ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              Ничего не найдено
            </div>
          ) : (
            visibleGroups.map((group) => {
              const groupData = data![group.key]!;
              return (
                <div key={group.key} className="py-2">
                  <div className="flex items-center gap-2 px-4 py-1">
                    <span>{group.icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {group.label}
                    </span>
                  </div>
                  {groupData.items.map((item) => RENDERERS[group.key](item))}
                  {groupData.total > groupData.items.length && (
                    <button
                      onClick={() => goTo(showAllPath(group.key))}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-brand-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      Показать все результаты ({groupData.total}) →
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
