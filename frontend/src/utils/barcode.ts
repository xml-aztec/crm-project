// Цифровые штрихкоды этих длин несут контрольную цифру GS1, проверяемую общим
// алгоритмом: EAN-8, UPC-A, EAN-13, ITF-14/GTIN-14.
const GS1_CHECKSUM_LENGTHS = new Set([8, 12, 13, 14]);

// Code 39 и Codabar кроме цифр могут содержать буквы и служебные символы.
// Сама контрольная сумма для них уже проверена сканером при считывании —
// здесь важна только допустимая форма кода.
const BARCODE_CHARS_RE = /^[A-Za-z0-9\-.$/+% ]+$/;

function gs1CheckDigitValid(digits: string): boolean {
  const body = digits.slice(0, -1);
  const checkDigit = Number(digits[digits.length - 1]);
  let total = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    total += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (total % 10)) % 10 === checkDigit;
}

/**
 * Принимает штрихкоды всех форматов, которые умеет распознавать сканер
 * (EAN-13, EAN-8, UPC-A/E, Code128, Code39, Code93, Codabar, ITF) —
 * зеркалит backend/app/utils/barcode_utils.py::validate_barcode.
 */
export function isValidBarcode(value: string): boolean {
  if (!value) return false;
  const code = value.trim();
  if (code.length < 3 || code.length > 48 || !BARCODE_CHARS_RE.test(code)) {
    return false;
  }
  const isDigitsOnly = /^\d+$/.test(code);
  if (isDigitsOnly && GS1_CHECKSUM_LENGTHS.has(code.length)) {
    return gs1CheckDigitValid(code);
  }
  return true;
}

export const BARCODE_FORMATS_HINT =
  'Опционально.';

export const BARCODE_VALIDATION_ERROR =
  'Недопустимый штрихкод. Поддерживаются EAN-13, EAN-8, UPC-A/E, Code128, Code39, Code93, Codabar, ITF';
