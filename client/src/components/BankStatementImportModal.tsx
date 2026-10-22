import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Rental } from '../types';
import {
  ParsedBankTransaction,
  parse1CTxtStatement,
  parseExcelStatement,
  matchTransactionsWithRentals,
} from '../utils/bankStatementParser';
import { api } from '../services/api';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Coins,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface BankStatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rentals: Rental[];
  onSuccess: () => void;
}

export const BankStatementImportModal: React.FC<BankStatementImportModalProps> = ({
  isOpen,
  onClose,
  rentals,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [transactions, setTransactions] = useState<ParsedBankTransaction[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRentals = rentals.filter((r) => r.status !== 'CLOSED' && r.status !== 'BOUGHT_OUT');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const fileName = selectedFile.name.toLowerCase();
      let rawTxs: Array<{ date: string; amount: number; payerName: string; purpose: string }> = [];

      if (fileName.endsWith('.txt')) {
        const text = await selectedFile.text();
        rawTxs = parse1CTxtStatement(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        const buffer = await selectedFile.arrayBuffer();
        rawTxs = parseExcelStatement(buffer);
      } else {
        toast.error('Поддерживаются файлы банковских выписок: .txt (1C), .xlsx, .xls, .csv');
        setIsParsing(false);
        return;
      }

      if (rawTxs.length === 0) {
        toast.warning('В выписке не найдено входящих платежей или структура файла нестандартная.');
      } else {
        const matched = matchTransactionsWithRentals(rawTxs, rentals);
        setTransactions(matched);
        const matchedCount = matched.filter((t) => t.status === 'MATCHED').length;
        toast.success(`Найдено ${matched.length} платежей. Автоматически сопоставлено: ${matchedCount}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Ошибка чтения выписки: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleSelectRentalForTx = (txId: string, rentalId: string) => {
    const r = rentals.find((item) => item.id === rentalId);
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === txId) {
          return {
            ...t,
            matchedRentalId: rentalId || null,
            matchedRental: r || null,
            status: r ? 'MATCHED' : 'UNMATCHED',
            selected: Boolean(r),
            matchReason: r ? `Выбран вручную: ${r.rentalNumber} (${r.client?.fullName || 'Курьер'})` : 'Договор не выбран',
          };
        }
        return t;
      })
    );
  };

  const handleApplyPayments = async () => {
    const toProcess = transactions.filter((t) => t.selected && t.matchedRentalId);
    if (toProcess.length === 0) {
      toast.warning('Нет выбранных платежей с привязанным договором');
      return;
    }

    setIsApplying(true);
    let successCount = 0;
    const successfulIds = new Set<string>();

    for (const tx of toProcess) {
      try {
        const rental = rentals.find((r) => r.id === tx.matchedRentalId);
        if (!rental) continue;

        const isRentToOwn = rental.type === 'RENT_TO_OWN';
        const durationDays = rental.paymentIntervalDays || rental.tariff?.paymentIntervalDays || rental.tariff?.durationDays || 7;
        const signature = JSON.stringify([tx.date, tx.amount, tx.payerName, tx.purpose]);
        const ordinal = transactions.filter((entry) => JSON.stringify([entry.date, entry.amount, entry.payerName, entry.purpose]) === signature).findIndex((entry) => entry.id === tx.id);
        const bytes = new TextEncoder().encode(signature);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const reference = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');

        await api.renewRental(rental.id, {
          amount: tx.amount,
          durationDays,
          method: 'BANK_TRANSFER',
          createdAt: new Date(tx.date).toISOString(),
          externalReference: `bank:${reference}:${ordinal}`,
          notes: `Автоматический импорт из банковской выписки. Плательщик: ${tx.payerName || 'Не указан'}. Назначение: ${tx.purpose || ''}`,
        });

        successCount++;
        successfulIds.add(tx.id);
      } catch (err) {
        console.error('Ошибка проведения платежа:', err);
      }
    }

    setIsApplying(false);
    setTransactions((items) => items.filter((item) => !successfulIds.has(item.id)));
    if (successCount === toProcess.length) toast.success(`Успешно проведено ${successCount} платежей.`);
    else toast.warning(`Проведено ${successCount} из ${toProcess.length} платежей. Необработанные платежи остались в списке.`);
    onSuccess();
    if (successCount === toProcess.length) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Импорт банковской выписки"
      subtitle="Автоматический разнос платежей по договорам аренды и выкупа"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Upload Zone */}
        {transactions.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-emerald-500/30 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-2xl p-8 sm:p-12 text-center cursor-pointer bg-slate-50/50 dark:bg-emerald-950/10 hover:bg-slate-50 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-center justify-center space-y-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Нажмите для выбора файла выписки или перетащите его сюда
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Поддерживаются форматы выгрузок любого банка РФ: <strong>1С (.txt)</strong>, <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV</strong>
              </p>
            </div>
            <div className="flex items-center gap-4 pt-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-sky-500" /> Т-Банк (1C/Excel)
              </span>
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> СберБизнес / СберБанк
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-purple-500" /> Точка / Модуль / ВТБ
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with stats and actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#112219] border border-slate-200 dark:border-emerald-500/20">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    Файл: {file?.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                    {transactions.length} операций
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Выбрано к проведению: {transactions.filter((t) => t.selected && t.matchedRentalId).length} на сумму{' '}
                  {transactions
                    .filter((t) => t.selected && t.matchedRentalId)
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toLocaleString('ru-RU')}{' '}
                  ₽
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTransactions([]);
                    setFile(null);
                  }}
                  className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  Выбрать другой файл
                </button>
              </div>
            </div>

            {/* Transactions table */}
            <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((tx) => {
                const isMatched = tx.status === 'MATCHED';

                return (
                  <div
                    key={tx.id}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                      tx.selected
                        ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'bg-white dark:bg-slate-950 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={tx.selected}
                        disabled={!tx.matchedRentalId}
                        onChange={() => handleToggleSelect(tx.id)}
                        className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            +{tx.amount.toLocaleString('ru-RU')} ₽
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {tx.date}
                          </span>
                          {isMatched ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Сопоставлено
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-3 h-3" /> Требует выбора
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                          <strong>От:</strong> {tx.payerName || 'Частное лицо'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate italic">
                          <strong>Назначение:</strong> {tx.purpose || 'Без комментария'}
                        </p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {tx.matchReason}
                        </p>
                      </div>
                    </div>

                    {/* Contract selector */}
                    <div className="shrink-0 sm:w-64">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                        Договор аренды / выкупа
                      </label>
                      <select
                        value={tx.matchedRentalId || ''}
                        onChange={(e) => handleSelectRentalForTx(tx.id, e.target.value)}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      >
                        <option value="">-- Не выбрано --</option>
                        {activeRentals.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.rentalNumber} • {r.client?.fullName || 'Курьер'} (
                            {r.type === 'RENT_TO_OWN' ? 'Выкуп' : 'Аренда'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                При подтверждении в кассу будут занесены платежи и продлены соответствующие договоры курьеров.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={isApplying || transactions.filter((t) => t.selected && t.matchedRentalId).length === 0}
                  onClick={handleApplyPayments}
                  className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all"
                >
                  {isApplying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Разносим платежи...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      <span>Провести платежи ({transactions.filter((t) => t.selected && t.matchedRentalId).length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
