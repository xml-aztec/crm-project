import React from 'react';

const FeatureCard = ({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
    <div className="flex justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm">
      {description}
    </p>
  </div>
);

const Notifications: React.FC = () => {
  const plannedFeatures = [
    {
      icon: (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 4H4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      title: "Настройки уведомлений",
      description: "Персональные настройки для каждого пользователя - email, push, SMS уведомления"
    },
    {
      icon: (
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      title: "Уведомления о заказах",
      description: "Автоматические уведомления при создании, изменении статуса или отмене заказов"
    },
    {
      icon: (
        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0l-2-2m0 0l-2 2" />
        </svg>
      ),
      title: "Уведомления о складе",
      description: "Оповещения о низких остатках товаров, новых поставках и движении товаров"
    },
    {
      icon: (
        <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      title: "Финансовые уведомления",
      description: "Напоминания о платежах, просроченных задолженностях и финансовых операциях"
    },
    {
      icon: (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      title: "Системные уведомления",
      description: "Оповещения о системных событиях, ошибках и важных изменениях в системе"
    },
    {
      icon: (
        <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Напоминания и задачи",
      description: "Настройка автоматических напоминаний о важных задачах и событиях"
    }
  ];

  const notificationTypes = [
    {
      type: "Email уведомления",
      description: "Отправка уведомлений на электронную почту",
      features: ["Мгновенные уведомления", "Ежедневные сводки", "Еженедельные отчеты"]
    },
    {
      type: "Push уведомления",
      description: "Мгновенные уведомления в браузере и мобильном приложении",
      features: ["Уведомления в реальном времени", "Звуковые сигналы", "Бейджи с количеством"]
    },
    {
      type: "SMS уведомления",
      description: "Критические уведомления через SMS",
      features: ["Аварийные оповещения", "Двухфакторная аутентификация", "Критические события"]
    },
    {
      type: "Внутренние уведомления",
      description: "Уведомления внутри системы",
      features: ["Центр уведомлений", "История уведомлений", "Метки прочтения"]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Система уведомлений
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Комплексная система уведомлений для своевременного информирования о важных событиях в системе. 
          Настройте персональные предпочтения и получайте актуальную информацию удобным способом.
        </p>
      </div>

      {/* Status */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
        <div className="flex justify-center mb-4">
          <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 4H4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Система уведомлений в разработке
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Работаем над созданием современной и гибкой системы уведомлений для улучшения пользовательского опыта
        </p>
      </div>

      {/* Типы уведомлений */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
          Планируемые типы уведомлений
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notificationTypes.map((type, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {type.type}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {type.description}
              </p>
              <ul className="space-y-2">
                {type.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Планируемые возможности */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
          Функциональные возможности
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plannedFeatures.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>

      {/* Дорожная карта разработки */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
          Этапы разработки системы уведомлений
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Анализ требований</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Определение типов уведомлений и каналов доставки</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Проектирование архитектуры</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Создание системы обработки и доставки уведомлений</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Базовая функциональность</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Внутренние уведомления и email рассылка</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">4</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Push уведомления</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Реализация браузерных push уведомлений</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">5</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">SMS интеграция</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Подключение SMS провайдеров для критических уведомлений</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">6</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Персональные настройки</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Индивидуальные настройки частоты и типов уведомлений</p>
            </div>
          </div>
        </div>
      </div>

      {/* Превью интерфейса */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
          Превью настроек уведомлений
        </h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Email уведомления</span>
              <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Push уведомления</span>
              <div className="w-12 h-6 bg-blue-500 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">SMS уведомления</span>
              <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Макет интерфейса настроек
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;