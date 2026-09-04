import React, { useState } from 'react';
import { getApiErrorMessage } from '../../types/apiError';
import { asApiError } from '../../types/apiError';
import { useConfirmOrderMutation } from '../../store/api/ordersApi';
import { Order } from '../../store/api/ordersApi';
import OrderConfirmationModal from './OrderConfirmationModal';

interface ConfirmationBadgeProps {
  order: Order;
  onConfirmationChange?: (order: Order) => void;
  size?: 'sm' | 'md';
  showDetails?: boolean; 
}

const CheckCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LoadingIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default function ConfirmationBadge({ 
  order, 
  onConfirmationChange, 
  size = 'md',
}: ConfirmationBadgeProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmOrder] = useConfirmOrderMutation();

  const isConfirmed = order.confirmed || false;
  
  const canConfirm = !isConfirmed && 
                     order.items && 
                     order.items.length > 0 && 
                     order.warehouse_id && 
                     order.warehouse_id > 0; 

  const handleToggleConfirmation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isUpdating) return;
    
    // Простые проверки без alert
    if (!isConfirmed) {
      if (!order.items || order.items.length === 0) {
        return; // Просто не открываем модальное окно
      }
      
      if (!order.warehouse_id || order.warehouse_id <= 0) {
        return; // Просто не открываем модальное окно
      }
    }

    // Открываем модальное окно для подтверждения
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    setIsUpdating(true);
    try {
      const result = await confirmOrder({
        id: order.id,
        confirmed: !isConfirmed
      }).unwrap();

      setIsModalOpen(false);
      
      if (onConfirmationChange) {
        onConfirmationChange(result);
      }
    } catch (rawError) {
      const error = asApiError(rawError);
      // Оставляем alert только для критических ошибок
      if (error?.status === 400) {
        if (getApiErrorMessage(error, 'Произошла ошибка')?.includes('insufficient')) {
          alert('Недостаточно товара на складе для подтверждения заказа');
        } else {
          alert(`Ошибка: ${getApiErrorMessage(error, 'Не удалось подтвердить заказ')}`);
        }
      } else if (error?.status === 422) {
        alert('Ошибка валидации данных заказа');
      } else {
        alert('Произошла ошибка. Попробуйте позже.');
      }
    } finally {
      setIsUpdating(false);
      setIsModalOpen(false);
    }
  };

  const handleCloseModal = () => {
    if (!isUpdating) {
      setIsModalOpen(false);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1'
  };

  if (isUpdating) {
    return (
      <span className={`inline-flex items-center rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 ${sizeClasses[size]}`}>
        <LoadingIcon />
        <span className="ml-1">...</span>
      </span>
    );
  }

  if (!canConfirm && !isConfirmed) {
    const issues = [];
    if (!order.items?.length) issues.push('нет товаров');
    if (!order.warehouse_id || order.warehouse_id <= 0) issues.push('не указан склад');
    
    return (
      <span 
        className={`inline-flex items-center rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 ${sizeClasses[size]}`}
        title={`Нельзя подтвердить: ${issues.join(', ')}`}
      >
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
        </svg>
        Нельзя подтвердить
      </span>
    );
  }

  return (
    <>
      <button
        onClick={handleToggleConfirmation}
        disabled={isUpdating}
        className={`
          inline-flex items-center rounded-full font-medium transition-all duration-200 cursor-pointer hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50
          ${isConfirmed 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' 
            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
          }
          ${sizeClasses[size]}
        `}
        title={isConfirmed ? 'Отменить подтверждение заказа' : 'Подтвердить заказ'}
      >
        {isConfirmed ? (
          <>
            <CheckCircleIcon />
            <span className="ml-1">Подтверждён</span>
          </>
        ) : (
          <>
            <XCircleIcon />
            <span className="ml-1">Не подтверждён</span>
          </>
        )}
      </button>

      {/* Модальное окно подтверждения */}
      <OrderConfirmationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        isLoading={isUpdating}
        orderId={order.id}
        isConfirmed={isConfirmed}
        orderItems={order.items?.map(item => ({
          product_name: item.product?.name,
          quantity: item.quantity
        })) || []}
      />
    </>
  );
}