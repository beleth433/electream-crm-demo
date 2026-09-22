/**
 * Утилиты для умной автонумерации и управления префиксами
 */

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Рассчитывает следующий свободный порядковый номер с заданным префиксом.
 * Например:
 *   existing = ['EV-001', 'EV-015'], prefix = 'EV-' -> 'EV-016'
 *   existing = ['EV-001'], prefix = 'ВЕЛ-' -> 'ВЕЛ-001'
 */
export function getNextSequentialNumber(
  existingNumbers: (string | null | undefined)[],
  prefix: string,
  minDigits: number = 3
): string {
  const cleanPrefix = prefix.trim();
  if (!cleanPrefix) {
    return '001';
  }

  const regex = new RegExp(`^${escapeRegex(cleanPrefix)}(\\d+)$`, 'i');
  let maxNumber = 0;
  let maxDigits = minDigits;

  for (const item of existingNumbers) {
    if (!item) continue;
    const match = item.trim().match(regex);
    if (match) {
      const numStr = match[1];
      const numVal = parseInt(numStr, 10);
      if (!isNaN(numVal)) {
        if (numVal > maxNumber) {
          maxNumber = numVal;
        }
        if (numStr.length > maxDigits) {
          maxDigits = numStr.length;
        }
      }
    }
  }

  const nextNumber = maxNumber + 1;
  // Если число превысило текущее количество разрядов (например 999 -> 1000), разрядность автоматически увеличится
  const paddedNumber = String(nextNumber).padStart(maxDigits, '0');
  return `${cleanPrefix}${paddedNumber}`;
}

/**
 * Чтение сохраненного префикса из localStorage
 */
export function getStoredPrefix(key: string, fallback: string): string {
  try {
    const val = localStorage.getItem(`prefix_${key}`);
    return val && val.trim() ? val.trim() : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Сохранение префикса в localStorage
 */
export function setStoredPrefix(key: string, prefix: string): void {
  try {
    if (prefix.trim()) {
      localStorage.setItem(`prefix_${key}`, prefix.trim());
    }
  } catch {
    // Ignore storage quota / restricted mode errors
  }
}
