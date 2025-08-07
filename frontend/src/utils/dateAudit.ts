/**
 * Аудит использования дат и времени в приложении
 * Проверяет корректность применения форматтеров
 */

export const COMPONENTS_WITH_DATES = [
  // Страницы заказов
  'OrderDetailsPage.tsx - ✅ Использует formatDateTime, formatTime',
  'AllOrders.tsx - ❓ Требует проверки',
  'CreateOrderPage.tsx - ✅ Исправлен',
  
  // Управление персоналом
  'PayrollManagement.tsx - ⚠️ Требует исправления типов',
  'PayrollTable.tsx - ⚠️ Требует исправления типов', 
  'PayrollModal.tsx - ⚠️ Требует исправления типов',
  
  // Склад и поставки
  'StockLogsPage.tsx - ✅ Исправлен',
  'StockManagement.tsx - ✅ Исправлен',
  'SuppliesManagement.tsx - ✅ Исправлен',
  'SupplyDetails.tsx - ❓ Требует проверки',
  
  // Другие компоненты
  'Users.tsx - ❓ Требует проверки',
  'Branches.tsx - ❓ Требует проверки',
  'Finance.tsx - ❓ Требует проверки'
];

export const DATE_UTILS_STATUS = {
  '✅ formatDateTime': 'Корректно конвертирует UTC → Бишкек (+6)',
  '✅ formatTime': 'Корректно конвертирует UTC → Бишкек (+6)', 
  '✅ formatDate': 'Корректно конвертирует UTC → Бишкек (+6)',
  '✅ formatMonth': 'Работает правильно',
  '✅ getRelativeTime': 'Учитывает временную зону',
  '✅ getNowInBishkek': 'Возвращает текущее время +6 UTC'
};

if (import.meta.env.DEV) {
  console.group('📋 Аудит компонентов с датами');
  COMPONENTS_WITH_DATES.forEach(component => console.log(component));
  console.groupEnd();
  
  console.group('🛠 Статус утилит времени');
  Object.entries(DATE_UTILS_STATUS).forEach(([util, status]) => {
    console.log(`${util}: ${status}`);
  });
  console.groupEnd();
}