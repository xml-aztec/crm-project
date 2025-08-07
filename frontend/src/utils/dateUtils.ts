/**
 * Утилиты для работы с датами и временными зонами
 * Backend сохраняет время в UTC, frontend отображает в Бишкекском времени (UTC+6)
 */

const BISHKEK_OFFSET_HOURS = 6; // Кыргызстан: UTC+6 круглый год с 2016 года

/**
 * Конвертирует UTC дату в время Бишкека (+6 часов)
 */
export const utcToBishkek = (utcDate: Date): Date => {
  return new Date(utcDate.getTime() + (BISHKEK_OFFSET_HOURS * 60 * 60 * 1000));
};

/**
 * Получает текущее время в Бишкеке
 */
export const getNowInBishkek = (): Date => {
  const now = new Date();
  return utcToBishkek(now);
};

/**
 * Форматирует дату/время для отображения в локальной временной зоне Бишкека
 */
export const formatDateTime = (
  dateString: string | Date,
  options: {
    includeTime?: boolean;
    includeSeconds?: boolean;
    format?: 'short' | 'long' | 'medium';
  } = {}
): string => {
  const {
    includeTime = true,
    includeSeconds = false,
    format = 'short'
  } = options;

  try {
    const utcDate = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(utcDate.getTime())) {
      return 'Некорректная дата';
    }

    const bishkekDate = utcToBishkek(utcDate);

    const day = bishkekDate.getDate().toString().padStart(2, '0');
    const month = (bishkekDate.getMonth() + 1).toString().padStart(2, '0');
    const year = bishkekDate.getFullYear();
    
    let result = '';
    
    // ✅ Исправляем: убираем дублирование логики для 'long' формата
    if (format === 'long') {
      const monthNames = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
      ];
      result = `${parseInt(day)} ${monthNames[bishkekDate.getMonth()]} ${year}`;
    } else if (format === 'medium') {
      const monthNames = [
        'янв', 'фев', 'мар', 'апр', 'май', 'июн',
        'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
      ];
      result = `${parseInt(day)} ${monthNames[bishkekDate.getMonth()]} ${year}`;
    } else {
      // format === 'short'
      result = `${day}.${month}.${year}`;
    }
    
    if (includeTime) {
      const hours = bishkekDate.getHours().toString().padStart(2, '0');
      const minutes = bishkekDate.getMinutes().toString().padStart(2, '0');
      
      result += `, ${hours}:${minutes}`;
      
      if (includeSeconds) {
        const seconds = bishkekDate.getSeconds().toString().padStart(2, '0');
        result += `:${seconds}`;
      }
    }
    
    return result;
  } catch (error) {
    return 'Ошибка даты';
  }
};

/**
 * Форматирует только дату без времени
 */
export const formatDate = (dateString: string | Date): string => {
  return formatDateTime(dateString, { includeTime: false });
};

/**
 * Форматирует только время
 */
export const formatTime = (dateString: string | Date): string => {
  try {
    const utcDate = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(utcDate.getTime())) {
      return 'Некорректное время';
    }

    const localDate = utcToBishkek(utcDate);
    
    const hours = localDate.getHours().toString().padStart(2, '0');
    const minutes = localDate.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    return 'Ошибка времени';
  }
};

/**
 * Форматирует дату в длинном формате (Январь 2025)
 */
export const formatMonth = (monthString: string): string => {
  try {
    const date = new Date(monthString.includes('-01') ? monthString : `${monthString}-01`);
    
    if (isNaN(date.getTime())) {
      return 'Некорректный месяц';
    }

    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  } catch (error) {
    return 'Ошибка месяца';
  }
};

/**
 * Форматирует короткую дату (01.12.2025)
 */
export const formatShortDate = (dateString: string | Date): string => {
  try {
    const utcDate = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(utcDate.getTime())) {
      return 'Некорректная дата';
    }

    const localDate = utcToBishkek(utcDate);
    
    const day = localDate.getDate().toString().padStart(2, '0');
    const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
    const year = localDate.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch (error) {
    return 'Ошибка даты';
  }
};

/**
 * Проверяет, является ли дата сегодняшней в локальной временной зоне Бишкека
 */
export const isToday = (dateString: string | Date): boolean => {
  try {
    const utcDate = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    
    const dateInBishkek = utcToBishkek(utcDate);
    const todayInBishkek = utcToBishkek(now);
    
    return (
      dateInBishkek.getDate() === todayInBishkek.getDate() &&
      dateInBishkek.getMonth() === todayInBishkek.getMonth() &&
      dateInBishkek.getFullYear() === todayInBishkek.getFullYear()
    );
  } catch (error) {
    return false;
  }
};

/**
 * Относительное время (2 часа назад, вчера, и т.д.)
 */
export const getRelativeTime = (dateString: string | Date): string => {
  try {
    const utcDate = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const localDate = utcToBishkek(utcDate);
    const now = getNowInBishkek();
    
    const diffMs = now.getTime() - localDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'только что';
    if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return formatShortDate(utcDate);
  } catch (error) {
    return 'неизвестно';
  }
};

/**
 * Конвертирует локальное время Бишкека в UTC для отправки на сервер
 */
export const bishkekToUtc = (localDate: Date): Date => {
  return new Date(localDate.getTime() - (BISHKEK_OFFSET_HOURS * 60 * 60 * 1000));
};