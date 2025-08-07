export function generateSKU(productName: string): string {
  // Берем первые 3 символа названия, убираем пробелы и приводим к верхнему регистру
  const namePrefix = productName
    .replace(/\s+/g, '')
    .substring(0, 3)
    .toUpperCase();
  
  // Добавляем случайное число от 1000 до 9999
  const randomNumber = Math.floor(Math.random() * 9000) + 1000;
  
  return `${namePrefix}${randomNumber}`;
}