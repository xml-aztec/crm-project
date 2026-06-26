import { useState, useEffect, useMemo, useRef } from 'react';
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
import { useGetWarehousesQuery, Warehouse } from '../store/api/warehouseApi';
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

const MAX_SUGGESTIONS = 8;

const formatDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CreateOrderPage() {
  const navigate = useNavigate();

  const [searchProduct, setSearchProduct] = useState('');
  const [productHighlight, setProductHighlight] = useState(0);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  const [searchCustomer, setSearchCustomer] = useState('');
  const [customerHighlight, setCustomerHighlight] = useState(0);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  const [isQuickCustomerFormOpen, setIsQuickCustomerFormOpen] = useState(false);
  // Текст в процессе редактирования кол-ва (позволяет временно очистить поле, не сбрасывая количество).
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [showDeliverySection, setShowDeliverySection] = useState(false);
  const [addressType, setAddressType] = useState<'customer' | 'new'>('customer');

  const productInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);

  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: products = [] } = useGetProductsQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: customers = [], refetch: refetchCustomers } = useGetCustomersQuery();
  const { data: paymentMethods = [] } = useGetPaymentMethodsQuery();
  const [createOrder, { isLoading: isOrderLoading }] = useCreateOrderMutation();

  const [orderData, setOrderData] = useState<OrderData>({
    customer_id: '',
    warehouse_id: '',
    items: [],
    notes: '',
    delivery_address: '',
    delivery_date: formatDateInputValue(getNowInBishkek()),
    payment_method_id: null,
    installment_months: null
  });

  // Один склад в системе — выбираем его автоматически, чтобы не заставлять кликать.
  useEffect(() => {
    if (warehouses.length === 1 && !orderData.warehouse_id) {
      setOrderData(prev => ({ ...prev, warehouse_id: warehouses[0].id.toString() }));
    }
  }, [warehouses, orderData.warehouse_id]);

  // Фокус на поиск клиента сразу при открытии страницы.
  useEffect(() => {
    customerInputRef.current?.focus();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchProduct.trim()) return [];
    const q = searchProduct.toLowerCase();
    return products
      .filter((product: Product) => {
        const matches =
          product.name.toLowerCase().includes(q) ||
          (product.sku && product.sku.toLowerCase().includes(q)) ||
          (product.barcode && product.barcode.includes(searchProduct));
        return matches && product.available_quantity > 0;
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [products, searchProduct]);

  const filteredCustomers = useMemo(() => {
    if (!searchCustomer.trim()) return [];
    const q = searchCustomer.toLowerCase();
    return customers
      .filter((customer: Customer) =>
        customer.name.toLowerCase().includes(q) ||
        (customer.phone && customer.phone.includes(searchCustomer))
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [customers, searchCustomer]);

  const getBrandName = (brandId: number) => {
    const brand = brands.find((b: Brand) => b.id === brandId);
    return brand?.name || 'Неизвестный бренд';
  };

  const handleInputChange = (field: keyof typeof orderData, value: any) => {
    setOrderData(prev => ({ ...prev, [field]: value }));
  };

  const selectCustomer = (customer: Customer) => {
    setOrderData(prev => ({
      ...prev,
      customer_id: customer.id.toString(),
      delivery_address: customer.address ? customer.address : prev.delivery_address
    }));
    setAddressType(customer.address ? 'customer' : 'new');
    setSearchCustomer('');
    setShowCustomerSuggestions(false);
    productInputRef.current?.focus();
  };

  const clearSelectedCustomer = () => {
    setOrderData(prev => ({ ...prev, customer_id: '' }));
    setSearchCustomer('');
    customerInputRef.current?.focus();
  };

  const addOrderItem = (product: Product) => {
    setOrderData(prev => {
      const existingItem = prev.items.find(item => item.product_id === product.id);
      if (existingItem) {
        return {
          ...prev,
          items: prev.items.map(item =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + 1, final_price: item.unit_price * (item.quantity + 1) }
              : item
          )
        };
      }
      return {
        ...prev,
        items: [...prev.items, {
          product_id: product.id,
          quantity: 1,
          unit_price: product.price,
          final_price: product.price
        }]
      };
    });
    setSearchProduct('');
    setProductHighlight(0);
    setShowProductSuggestions(false);
    productInputRef.current?.focus();
  };

  const updateOrderItem = (productId: number, quantity: number) => {
    // Удаление товара из корзины — только через крестик (removeOrderItem),
    // поэтому количество всегда не меньше 1, а не убирает позицию.
    const safeQuantity = Math.max(1, quantity);
    setOrderData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.product_id === productId
          ? { ...item, quantity: safeQuantity, final_price: item.unit_price * safeQuantity }
          : item
      )
    }));
  };

  const updateOrderItemPrice = (productId: number, newPricePerUnit: number) => {
    setOrderData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.product_id === productId
          ? { ...item, final_price: newPricePerUnit * item.quantity }
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
    return orderData.items.reduce((total, item: OrderItem) => total + item.final_price, 0);
  };

  const validateOrderData = () => {
    const errors: string[] = [];

    if (!orderData.customer_id) errors.push('Не выбран клиент');
    if (!orderData.warehouse_id) errors.push('Не выбран склад');
    if (orderData.items.length === 0) errors.push('Не добавлены товары в заказ');

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

    orderData.items.forEach((item, index) => {
      if (item.quantity <= 0) errors.push(`Товар ${index + 1}: некорректное количество`);
      if (item.unit_price <= 0) errors.push(`Товар ${index + 1}: некорректная цена за единицу`);
      if (item.final_price <= 0) errors.push(`Товар ${index + 1}: некорректная общая стоимость`);
    });

    if (orderData.delivery_date) {
      const deliveryDate = new Date(orderData.delivery_date);
      const today = getNowInBishkek();
      today.setHours(0, 0, 0, 0);
      if (deliveryDate < today) errors.push('Дата доставки не может быть в прошлом');
    }

    if (calculateTotal() <= 0) errors.push('Общая сумма заказа должна быть больше 0');

    return errors;
  };

  const canSubmit =
    orderData.customer_id !== '' &&
    orderData.warehouse_id !== '' &&
    orderData.items.length > 0 &&
    !isOrderLoading;

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

  const handleCustomerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredCustomers.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCustomerHighlight(prev => Math.min(prev + 1, filteredCustomers.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustomerHighlight(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const customer = filteredCustomers[customerHighlight] || filteredCustomers[0];
      if (customer) selectCustomer(customer);
    } else if (e.key === 'Escape') {
      setShowCustomerSuggestions(false);
    }
  };

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setProductHighlight(prev => Math.min(prev + 1, filteredProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setProductHighlight(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Приоритет — точное совпадение по штрихкоду/SKU (для сканера).
      const exactMatch = filteredProducts.find(
        p => p.barcode === searchProduct || p.sku === searchProduct
      );
      const product = exactMatch || filteredProducts[productHighlight] || filteredProducts[0];
      if (product) addOrderItem(product);
    } else if (e.key === 'Escape') {
      setShowProductSuggestions(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === parseInt(orderData.customer_id));
  const selectedPaymentMethod = paymentMethods.find(pm => pm.id === orderData.payment_method_id);
  const selectedWarehouse = warehouses.find((w: Warehouse) => w.id === parseInt(orderData.warehouse_id));

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Создать заказ
        </h1>
        <Button onClick={() => navigate('/orders')} variant="outline" size="sm">
          Отмена
        </Button>
      </div>

      {/* Клиент + склад */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Клиент */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Клиент
          </label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedCustomer.phone}</p>
              </div>
              <button
                onClick={clearSelectedCustomer}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                Изменить
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex gap-2">
                <input
                  ref={customerInputRef}
                  type="text"
                  value={searchCustomer}
                  onChange={(e) => {
                    setSearchCustomer(e.target.value);
                    setCustomerHighlight(0);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 100)}
                  onKeyDown={handleCustomerKeyDown}
                  placeholder="Имя или телефон клиента..."
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <Button
                  onClick={() => setIsQuickCustomerFormOpen(true)}
                  variant="outline"
                  size="md"
                  className="shrink-0"
                >
                  + Новый
                </Button>
              </div>

              {showCustomerSuggestions && searchCustomer && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                      Клиенты не найдены — можно создать нового
                    </div>
                  ) : (
                    filteredCustomers.map((customer: Customer, index) => (
                      <div
                        key={customer.id}
                        onMouseDown={() => selectCustomer(customer)}
                        onMouseEnter={() => setCustomerHighlight(index)}
                        className={`p-3 cursor-pointer ${
                          index === customerHighlight
                            ? 'bg-blue-50 dark:bg-blue-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{customer.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{customer.phone}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Склад */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Склад
          </label>
          <select
            value={orderData.warehouse_id}
            onChange={(e) => handleInputChange('warehouse_id', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Выберите склад...</option>
            {warehouses.map((warehouse: Warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}{warehouse.branch_name ? ` — ${warehouse.branch_name}` : ''}
              </option>
            ))}
          </select>
          {selectedWarehouse?.location && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">📍 {selectedWarehouse.location}</p>
          )}
        </div>
      </div>

      {/* Товары + корзина */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Поиск товара */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Добавить товар
            </label>
            <div className="relative">
              <input
                ref={productInputRef}
                type="text"
                value={searchProduct}
                onChange={(e) => {
                  setSearchProduct(e.target.value);
                  setProductHighlight(0);
                  setShowProductSuggestions(true);
                }}
                onFocus={() => setShowProductSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProductSuggestions(false), 100)}
                onKeyDown={handleProductKeyDown}
                placeholder="Название, SKU или штрихкод — Enter добавляет в корзину"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              {showProductSuggestions && searchProduct && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                      Ничего не найдено или нет в наличии
                    </div>
                  ) : (
                    filteredProducts.map((product, index) => (
                      <div
                        key={product.id}
                        onMouseDown={() => addOrderItem(product)}
                        onMouseEnter={() => setProductHighlight(index)}
                        className={`flex items-center justify-between p-3 cursor-pointer ${
                          index === productHighlight
                            ? 'bg-blue-50 dark:bg-blue-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {getBrandName(product.brand_id)}
                            {product.sku ? ` · SKU: ${product.sku}` : ''}
                            {' · в наличии: '}{product.available_quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 shrink-0 ml-3">
                          {product.price.toLocaleString()} сом
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Совет: со сканером штрихкодов просто наводите курсор на это поле — сканирование само добавит товар.
            </p>
          </div>

          {/* Корзина */}
          <div className="lg:col-span-1">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Корзина {orderData.items.length > 0 && `(${orderData.items.length})`}
            </h4>
            {orderData.items.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
                Пока пусто — добавьте товар слева
              </p>
            ) : (
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

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateOrderItem(item.product_id, item.quantity - 1)}
                            className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center shrink-0"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            value={quantityDrafts[item.product_id] ?? item.quantity}
                            onChange={(e) => {
                              const rawValue = e.target.value;
                              setQuantityDrafts(prev => ({ ...prev, [item.product_id]: rawValue }));
                              const parsed = parseInt(rawValue, 10);
                              if (!isNaN(parsed) && parsed >= 1) {
                                updateOrderItem(item.product_id, parsed);
                              }
                            }}
                            onBlur={() => {
                              setQuantityDrafts(prev => {
                                const next = { ...prev };
                                delete next[item.product_id];
                                return next;
                              });
                            }}
                            className="w-12 px-1 py-0.5 text-sm font-medium text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="1"
                            step="1"
                          />
                          <button
                            onClick={() => updateOrderItem(item.product_id, item.quantity + 1)}
                            className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center shrink-0"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                if (newPrice >= 0) updateOrderItemPrice(item.product_id, newPrice);
                              }}
                              className="w-16 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
            )}
          </div>
        </div>
      </div>

      {/* Доставка и оплата — свёрнуто по умолчанию */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <button
          onClick={() => setShowDeliverySection(prev => !prev)}
          className="w-full flex items-center justify-between p-4 sm:px-6 text-left"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Доставка, оплата и примечания <span className="text-gray-400">(необязательно)</span>
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showDeliverySection ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDeliverySection && (
          <div className="p-4 sm:p-6 pt-0 space-y-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Адрес доставки
                </label>

                {selectedCustomer?.address && (
                  <div className="mb-3 flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="addressType"
                        checked={addressType === 'customer'}
                        onChange={() => {
                          setAddressType('customer');
                          handleInputChange('delivery_address', selectedCustomer.address || '');
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Адрес клиента</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="addressType"
                        checked={addressType === 'new'}
                        onChange={() => {
                          setAddressType('new');
                          handleInputChange('delivery_address', '');
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Новый адрес</span>
                    </label>
                  </div>
                )}

                {selectedCustomer?.address && addressType === 'customer' ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                    {selectedCustomer.address}
                  </div>
                ) : (
                  <textarea
                    value={orderData.delivery_address}
                    onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Введите адрес доставки..."
                  />
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
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  min={formatDateInputValue(getNowInBishkek())}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Способ оплаты
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    handleInputChange('payment_method_id', null);
                    handleInputChange('installment_months', null);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm border ${
                    orderData.payment_method_id === null
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Не указано
                </button>
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      handleInputChange('payment_method_id', method.id);
                      handleInputChange('installment_months', null);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      orderData.payment_method_id === method.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {method.name}
                    {method.max_months && method.max_months > 0 && (
                      <span className="text-xs text-gray-400 ml-1">(до {method.max_months} мес.)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {selectedPaymentMethod?.max_months && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Количество месяцев <span className="text-red-500">*</span>
                </label>
                <select
                  value={orderData.installment_months || ''}
                  onChange={(e) => handleInputChange('installment_months', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Выберите количество месяцев</option>
                  {Array.from({ length: selectedPaymentMethod.max_months }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month} мес.</option>
                  ))}
                </select>
                {orderData.installment_months && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Ежемесячный платёж: {Math.round(calculateTotal() / orderData.installment_months).toLocaleString()} сом
                  </p>
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
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Дополнительная информация о заказе..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer: сумма + submit */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:px-6 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Итого</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {calculateTotal().toLocaleString()} сом
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
          >
            {isOrderLoading ? 'Создание...' : 'Создать заказ'}
          </Button>
        </div>
      </div>

      <QuickCustomerForm
        isOpen={isQuickCustomerFormOpen}
        onSuccess={handleQuickCustomerSuccess}
        onClose={() => setIsQuickCustomerFormOpen(false)}
      />
    </div>
  );
}
