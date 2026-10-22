import * as XLSX from 'xlsx';
import { Rental } from '../types';

export function parseBankDate(value: string | number): string {
  if (typeof value === 'number') {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 86400000).toISOString();
  }
  const russianDate = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  const date = russianDate ? new Date(`${russianDate[3]}-${russianDate[2]}-${russianDate[1]}T12:00:00Z`) : new Date(value);
  if (isNaN(date.getTime())) throw new Error(`Не удалось распознать дату платежа: ${value}`);
  return date.toISOString();
}

export interface ParsedBankTransaction {
  externalReference?: string;
  id: string;
  date: string;
  amount: number;
  payerName: string;
  purpose: string;
  matchedRentalId?: string | null;
  matchedRental?: Rental | null;
  status: 'MATCHED' | 'UNMATCHED' | 'ALREADY_PROCESSED';
  matchReason?: string;
  selected: boolean;
}

/**
 * Standard 1C / Client-Bank TXT parser (1С:Предприятие - Клиент Сбербанка / Т-Банка / Точки)
 */
export function parse1CTxtStatement(text: string): Array<{
  date: string;
  amount: number;
  payerName: string;
  purpose: string;
}> {
  const transactions: Array<{
    date: string;
    amount: number;
    payerName: string;
    purpose: string;
  }> = [];

  const lines = text.split(/\r?\n/);
  const ownAccounts = new Set(lines.filter((line) => line.trim().startsWith('РасчСчет=')).map((line) => line.split('=')[1].trim()));
  let inDoc = false;
  let docType = '';
  let currentDoc: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('СекцияДокумент=')) {
      inDoc = true;
      docType = trimmed.split('=')[1] || '';
      currentDoc = {};
      continue;
    }

    if (trimmed === 'КонецДокумента') {
      if (inDoc) {
        // Мы ищем входящие платежи (Платежное поручение или Банковский ордер входящий)
        const amountStr = currentDoc['Сумма'] || '0';
        const amount = parseFloat(amountStr.replace(',', '.'));

        const payerName =
          currentDoc['Плательщик1'] ||
          currentDoc['Плательщик'] ||
          currentDoc['ПлательщикРасчСчет'] ||
          '';

        const purpose =
          currentDoc['НазначениеПлатежа'] ||
          currentDoc['НазначениеПлатежа1'] ||
          '';

        const date = currentDoc['ДатаПоступило'] || currentDoc['Дата'] || new Date().toISOString();
        const isOutgoing = Boolean(currentDoc['ДатаСписано']) || (ownAccounts.size > 0 && ownAccounts.has(currentDoc['ПлательщикРасчСчет']) && !ownAccounts.has(currentDoc['ПолучательРасчСчет']));

        // Фильтруем только положительные входящие суммы
        if (amount > 0 && !isOutgoing) {
          transactions.push({
            date: parseBankDate(date),
            amount,
            payerName,
            purpose,
          });
        }
      }
      inDoc = false;
      currentDoc = {};
      continue;
    }

    if (inDoc && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      currentDoc[key] = val;
    }
  }

  return transactions;
}

/**
 * Excel / CSV Parser (.xlsx, .xls, .csv)
 */
export function parseExcelStatement(data: ArrayBuffer): Array<{
  date: string;
  amount: number;
  payerName: string;
  purpose: string;
}> {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const transactions: Array<{
    date: string;
    amount: number;
    payerName: string;
    purpose: string;
  }> = [];

  // Ищем заголовки колонок
  let dateCol = -1;
  let amountCol = -1;
  let payerCol = -1;
  let purposeCol = -1;

  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').toLowerCase();
      if (val.includes('дата') && dateCol === -1) dateCol = c;
      if ((val.includes('сумма') || val.includes('приход') || val.includes('поступлен')) && amountCol === -1) amountCol = c;
      if ((val.includes('плательщик') || val.includes('отправитель') || val.includes('контрагент') || val.includes('фио')) && payerCol === -1) payerCol = c;
      if ((val.includes('назначение') || val.includes('описание') || val.includes('комментарий') || val.includes('детали')) && purposeCol === -1) purposeCol = c;
    }

    if (dateCol !== -1 && amountCol !== -1) {
      // Нашли шапку, парсим строки ниже
      for (let i = r + 1; i < rows.length; i++) {
        const itemRow = rows[i];
        if (!itemRow || !itemRow[amountCol]) continue;

        const rawAmount = String(itemRow[amountCol]).replace(/[^0-9,.-]/g, '').replace(',', '.');
        const amount = parseFloat(rawAmount);

        if (!isNaN(amount) && amount > 0) {
          transactions.push({
            date: parseBankDate(itemRow[dateCol] || new Date().toISOString()),
            amount,
            payerName: payerCol !== -1 ? String(itemRow[payerCol] || '').trim() : '',
            purpose: purposeCol !== -1 ? String(itemRow[purposeCol] || '').trim() : '',
          });
        }
      }
      break;
    }
  }

  return transactions;
}

/**
 * Intelligent Matching Algorithm:
 * Matches transaction lines with active CRM rentals
 */
export function matchTransactionsWithRentals(
  rawTransactions: Array<{ date: string; amount: number; payerName: string; purpose: string }>,
  rentals: Rental[]
): ParsedBankTransaction[] {
  return rawTransactions.map((tx, idx) => {
    const id = `tx-parsed-${Date.now()}-${idx}`;
    const cleanPurpose = tx.purpose.toLowerCase();
    const cleanPayer = tx.payerName.toLowerCase();

    // 1. Поиск точного совпадения по номеру договора
    let matchedRental: Rental | undefined = undefined;
    let matchReason = '';

    // Ищем точное совпадение по номеру договора
    for (const r of rentals) {
      const cleanNum = r.rentalNumber.toLowerCase();
      // Например "INV-2026-0004" или просто "0004" или "№4"
      const shortNum = cleanNum.replace(/[^0-9]/g, '');

      if (cleanPurpose.includes(cleanNum)) {
        matchedRental = r;
        matchReason = `Найден точный номер договора ${r.rentalNumber} в назначении`;
        break;
      }

      if (shortNum && shortNum.length >= 2 && (cleanPurpose.includes(`договор ${shortNum}`) || cleanPurpose.includes(`№${shortNum}`) || cleanPurpose.includes(`дог ${shortNum}`))) {
        matchedRental = r;
        matchReason = `Номер договора ${r.rentalNumber} распознан в назначении платежа`;
        break;
      }
    }

    // 2. Если по номеру не найдено — ищем по ФИО курьера
    if (!matchedRental) {
      for (const r of rentals) {
        if (!r.client?.fullName) continue;
        const nameParts = r.client.fullName.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);

        const matchesName = nameParts.length > 0 && nameParts.some((part) => cleanPurpose.includes(part) || cleanPayer.includes(part));

        if (matchesName) {
          matchedRental = r;
          matchReason = `Курьер ${r.client.fullName} найден по ФИО в выписке`;
          break;
        }
      }
    }

    // 3. Проверка совпадения суммы с тарифом
    if (matchedRental) {
      const expectedAmount =
        matchedRental.type === 'RENT_TO_OWN'
          ? matchedRental.installmentPayment || 6000
          : matchedRental.tariff?.price || 6000;

      if (Math.abs(expectedAmount - tx.amount) < 50) {
        matchReason += ` (Сумма ${tx.amount} ₽ точно соответствует тарифу)`;
      }
    }

    const isMatched = Boolean(matchedRental);

    return {
      id,
      date: tx.date,
      amount: tx.amount,
      payerName: tx.payerName,
      purpose: tx.purpose,
      matchedRentalId: matchedRental?.id || null,
      matchedRental: matchedRental || null,
      status: isMatched ? 'MATCHED' : 'UNMATCHED',
      matchReason: matchReason || 'Договор не распознан автоматически (выберите вручную)',
      selected: isMatched,
    };
  });
}
