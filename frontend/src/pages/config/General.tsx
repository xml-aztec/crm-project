import React from 'react';

const General: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Общие настройки
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Управление общими настройками системы
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg 
              className="w-16 h-16 mx-auto" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Страница в разработке
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Настройки конфигурации будут добавлены в ближайшее время
          </p>
        </div>
      </div>
    </div>
  );
};

export default General;