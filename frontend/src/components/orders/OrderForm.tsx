import { useState, useEffect } from 'react';
import type { Order } from '../../store/api/ordersApi';
import { calculateLineTotal, calculateOrderTotal } from '../../utils/orderPricing';
import { 
  useGetProductsQuery,
  useGetBrandsQuery,
  Product,
  Brand
} from '../../store/api/catalogApi';
import { useGetCustomersQuery, Customer } from '../../store/api/customersApi';
import { useGetWarehousesQuery } from '../../store/api/warehouseApi';
import { useCreateOrderMutation } from '../../store/api/ordersApi';
import Button from '../ui/button/Button';
import QuickCustomerForm from './QuickCustomerForm';

interface OrderItem {
  product_id: number;
  quantity: number;
  unit_price: number;   
  final_price: number;  
}

interface OrderFormProps {
  order?: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderForm({ order, isOpen, onClose, onSuccess }: OrderFormProps) {
  // API hooks
  const { data: products = [] } = useGetProductsQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: customers = [], refetch: refetchCustomers } = useGetCustomersQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery(); // Добавляем хук складов
  const [createOrder, { isLoading }] = useCreateOrderMutation();

  // States for steps
  const [currentStep, setCurrentStep] = useState(1);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [isQuickCustomerFormOpen, setIsQuickCustomerFormOpen] = useState(false);
  
  const [orderData, setOrderData] = useState({
    customer_id: '',
    warehouse_id: '', // Добавляем warehouse_id
    items: [] as OrderItem[],
    notes: '',
    delivery_address: '',
    delivery_date: '',
    payment_method: 'cash' as 'cash' | 'card' | 'transfer'
  });

  const isEditMode = !!order;

  // Filter functions
  const filteredProducts = products.filter((p: Product) => 
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) &&
    (p.available_quantity || 0) > 0 // Фильтруем только товары с остатками
  );

  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchCustomer))
  );

  // Helper functions
  const getBrandName = (brandId: number) => {
    const brand = brands.find((b: Brand) => b.id === brandId);
    return brand?.name || 'Неизвестный бренд';
  };

  // Order management functions
  const handleInputChange = <K extends keyof typeof orderData>(field: K, value: (typeof orderData)[K]) => {
    setOrderData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addOrderItem = (product: Product) => {
    const existingItem = orderData.items.find(item => item.product_id === product.id);
    
    if (existingItem) {
      updateOrderItem(product.id, existingItem.quantity + 1);
    } else {
      setOrderData(prev => ({
        ...prev,
        items: [...prev.items, {
          product_id: product.id,
          quantity: 1,
          unit_price: product.price,
          final_price: product.price
        }]
      }));
    }
  };

  const updateOrderItem = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeOrderItem(productId);
      return;
    }

    setOrderData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.product_id === productId
          ? { 
              ...item, 
              quantity,
              final_price: calculateLineTotal(item.unit_price, quantity)
            }
          : item
      )
    }));
  };

  const removeOrderItem = (productId: number) => {
    setOrderData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.product_id !== productId)
    }));
  };

  const calculateTotal = () => {
    return calculateOrderTotal(orderData.items);
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < 5) { // Увеличиваем до 5 шагов
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return orderData.customer_id !== '';
      case 2:
        return orderData.warehouse_id !== ''; // Проверяем выбор склада
      case 3:
        return orderData.items.length > 0;
      case 4:
        return true; // Delivery info is optional
      case 5:
        return true; // Ready to submit
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    try {
      // Исправляем структуру payload согласно CreateOrderRequest
      const orderPayload = {
        customer_id: parseInt(orderData.customer_id),
        warehouse_id: parseInt(orderData.warehouse_id), // Добавляем warehouse_id
        items: orderData.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          final_price: item.final_price
        })),
        notes: orderData.notes, // Используем notes вместо note
        delivery_address: orderData.delivery_address || undefined,
        delivery_date: orderData.delivery_date || undefined,
        total_price: calculateTotal() // Используем total_price вместо total_amount
      };

      await createOrder(orderPayload).unwrap();
      onSuccess();
      onClose();
      // Reset form
      setCurrentStep(1);
      setOrderData({
        customer_id: '',
        warehouse_id: '',
        items: [],
        notes: '',
        delivery_address: '',
        delivery_date: '',
        payment_method: 'cash'
      });
    } catch (error) {
      console.error('Ошибка при создании заказа:', error);
    }
  };

  const handleQuickCustomerSuccess = () => {
    setIsQuickCustomerFormOpen(false);
    refetchCustomers();
  };

  // Effect to handle modal state
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCustomer = customers.find(c => c.id === parseInt(orderData.customer_id));
  const selectedWarehouse = warehouses.find(w => w.id === parseInt(orderData.warehouse_id));

  const stepLabels = ['Клиент', 'Склад', 'Товары', 'Доставка', 'Подтверждение'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg w-full sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {isEditMode ? 'Редактировать заказ' : 'Создать заказ'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Шаг {currentStep} из 5: {stepLabels[currentStep - 1]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 shrink-0">
          {/* Mobile: compact circles only */}
          <div className="flex sm:hidden items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                  ${currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>
                  {currentStep > step ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step}
                </div>
                {step < 5 && (
                  <div className={`w-6 h-0.5 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Desktop: full labels */}
          <div className="hidden sm:flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                  }
                `}>
                  {step}
                </div>
                <div className="ml-2 text-sm">
                  {stepLabels[step - 1]}
                </div>
                {step < 5 && (
                  <div className={`
                    ml-4 w-8 h-1
                    ${currentStep > step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
                  `}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Step 1 - Customer Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Выберите клиента
                </h3>
                <Button
                  onClick={() => setIsQuickCustomerFormOpen(true)}
                  variant="outline"
                  size="sm"
                >
                  Добавить клиента
                </Button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  placeholder="Поиск клиентов по имени или телефону..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer: Customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleInputChange('customer_id', customer.id.toString())}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${orderData.customer_id === customer.id.toString()
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {customer.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {customer.phone}
                    </p>
                    {customer.email && (
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {customer.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 - Warehouse Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Выберите склад
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.map((warehouse) => (
                  <div
                    key={warehouse.id}
                    onClick={() => handleInputChange('warehouse_id', warehouse.id.toString())}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${orderData.warehouse_id === warehouse.id.toString()
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {warehouse.name}
                    </h4>
                    {warehouse.location && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📍 {warehouse.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 - Products Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Выберите товары
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Товаров в корзине: {orderData.items.length}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Products List */}
                <div className="lg:col-span-2">
                  <div className="mb-4">
                    <input
                      type="text"
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      placeholder="Поиск товаров..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-h-64 sm:max-h-96 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">{product.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getBrandName(product.brand_id)}
                        </p>
                        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          {product.price.toLocaleString()} сом
                        </p>
                        <p className={`text-xs ${
                          (product.available_quantity || 0) > 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {(product.available_quantity || 0) > 0 
                            ? `В наличии: ${product.available_quantity} шт.` 
                            : 'Нет в наличии'
                          }
                        </p>
                        <button
                          onClick={() => addOrderItem(product)}
                          disabled={(product.available_quantity || 0) === 0}
                          className="mt-2 w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Добавить
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cart */}
                <div className="lg:col-span-1">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Корзина</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {orderData.items.map((item: OrderItem) => {
                      const product = products.find(p => p.id === item.product_id);
                      if (!product) return null;

                      return (
                        <div key={item.product_id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </p>
                            <button
                              onClick={() => removeOrderItem(item.product_id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateOrderItem(item.product_id, item.quantity - 1)}
                                className="w-6 h-6 bg-red-100 text-red-600 rounded-full text-xs hover:bg-red-200"
                              >
                                -
                              </button>
                              <span className="text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateOrderItem(item.product_id, item.quantity + 1)}
                                className="w-6 h-6 bg-green-100 text-green-600 rounded-full text-xs hover:bg-green-200"
                              >
                                +
                              </button>
                            </div>
                            <p className="text-sm font-semibold">
                              {item.final_price.toLocaleString()} сом
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Итого:</span>
                      <span>{calculateTotal().toLocaleString()} сом</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 - Delivery Information */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Информация о доставке
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Адрес доставки
                  </label>
                  <textarea
                    value={orderData.delivery_address}
                    onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Введите адрес доставки..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Дата доставки
                  </label>
                  <input
                    type="date"
                    value={orderData.delivery_date}
                    onChange={(e) => handleInputChange('delivery_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Примечания к заказу
                </label>
                <textarea
                  value={orderData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Дополнительная информация о заказе..."
                />
              </div>
            </div>
          )}

          {/* Step 5 - Order Summary */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Подтверждение заказа
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Информация о клиенте
                  </h4>
                  {selectedCustomer && (
                    <div className="space-y-1">
                      <p><strong>Имя:</strong> {selectedCustomer.name}</p>
                      <p><strong>Телефон:</strong> {selectedCustomer.phone}</p>
                      {selectedCustomer.email && (
                        <p><strong>Email:</strong> {selectedCustomer.email}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Warehouse Info */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Информация о складе
                  </h4>
                  {selectedWarehouse && (
                    <div className="space-y-1">
                      <p><strong>Склад:</strong> {selectedWarehouse.name}</p>
                      {selectedWarehouse.location && (
                        <p><strong>Адрес:</strong> {selectedWarehouse.location}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Info */}
              {(orderData.delivery_address || orderData.delivery_date) && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Информация о доставке
                  </h4>
                  <div className="space-y-1">
                    {orderData.delivery_address && (
                      <p><strong>Адрес:</strong> {orderData.delivery_address}</p>
                    )}
                    {orderData.delivery_date && (
                      <p><strong>Дата:</strong> {orderData.delivery_date}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Товары в заказе
                </h4>
                <div className="space-y-2">
                  {orderData.items.map((item: OrderItem) => {
                    const product = products.find(p => p.id === item.product_id);
                    if (!product) return null;

                    return (
                      <div key={item.product_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {product.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.unit_price.toLocaleString()} сом × {item.quantity} шт.
                          </p>
                        </div>
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {item.final_price.toLocaleString()} сом
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Общая сумма:</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {calculateTotal().toLocaleString()} сом
                    </span>
                  </div>
                </div>
              </div>

              {orderData.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Примечания
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {orderData.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              Отмена
            </Button>
            {currentStep > 1 && (
              <Button
                onClick={prevStep}
                variant="outline"
                size="sm"
              >
                Назад
              </Button>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3">
            {currentStep < 5 ? (
              <Button
                onClick={nextStep}
                disabled={!canProceedToNextStep()}
                size="sm"
              >
                Далее
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Создание...' : 'Создать заказ'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Customer Form */}
      {isQuickCustomerFormOpen && (
        <QuickCustomerForm
          isOpen={isQuickCustomerFormOpen}
          onClose={() => setIsQuickCustomerFormOpen(false)}
          onSuccess={handleQuickCustomerSuccess}
        />
      )}
    </div>
  );
}