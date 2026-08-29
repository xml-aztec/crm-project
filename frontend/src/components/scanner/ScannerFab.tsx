import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { usePermissions } from '../../hooks/usePermissions';
import ScannerModal from './ScannerModal';

export default function ScannerFab() {
  const { hasPermission } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);

  // AppLayout не размонтируется при переходах между страницами — закрываем
  // сканер вручную при смене маршрута, чтобы поток камеры не оставался висеть.
  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      setIsOpen(false);
    }
  }, [location.pathname]);

  if (!hasPermission('products.read')) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Сканировать товар"
        className="fixed bottom-6 right-6 z-[9998] h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7V5a2 2 0 012-2h2M4 17v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m-4 12h2a2 2 0 002-2v-2M7 8h.01M7 12h10M7 16h.01M12 8v8"
          />
        </svg>
      </button>
      <ScannerModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
