import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithReauth } from './baseQuery';

/**
 * Единственный экземпляр RTK Query на всё приложение.
 *
 * Раньше слайсов было 31, каждый со своим createApi. Теги в RTK Query
 * действуют ТОЛЬКО внутри своего экземпляра, поэтому вся межслайсовая
 * инвалидация была холостой: returnsApi сбрасывал 'Order' и 'Stock', которые
 * живут в ordersApi и stockApi, а ordersApi сбрасывал 'Analytics', которого
 * в analyticsApi вообще не существовало. Данные на экранах оставались
 * устаревшими, и понять это по коду было невозможно — вызовы выглядели
 * совершенно правильными.
 *
 * Вторая причина объединения: 22 слайса из 31 создавали собственный
 * fetchBaseQuery вместо общего baseQueryWithReauth, то есть не выполняли
 * авто-выход при 401. Теперь baseQuery ровно один и общий для всех.
 *
 * Конкретные эндпоинты добавляются через injectEndpoints в файлах рядом —
 * имена файлов и экспортируемых хуков не менялись, чтобы не трогать
 * компоненты.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Analytics',
    'AppSettings',
    'Branch',
    'Brand',
    'Budget',
    'CashGap',
    'CashflowCategory',
    'CashflowEntry',
    'CashflowType',
    'Category',
    'CurrentUser',
    'Customer',
    'CustomerType',
    'KpiRule',
    'MonthlyTarget',
    'Notification',
    'NotificationPreference',
    'Order',
    'OrderStatus',
    'PaymentMethod',
    'Payroll',
    'PendingUsers',
    'Permission',
    'Position',
    'Positions',
    'Product',
    'RbacRole',
    'Return',
    'RoleUsers',
    'Roles',
    'Stock',
    'StockLog',
    'Subcategory',
    'Supplier',
    'Supply',
    'Task',
    'User',
    'UserRoles',
    'UserStats',
    'Users',
    'Warehouse',
  ],
  endpoints: () => ({}),
});
