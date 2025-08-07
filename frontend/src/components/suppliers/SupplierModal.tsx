import React from 'react';
import SupplierForm from './SupplierForm';
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '../../store/api/suppliersApi';

interface SupplierModalProps {
  isOpen: boolean;
  supplier?: Supplier;
  isLoading?: boolean;
  onSubmit: (data: CreateSupplierRequest | UpdateSupplierRequest) => void;
  onCancel: () => void;
}

const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  supplier,
  isLoading,
  onSubmit,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onCancel}
        />
        
        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[100000]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {supplier ? 'Редактировать поставщика' : 'Добавить поставщика'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <SupplierForm
              supplier={supplier}
              isLoading={isLoading}
              onSubmit={onSubmit}
              onCancel={onCancel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierModal;