/**
 * Утилиты для продакшн окружения
 */

// Отключаем все console.log в продакшене
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  console.warn = () => {}; // Также отключаем warn в продакшене
}

// Сохраняем только критичные логи
export const logger = {
  error: (message: string, error?: any) => {
    if (import.meta.env.DEV) {
      console.error(message, error);
    }
    // В продакшене можно отправлять в сервис мониторинга
    // sendToErrorTracking(message, error);
  },
  
  warn: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.warn(message, data);
    }
  },
  
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.info(message, data);
    }
  },

  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.debug(message, data);
    }
  }
};

// Функция для обработки критичных ошибок
export const handleCriticalError = (error: Error, context?: string) => {
  logger.error(`Critical error${context ? ` in ${context}` : ''}:`, error);
  
  // В продакшене можно показать пользователю дружелюбное сообщение
  if (import.meta.env.PROD) {
    // showUserFriendlyError();
  }
};

// Функция для валидации окружения
export const validateEnvironment = () => {
  const requiredEnvVars = ['VITE_API_URL'];
  
  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }
  }
};

// Error boundary для React компонентов
export class ErrorBoundary extends Error {
  constructor(message: string, public context?: string) {
    super(message);
    this.name = 'ErrorBoundary';
  }
}

// Глобальный обработчик неотловленных ошибок
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('Unhandled error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection:', event.reason);
  });
}