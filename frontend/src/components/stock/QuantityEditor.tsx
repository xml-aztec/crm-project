import React, { useState, useEffect, useRef } from 'react';
import { getApiErrorMessage, ApiValidationIssue } from '../../types/apiError';
import { asApiError } from '../../types/apiError';
import { useUpdateStockMutation } from '../../store/api/stockApi';

interface QuantityEditorProps {
  stockId: number;
  currentQuantity: number;
  onUpdate: (newQuantity: number) => void;
  className?: string;
  disabled?: boolean;
}

const QuantityEditor: React.FC<QuantityEditorProps> = ({
  stockId,
  currentQuantity,
  onUpdate,
  className = '',
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentQuantity.toString());
  const [error, setError] = useState<string | null>(null);
  const [updateStock, { isLoading }] = useUpdateStockMutation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Синхронизируем локальное состояние с пропсами
  useEffect(() => {
    setValue(currentQuantity.toString());
    setError(null);
  }, [currentQuantity]);

  // Фокусируемся на инпуте при начале редактирования
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const validateInput = (inputValue: string): { isValid: boolean; errorMessage?: string } => {
    const numValue = parseInt(inputValue);
    
    if (inputValue.trim() === '') {
      return { isValid: false, errorMessage: 'Введите количество' };
    }
    
    if (isNaN(numValue)) {
      return { isValid: false, errorMessage: 'Некорректное число' };
    }
    
    if (numValue < 0) {
      return { isValid: false, errorMessage: 'Количество не может быть отрицательным' };
    }
    
    if (numValue > 999999) {
      return { isValid: false, errorMessage: 'Слишком большое количество' };
    }
    
    return { isValid: true };
  };

  const handleSave = async () => {
    const validation = validateInput(value);
    
    if (!validation.isValid) {
      setError(validation.errorMessage || 'Ошибка валидации');
      return;
    }

    const newQuantity = parseInt(value);
    
    // Если значение не изменилось, просто выходим из режима редактирования
    if (newQuantity === currentQuantity) {
      setIsEditing(false);
      setError(null);
      return;
    }

    try {
      await updateStock({ 
        id: stockId, 
        data: { quantity: newQuantity } 
      }).unwrap();
      
      onUpdate(newQuantity);
      setIsEditing(false);
      setError(null);
    } catch (rawError) {
      const error = asApiError(rawError);
      console.error('Ошибка обновления количества:', error);
      
      // Обработка различных типов ошибок
      if (error?.status === 422 && error?.data?.detail) {
        if (Array.isArray(error?.data?.detail)) {
          const quantityError = (error?.data?.detail as ApiValidationIssue[]).find((err) => 
            err.loc && err.loc.includes('quantity')
          );
          setError(quantityError?.msg || 'Ошибка валидации');
        } else {
          setError(getApiErrorMessage(error, 'Произошла ошибка'));
        }
      } else if (error?.status === 404) {
        setError('Остаток не найден');
      } else if (error?.status === 403) {
        setError('Недостаточно прав');
      } else {
        setError('Ошибка сохранения');
      }
      
      // Возвращаем предыдущее значение
      setValue(currentQuantity.toString());
    }
  };

  const handleCancel = () => {
    setValue(currentQuantity.toString());
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Небольшая задержка, чтобы позволить кликам на кнопки сработать
    setTimeout(() => {
      if (isEditing) {
        handleSave();
      }
    }, 150);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Очищаем ошибку при вводе
    if (error) {
      setError(null);
    }
  };

  // Режим редактирования
  if (isEditing) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              ref={inputRef}
              type="number"
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className={`w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                error 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-blue-300'
              }`}
              min="0"
              max="999999"
              disabled={isLoading}
              placeholder="0"
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
          </div>
          
          {/* Кнопки сохранения и отмены */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
              title="Сохранить"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              title="Отменить"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Ошибка валидации */}
        {error && (
          <div className="absolute top-full left-0 mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded shadow-sm whitespace-nowrap z-10">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Режим просмотра
  return (
    <button
      onClick={() => !disabled && setIsEditing(true)}
      disabled={disabled}
      className={`inline-flex items-center px-2 py-1 text-sm font-medium rounded transition-colors ${
        disabled 
          ? 'text-gray-400 cursor-not-allowed' 
          : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
      } ${className}`}
      title={disabled ? 'Редактирование недоступно' : 'Нажмите для редактирования'}
    >
      <span className="font-mono">{currentQuantity}</span>
      {!disabled && (
        <svg className="ml-1 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )}
    </button>
  );
};

export default QuantityEditor;