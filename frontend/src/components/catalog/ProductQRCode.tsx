import React, { useState } from 'react';
import { 
  useGetProductQRCodeQuery, 
  useDownloadProductQRCodeMutation 
} from '../../store/api/catalogApi';

interface ProductQRCodeProps {
  productId: number;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductQRCode({ productId, productName, isOpen, onClose }: ProductQRCodeProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const { 
    data: qrCodeBlob, 
    isLoading: isLoadingQR, 
    error: qrError 
  } = useGetProductQRCodeQuery(productId, {
    skip: !isOpen,
  });

  const [downloadQRCode] = useDownloadProductQRCodeMutation();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await downloadQRCode(productId).unwrap();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-product-${productId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch {
      // Обработка ошибки без логирования
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 999999 }}
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md"
        style={{ zIndex: 999999 }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              QR-код товара
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              style={{ zIndex: 1000000 }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Product Info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              {productName}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID товара: {productId}
            </p>
          </div>

          {/* QR Code Display */}
          <div className="mb-6">
            {isLoadingQR ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Загрузка QR-кода...</p>
              </div>
            ) : qrError ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 dark:text-red-400 text-center">
                  Ошибка загрузки QR-кода
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                  Возможно, QR-код не был сгенерирован для этого товара
                </p>
              </div>
            ) : qrCodeBlob ? (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg shadow-inner">
                  <img 
                    src={URL.createObjectURL(qrCodeBlob)} 
                    alt={`QR-код для товара ${productName}`}
                    className="max-w-full h-auto"
                    style={{ maxWidth: '200px' }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  QR-код недоступен
                </p>
              </div>
            )}
          </div>

          {/* Action Button - только скачивание */}
          {qrCodeBlob && !qrError && (
            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Скачивание...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Скачать QR-код
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}