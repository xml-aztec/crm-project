import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { 
  useGetProductsQuery,
  useGetBrandsQuery,
  Product,
  Brand
} from '../store/api/catalogApi';
import { useGetCustomersQuery, Customer } from '../store/api/customersApi';
import { useCreateOrderMutation } from '../store/api/ordersApi';
import { useGetPaymentMethodsQuery } from '../store/api/paymentMethodsApi';
import { useGetWarehousesQuery, Warehouse } from '../store/api/warehousesApi';
import Button from '../components/ui/button/Button';
import QuickCustomerForm from '../components/orders/QuickCustomerForm';
import { getNowInBishkek } from '../utils/dateUtils';

interface OrderItem {
  product_id: number;
  quantity: number;
  unit_price: number;   
  final_price: number;  
}

interface OrderData {
  customer_id: string;
  warehouse_id: string;
  items: OrderItem[];
  notes: string;
  delivery_address: string;
  delivery_date: string;
  payment_method_id: number | null;
  installment_months: number | null;
}

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [isQuickCustomerFormOpen, setIsQuickCustomerFormOpen] = useState(false);
  
  const [addressType, setAddressType] = useState<'customer' | 'new'>('customer');

  // API хуки для складов
  const { data: warehouses = [], isLoading: warehousesLoading } = useGetWarehousesQuery();
  
  // API hooks
  const { data: products = [] } = useGetProductsQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: customers = [], refetch: refetchCustomers } = useGetCustomersQuery();
  const { data: paymentMethods = [] } = useGetPaymentMethodsQuery();
  const [createOrder, { isLoading: isOrderLoading }] = useCreateOrderMutation();

  // States for steps
  const [orderData, setOrderData] = useState<OrderData>({
    customer_id: '',
    warehouse_id: '',
    items: [],
    notes: '',
    delivery_address: '',
    delivery_date: '',
    payment_method_id: null,
    installment_months: null
  });

  // ТИПИЗИРУЕМ: Фильтрация складов
  const filteredWarehouses = useMemo(() => {
    // Здесь можно добавить логику фильтрации по филиалу пользователя
    return warehouses;
  }, [warehouses]);

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchProduct.toLowerCase())) ||
                         (product.barcode && product.barcode.includes(searchProduct));
    
    const hasStock = product.available_quantity > 0;
    
    return matchesSearch && hasStock;
  });

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
  const handleInputChange = (field: keyof typeof orderData, value: any) => {
    setOrderData(prev => ({
      ...prev,
      [field]: value
    }));

    // Сбрасываем выбор адреса при смене клиента
    if (field === 'customer_id') {
      const customer = customers.find(c => c.id === parseInt(value));
      if (customer?.address) {
        setAddressType('customer');
        setOrderData(prev => ({
          ...prev,
          delivery_address: customer.address || ''
        }));
      } else {
        setAddressType('new');
        setOrderData(prev => ({
          ...prev,
          delivery_address: ''
        }));
      }
    }
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
              final_price: item.unit_price * quantity
            }
          : item
      )
    }));
  };

  const validateOrderData = () => {
    const errors: string[] = [];
    
    if (!orderData.customer_id || orderData.customer_id === '') {
      errors.push('Не выбран клиент');
    }
    
    if (!orderData.warehouse_id || orderData.warehouse_id === '') {
      errors.push('Не выбран склад');
    }
    
    if (orderData.items.length === 0) {
      errors.push('Не добавлены товары в заказ');
    }
    
    // Проверка рассрочки только если выбран способ оплаты
    if (orderData.payment_method_id) {
      const selectedMethod = paymentMethods.find(pm => pm.id === orderData.payment_method_id);
      if (selectedMethod && selectedMethod.max_months && selectedMethod.max_months > 0) {
        if (!orderData.installment_months || orderData.installment_months <= 0) {
          errors.push('Не указано количество месяцев рассрочки');
        }
        if (orderData.installment_months && orderData.installment_months > selectedMethod.max_months) {
          errors.push(`Максимальное количество месяцев рассрочки: ${selectedMethod.max_months}`);
        }
      }
    }
    
    // Проверяем товары
    orderData.items.forEach((item, index) => {
      if (item.quantity <= 0) {
        errors.push(`Товар ${index + 1}: некорректное количество`);
      }
      if (item.unit_price <= 0) {
        errors.push(`Товар ${index + 1}: некорректная цена за единицу`);
      }
      if (item.final_price <= 0) {
        errors.push(`Товар ${index + 1}: некорректная общая стоимость`);
      }
    });
    
    // Проверяем дату доставки
    if (orderData.delivery_date) {
      const deliveryDate = new Date(orderData.delivery_date);
      const today = getNowInBishkek();
      today.setHours(0, 0, 0, 0);
      
      if (deliveryDate < today) {
        errors.push('Дата доставки не может быть в прошлом');
      }
    }
    
    const total = calculateTotal();
    if (total <= 0) {
      errors.push('Общая сумма заказа должна быть больше 0');
    }
    
    return errors;
  };

  const updateOrderItemPrice = (productId: number, newPricePerUnit: number) => {
    setOrderData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.product_id === productId 
          ? { 
              ...item, 
              final_price: newPricePerUnit * item.quantity
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
    return orderData.items.reduce((total, item: OrderItem) => {
      return total + item.final_price;
    }, 0);
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep === 4) {
      // ✅ ДОБАВЛЯЕМ: Вызов handleSubmit на последнем шаге
      handleSubmit();
    } else if (currentStep < 4) {
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
        return orderData.customer_id !== '' && orderData.warehouse_id !== '';
      case 2:
        return orderData.items.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  // ✅ ИСПОЛЬЗУЕМ: handleSubmit в nextStep
  const handleSubmit = async () => {
    const validationErrors = validateOrderData();
    if (validationErrors.length > 0) {
      alert('Ошибки валидации:\n' + validationErrors.join('\n'));
      return;
    }

    try {
      const orderPayload = {
        customer_id: parseInt(orderData.customer_id),
        warehouse_id: parseInt(orderData.warehouse_id),
        note: orderData.notes || undefined,
        payment_method_id: orderData.payment_method_id || undefined,
        installment_months: orderData.installment_months || undefined,
        delivery_address: orderData.delivery_address || undefined,
        delivery_date: orderData.delivery_date || undefined,
        total_price: calculateTotal(),
        items: orderData.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price.toString()),
          final_price: parseFloat(item.final_price.toString())
        }))
      };

      await createOrder(orderPayload).unwrap();
      
      navigate('/orders');
    } catch (error: any) {
      if (error?.status === 400) {
        alert(`Ошибка: ${error.data?.detail || 'Недостаточно товара на складе'}`);
        return;
      }
      
      if (error?.status === 422) {
        if (error.data?.detail) {
          let errorMessage = 'Ошибки валидации:\n';
          
          if (Array.isArray(error.data.detail)) {
            error.data.detail.forEach((err: any) => {
              if (err.loc && err.msg) {
                const field = err.loc.join(' → ');
                errorMessage += `• ${field}: ${err.msg}\n`;
              }
            });
          } else {
            errorMessage += error.data.detail;
          }
          
          alert(errorMessage);
        } else {
          alert('Ошибка валидации данных заказа. Проверьте заполненные поля.');
        }
      } else {
        alert('Ошибка при создании заказа. Попробуйте снова.');
      }
    }
  };

  const handleQuickCustomerSuccess = () => {
    setIsQuickCustomerFormOpen(false);
    refetchCustomers();
  };

  const selectedCustomer = customers.find(c => c.id === parseInt(orderData.customer_id));
  const selectedPaymentMethod = paymentMethods.find(pm => pm.id === orderData.payment_method_id);
  
  // ✅ ТИПИЗИРУЕМ: Выбранный склад
  const selectedWarehouse = warehouses.find((w: Warehouse) => w.id === parseInt(orderData.warehouse_id));

  // Добавляем обработку клавиш
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (currentStep === 1) {
        if (e.key === 'Escape' && searchCustomer) {
          setSearchCustomer('');
        }
        if (e.key === 'Enter' && filteredCustomers.length === 1) {
          handleInputChange('customer_id', filteredCustomers[0].id.toString());
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentStep, searchCustomer, filteredCustomers]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Создать заказ
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Шаг {currentStep} из 4
          </p>
        </div>
        <Button
          onClick={() => navigate('/orders')}
          variant="outline"
        >
          Отмена
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: 'Клиент', icon: '👤' },
            { step: 2, label: 'Товары', icon: '🛍️' },
            { step: 3, label: 'Доставка', icon: '🚚' },
            { step: 4, label: 'Подтверждение', icon: '✅' }
          ].map(({ step, label, icon }) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                ${currentStep >= step 
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                  : 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }
              `}>
                {currentStep > step ? '✓' : step}
              </div>
              <div className="ml-3 text-sm">
                <div className="font-medium text-gray-900 dark:text-white">{label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{icon}</div>
              </div>
              {step < 4 && (
                <div className={`
                  ml-6 w-16 h-1 rounded-full transition-all duration-300
                  ${currentStep > step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
                `}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        {/* Step 1 - Customer Selection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Выбор клиента */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Выберите клиента
                  </h3>
                  <Button
                    onClick={() => setIsQuickCustomerFormOpen(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Добавить клиента
                  </Button>
                </div>
                
                {/* Поиск клиента */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Поиск клиента по имени или телефону..."
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Список клиентов или сообщение о пустом поиске */}
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {searchCustomer ? 'Клиенты не найдены' : 'Нет клиентов'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {searchCustomer 
                        ? `По запросу "${searchCustomer}" ничего не найдено`
                        : 'Добавьте первого клиента для создания заказа'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Показываем количество найденных */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Найдено: {filteredCustomers.length} {filteredCustomers.length === 1 ? 'клиент' : filteredCustomers.length < 5 ? 'клиента' : 'клиентов'}
                      </p>
                      {searchCustomer && (
                        <button
                          onClick={() => setSearchCustomer('')}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Очистить поиск
                        </button>
                      )}
                    </div>
                    
                    {/* Упрощённая сетка клиентов */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {filteredCustomers.map((customer: Customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleInputChange('customer_id', customer.id.toString())}
                          className={`
                            relative p-4 border-2 rounded-lg cursor-pointer transition-colors
                            ${orderData.customer_id === customer.id.toString()
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                            }
                          `}
                        >
                          {/* Выбранный индикатор */}
                          {orderData.customer_id === customer.id.toString() && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {customer.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {customer.phone}
                            </p>
                            {customer.address && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                📍 {customer.address}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {customer.email && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  Email
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Выбор склада */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Выберите склад
                </h3>
                
                {warehousesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredWarehouses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      Нет доступных складов
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                    {/* ✅ ТИПИЗИРУЕМ: Параметр warehouse */}
                    {filteredWarehouses.map((warehouse: Warehouse) => (
                      <div
                        key={warehouse.id}
                        onClick={() => handleInputChange('warehouse_id', warehouse.id.toString())}
                        className={`
                          relative p-4 border-2 rounded-lg cursor-pointer transition-colors
                          ${orderData.warehouse_id === warehouse.id.toString()
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                          }
                        `}
                      >
                        {orderData.warehouse_id === warehouse.id.toString() && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}

                        <div className="pr-8">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {warehouse.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            📍 {warehouse.location}
                          </p>
                          {warehouse.branch_name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Филиал: {warehouse.branch_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 - Products Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Выберите товары
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Товаров в корзине: {orderData.items.length}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Products List */}
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      placeholder="Поиск по названию, SKU или штрихкоду..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                      <div className="flex flex-col h-full">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
                          {product.name}
                        </h4>
                        
                        {product.sku && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">
                            SKU: {product.sku}
                          </p>
                        )}
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getBrandName(product.brand_id)}
                        </p>
                        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          {product.price.toLocaleString()} сом
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs ${
                            product.available_quantity > 5 
                              ? 'text-green-600' 
                              : product.available_quantity > 0 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                          }`}>
                            {product.available_quantity > 0 
                              ? `✅ В наличии: ${product.available_quantity} шт.`
                              : '❌ Нет в наличии'
                            }
                          </p>
                        </div>
                        
                        <button
                          onClick={() => addOrderItem(product)}
                          disabled={product.available_quantity === 0}
                          className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          Добавить в корзину
                        </button>
                      </div>
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
                    return (
                      <div key={item.product_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                            {product?.name}
                          </h5>
                          <button
                            onClick={() => removeOrderItem(item.product_id)}
                            className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateOrderItem(item.product_id, item.quantity - 1)}
                              className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateOrderItem(item.product_id, item.quantity + 1)}
                              className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="text-right">
                            {/* ✅ ИСПОЛЬЗУЕМ updateOrderItemPrice для редактирования цены */}
                            <div className="flex items-center gap-1 mb-1">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  if (newPrice >= 0) {
                                    updateOrderItemPrice(item.product_id, newPrice);
                                  }
                                }}
                                className="w-16 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                                min="0"
                                step="0.01"
                              />
                              <span className="text-xs text-gray-500 dark:text-gray-400">сом/шт</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {item.final_price.toLocaleString()} сом
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-white">
                    <span>Итого:</span>
                    <span>{calculateTotal().toLocaleString()} сом</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Delivery Information */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Информация о доставке и оплате
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Адрес доставки
                </label>
                
                {/* Выбор типа адреса если у клиента есть адрес */}
                {selectedCustomer?.address && (
                  <div className="mb-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="addressType"
                          value="customer"
                          checked={addressType === 'customer'}
                          onChange={() => {
                            setAddressType('customer');
                            handleInputChange('delivery_address', selectedCustomer.address || '');
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Адрес клиента
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="addressType"
                          value="new"
                          checked={addressType === 'new'}
                          onChange={() => {
                            setAddressType('new');
                            handleInputChange('delivery_address', '');
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Указать новый адрес
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Показываем адрес клиента если выбран */}
                {selectedCustomer?.address && addressType === 'customer' && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Адрес клиента:
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {selectedCustomer.address}
                    </p>
                  </div>
                )}

                {/* Поле ввода адреса */}
                {(!selectedCustomer?.address || addressType === 'new') && (
                  <textarea
                    value={orderData.delivery_address}
                    onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Введите адрес доставки..."
                  />
                )}

                {/* Если нет адреса у клиента, показываем подсказку */}
                {!selectedCustomer?.address && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    У данного клиента не указан адрес в профиле
                  </p>
                )}
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
                Способ оплаты
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="no-payment"
                    name="payment_method"
                    checked={orderData.payment_method_id === null}
                    onChange={() => {
                      handleInputChange('payment_method_id', null);
                      handleInputChange('installment_months', null);
                    }}
                    className="mr-3"
                  />
                  <label htmlFor="no-payment" className="text-sm text-gray-700 dark:text-gray-300">
                    Без указания способа оплаты
                  </label>
                </div>
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center">
                    <input
                      type="radio"
                      id={`payment-${method.id}`}
                      name="payment_method"
                      checked={orderData.payment_method_id === method.id}
                      onChange={() => {
                        handleInputChange('payment_method_id', method.id);
                        // Сбрасываем рассрочку при смене способа оплаты
                        handleInputChange('installment_months', null);
                      }}
                      className="mr-3"
                    />
                    <label htmlFor={`payment-${method.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                      {method.name}
                      {method.max_months && method.max_months > 0 && (
                        <span className="text-xs text-gray-500 ml-2">
                          (рассрочка до {method.max_months} мес.)
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {selectedPaymentMethod?.max_months && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Количество месяцев <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={orderData.installment_months || ''}
                    onChange={(e) => handleInputChange('installment_months', e.target.value ? parseInt(e.target.value) : null)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      !orderData.installment_months 
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Выберите количество месяцев</option>
                    {Array.from({ length: selectedPaymentMethod.max_months }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {month} {month === 1 ? 'месяц' : month < 5 ? 'месяца' : 'месяцев'}
                      </option>
                    ))}
                  </select>
                  {!orderData.installment_months && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Обязательно выберите количество месяцев для рассрочки
                    </p>
                  )}
                </div>

                {/* Добавляем расчет рассрочки */}
                {orderData.installment_months && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Расчет рассрочки
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-800 dark:text-blue-200">Общая сумма:</span>
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {calculateTotal().toLocaleString()} сом
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-800 dark:text-blue-200">Ежемесячный платеж:</span>
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {Math.round(calculateTotal() / orderData.installment_months).toLocaleString()} сом
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-700 dark:text-blue-300">Срок:</span>
                        <span className="text-blue-700 dark:text-blue-300">
                          {orderData.installment_months} {orderData.installment_months === 1 ? 'месяц' : orderData.installment_months < 5 ? 'месяца' : 'месяцев'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
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

        {/* Step 4 - Order Summary */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Подтверждение заказа
            </h3>
            
            {/* ✅ ДОБАВЛЯЕМ: Информационное сообщение */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Важная информация о подтверждении заказа
                  </h4>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <p><strong>После создания заказа:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Заказ будет создан в статусе "Новый"</li>
                      <li>Товары пока НЕ будут списаны со склада</li>
                      <li>Заказ можно будет редактировать и изменять</li>
                    </ul>
                    
                    <p className="mt-3"><strong>Для списания товаров необходимо:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Подтвердить заказ через кнопку "Подтвердить"</li>
                      <li>После подтверждения товары спишутся автоматически</li>
                      <li>Сумма заказа зафиксируется</li>
                      <li>Редактирование станет недоступным</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Информация о клиенте
                </h4>
                {selectedCustomer && (
                  <div className="space-y-1 text-gray-900 dark:text-gray-100">
                    <p><strong>Имя:</strong> {selectedCustomer.name}</p>
                    <p><strong>Телефон:</strong> {selectedCustomer.phone}</p>
                    {selectedCustomer.email && (
                      <p><strong>Email:</strong> {selectedCustomer.email}</p>
                    )}
                  </div>
                )}
                
                {/* ✅ ДОБАВЛЯЕМ: Информация о складе */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Информация о складе
                  </h4>
                  {selectedWarehouse && (
                    <div className="space-y-1 text-gray-900 dark:text-gray-100">
                      <p><strong>Склад:</strong> {selectedWarehouse.name}</p>
                      <p><strong>Адрес:</strong> {selectedWarehouse.location}</p>
                      {selectedWarehouse.branch_name && (
                        <p><strong>Филиал:</strong> {selectedWarehouse.branch_name}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Info */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Доставка и оплата
                </h4>
                <div className="space-y-1 text-gray-900 dark:text-gray-100"> {/* Исправляем цвет текста */}
                  <p><strong>Адрес:</strong> {orderData.delivery_address || 'Не указан'}</p>
                  {selectedCustomer?.address && addressType === 'customer' && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      (Адрес из профиля клиента)
                    </p>
                  )}
                  <p><strong>Дата:</strong> {orderData.delivery_date || 'Не указана'}</p>
                  <p><strong>Оплата:</strong> {
                    orderData.payment_method_id === null ? 'Не указано' :
                    selectedPaymentMethod?.name
                  }</p>
                  {orderData.installment_months && selectedPaymentMethod && (
                    <>
                      <p><strong>Рассрочка:</strong> {orderData.installment_months} мес.</p>
                      <p><strong>Ежемесячно:</strong> {Math.round(calculateTotal() / orderData.installment_months).toLocaleString()} сом</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Товары в заказе
              </h4>
              <div className="space-y-2">
                {orderData.items.map((item: OrderItem) => {
                  const product = products.find(p => p.id === item.product_id);
                  return (
                    <div key={item.product_id} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {product?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity} шт. × {item.unit_price.toLocaleString()} сом
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.final_price.toLocaleString()} сом
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center text-xl font-bold text-gray-900 dark:text-white">
                  <span>Общая сумма:</span>
                  <span>{calculateTotal().toLocaleString()} сом</span>
                </div>
              </div>
            </div>

            {/* ✅ ИСПРАВЛЯЕМ: Правильное закрытие блока с примечаниями */}
            {orderData.notes && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Примечания
                </h4>
                <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {orderData.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between">
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/orders')}
            variant="outline"
          >
            Отмена
          </Button>
          <Button
            onClick={prevStep}
            variant="outline"
            disabled={currentStep === 1}
          >
            Назад
          </Button>
        </div>
        <Button
          onClick={nextStep}
          disabled={!canProceedToNextStep() || isOrderLoading}
        >
          {currentStep === 4 ? 'Подтвердить заказ' : 'Далее'}
        </Button>
      </div>

      {/* ✅ ИСПРАВЛЯЕМ: Модальное окно для быстрого добавления клиента */}
      <QuickCustomerForm 
        isOpen={isQuickCustomerFormOpen}
        onSuccess={handleQuickCustomerSuccess} 
        onClose={() => setIsQuickCustomerFormOpen(false)} 
      />
    </div>
  );
}