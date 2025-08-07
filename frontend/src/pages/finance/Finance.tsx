import React from 'react';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';

// Компонент карточки функции
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  isComingSoon?: boolean;
}> = ({ icon, title, description, isComingSoon = false }) => (
  <div className={`p-6 rounded-xl border text-center transition-all duration-200 ${
    isComingSoon 
      ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-75' 
      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg'
  }`}>
    <div className="flex justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
      {description}
    </p>
    {isComingSoon && (
      <div className="inline-flex items-center px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
        В разработке
      </div>
    )}
  </div>
);

const Finance: React.FC = () => {
  const plannedFeatures = [
    {
      icon: (
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      title: "Управление доходами",
      description: "Отслеживание всех поступлений от продаж и других источников дохода",
      isComingSoon: true
    },
    {
      icon: (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Учет расходов",
      description: "Контроль всех затрат компании: закупки, зарплата, аренда и прочие расходы",
      isComingSoon: true
    },
    {
      icon: (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Отчеты и аналитика",
      description: "Детальные финансовые отчеты, анализ прибыльности и прогнозирование",
      isComingSoon: true
    },
    {
      icon: (
        <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      title: "Платежи и рассрочки",
      description: "Управление платежами клиентов, контроль рассрочек и просроченных платежей",
      isComingSoon: true
    },
    {
      icon: (
        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "Бюджетирование",
      description: "Планирование и контроль бюджетов по категориям и периодам",
      isComingSoon: true
    },
    {
      icon: (
        <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Кассовые разрывы",
      description: "Прогнозирование кассовых разрывов и планирование денежных потоков компании",
      isComingSoon: true
    },
    {
      icon: (
        <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      title: "Цели продаж менеджеров",
      description: "Планирование и контроль KPI менеджеров по продажам с отслеживанием выполнения",
      isComingSoon: true
    },
    {
      icon: (
        <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Управление зарплатами",
      description: "Расчет и управление заработной платой сотрудников с учетом KPI и бонусов",
      isComingSoon: true
    }
  ];

  return (
    <>
      <PageBreadcrumb pageTitle="Финансы" />
      
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Заголовок модуля */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Финансовый модуль
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Комплексное решение для управления финансами вашего бизнеса. Модуль находится в активной разработке и скоро будет доступен.
          </p>
        </div>

        {/* Статус разработки */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Модуль в активной разработке
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Наша команда разработчиков работает над созданием мощного финансового модуля, который поможет вам эффективно управлять всеми финансовыми аспектами вашего бизнеса.
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
            <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            В процессе разработки
          </div>
        </div>

        {/* Планируемые функции */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Планируемые возможности
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {plannedFeatures.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                isComingSoon={feature.isComingSoon}
              />
            ))}
          </div>
        </div>

        {/* Дорожная карта разработки */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            Дорожная карта разработки
          </h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Анализ требований</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Изучение потребностей бизнеса и определение ключевых функций</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Проектирование архитектуры</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Создание технической архитектуры и дизайна системы</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Базовые настройки</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Создание основы для классификации финансовых операций</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">4</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Модуль бюджетирования</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Планирование и контроль бюджетов по категориям</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">5</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Прогнозирование кассовых разрывов</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Анализ и планирование денежных потоков компании</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">6</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Управление KPI менеджеров</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Система целей и контроля эффективности продаж</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">7</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Модуль зарплат</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Расчет заработной платы с учетом KPI и бонусов</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">8</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Разработка основных функций</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Создание модулей доходов, расходов и платежей</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">9</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Система отчетности</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Разработка инструментов для создания финансовых отчетов</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">10</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Интеграция с модулями</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Связь с модулями заказов, поставок и складского учета</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ожидаемые сроки */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
            Ожидаемые сроки разработки
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Этап 1: Анализ и проектирование
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Завершение анализа требований и проектирования архитектуры системы.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200">
                  Завершено
                </span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Этап 2: Разработка базовых функций
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Создание основных модулей для управления доходами, расходами и бюджетами.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200">
                  В процессе
                </span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Этап 3: Расширение функционала
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Добавление возможностей для прогнозирования, аналитики и управления KPI.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  Запланировано
                </span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Этап 4: Тестирование и отладка
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Проведение тестирования всех функций модуля и исправление выявленных ошибок.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  Запланировано
                </span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Этап 5: Запуск и обучение
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Запуск модуля в эксплуатацию и обучение пользователей работе с новым функционалом.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  Запланировано
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Finance;