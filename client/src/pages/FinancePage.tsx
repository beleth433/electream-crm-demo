import { useCrmRefresh } from '../hooks/useCrmRefresh';
import React, { useState, useEffect } from 'react';
import { Payment, PaymentType, PaymentMethod, FinanceSettings, ExpenseItem, Rental, User, Client } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { BankStatementImportModal } from '../components/BankStatementImportModal';
import {
  Banknote,
  TrendingUp,
  CreditCard,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  Filter,
  Building2,
  SlidersHorizontal,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Smartphone,
  Phone,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface FinancePageProps {
  currentUser?: User | null;
}

export const FinancePage: React.FC<FinancePageProps> = ({ currentUser }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [paymentRentalId, setPaymentRentalId] = useState('');
  const [paymentClientId, setPaymentClientId] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [settings, setSettings] = useState<FinanceSettings>({
    monthlyFixedExpenses: 0,
    fixedExpensesDescription: 'Аренда сервисного хаба и накладные расходы',
    paymentDetails: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Bank statement import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Manual payment modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    type: 'RENTAL' as PaymentType,
    amount: 1000,
    method: 'CASH' as PaymentMethod,
    description: '',
  });

  // Edit payment modal
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    type: 'RENTAL' as PaymentType,
    amount: 1000,
    method: 'CASH' as PaymentMethod,
    description: '',
    createdAt: '',
  });

  // Dynamic expense items modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);

  const handleOpenSettingsModal = () => {
    const initialItems: ExpenseItem[] =
      settings.fixedExpenseItems && settings.fixedExpenseItems.length > 0
        ? settings.fixedExpenseItems.map((item) => ({ ...item }))
        : settings.monthlyFixedExpenses > 0
        ? [
            {
              id: 'exp-1',
              name: settings.fixedExpensesDescription || 'Аренда сервисного хаба',
              amount: settings.monthlyFixedExpenses,
            },
          ]
        : [];
    setExpenseItems(initialItems);
    setIsSettingsModalOpen(true);
  };

  const handleAddExpenseItem = () => {
    setExpenseItems((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}-${prev.length + 1}`,
        name: '',
        amount: 0,
      },
    ]);
  };

  const handleUpdateExpenseItem = (id: string, field: 'name' | 'amount', value: any) => {
    setExpenseItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: field === 'amount' ? Math.max(0, Number(value) || 0) : value,
          };
        }
        return item;
      })
    );
  };

  const handleDeleteExpenseItem = (id: string) => {
    setExpenseItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalMonthlyExpenses = expenseItems.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const loadData = (background = false) => {
    if (!background) setIsLoading(true);
    return Promise.all([
      api.getPayments({ type: typeFilter === 'ALL' ? undefined : typeFilter }),
      api.getFinanceSummary(),
      api.getFinanceSettings(),
      api.getRentals(),
      api.getClients(),
    ])
      .then(([payRes, sumRes, setRes, rentRes, clientRes]) => {
        setPayments(payRes);
        setSummary(sumRes);
        setRentals(rentRes);
        setClients(clientRes);
        if (setRes) {
          setSettings(setRes);
        }
      })
      .catch((err) => toast.error('Ошибка загрузки финансов: ' + err.message))
      .finally(() => { if (!background) setIsLoading(false); });
  };

  useCrmRefresh(loadData);

  useEffect(() => {
    loadData();
  }, [typeFilter]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPayment({
        ...paymentForm,
        amount: Number(paymentForm.amount),
        rentalId: paymentRentalId || undefined,
        clientId: paymentClientId || undefined,
      });
      toast.success('Платеж успешно зарегистрирован в кассе!');
      setIsAddModalOpen(false);
      setPaymentRentalId('');
      setPaymentClientId('');
      setPaymentForm({
        type: 'RENTAL',
        amount: 1000,
        method: 'CASH',
        description: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка проведения платежа');
    }
  };

  const handleOpenEditModal = (p: Payment) => {
    setEditingPayment(p);
    let localIso = '';
    try {
      const d = new Date(p.createdAt);
      if (!isNaN(d.getTime())) {
        const offset = d.getTimezoneOffset() * 60000;
        localIso = new Date(d.getTime() - offset).toISOString().slice(0, 16);
      }
    } catch {}

    setEditPaymentForm({
      type: p.type,
      amount: p.amount,
      method: p.method,
      description: p.description || '',
      createdAt: localIso,
    });
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      let isoDate: string | undefined;
      if (editPaymentForm.createdAt) {
        const parsed = new Date(editPaymentForm.createdAt);
        if (!isNaN(parsed.getTime())) {
          isoDate = parsed.toISOString();
        }
      }

      await api.updatePayment(editingPayment.id, {
        type: editPaymentForm.type,
        amount: Math.max(1, Number(editPaymentForm.amount) || 0),
        method: editPaymentForm.method,
        description: editPaymentForm.description.trim() || undefined,
        createdAt: isoDate,
      });

      toast.success('Запись в кассовом журнале успешно обновлена!');
      setEditingPayment(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления записи');
    }
  };

  const handleDeletePayment = async (p: Payment) => {
    const desc = p.description ? ` (${p.description})` : '';
    const confirmed = window.confirm(
      `Вы действительно хотите удалить эту операцию из кассы?\n\nСумма: ${p.amount.toLocaleString('ru-RU')} ₽\nТип: ${p.type}${desc}\n\nЭто действие обновит кассовый баланс и журнал операций.`
    );
    if (!confirmed) return;

    try {
      await api.deletePayment(p.id);
      toast.success('Операция удалена из журнала кассы');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления записи');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validItems = expenseItems
        .map((item) => ({
          ...item,
          name: item.name.trim() || 'Расход',
          amount: Math.max(0, Number(item.amount) || 0),
        }))
        .filter((item) => item.amount > 0 || item.name !== 'Расход');

      const updated = await api.updateFinanceSettings({
        fixedExpenseItems: validItems,
        monthlyFixedExpenses: validItems.reduce((sum, item) => sum + item.amount, 0),
        fixedExpensesDescription: validItems.map((i) => i.name).join(', '),
      });

      setSettings(updated);
      toast.success('Статьи постоянных расходов успешно сохранены!');
      setIsSettingsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения настроек');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Касса и финансы
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Журнал кассовых операций, учет аренды и ремонтов, постоянные расходы и чистая прибыль
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Bank Statement Upload Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-300 dark:border-sky-700/60 text-sky-800 dark:text-sky-300 text-xs font-bold rounded-xl shadow-xs transition-all"
            title="Загрузить выписку из банка (1С / Excel / CSV) для автоматического разноса платежей"
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">Импорт выписки</span>
          </button>


          {(!currentUser?.accessLevel || currentUser.accessLevel.canSeeProfits !== false) && (
            <button
              onClick={handleOpenSettingsModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-[#0c1511] hover:bg-slate-50 dark:hover:bg-[#121f19] border border-slate-200 dark:border-emerald-500/30 text-slate-700 dark:text-emerald-300 text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="truncate">Постоянные расходы</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">Внести операцию</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Revenue */}
          <div className="p-5 contour-card flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-emerald-400/80 uppercase">Общая выручка</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                +{summary.totalRevenue.toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-emerald-500/10 pt-2">
              <div className="flex justify-between">
                <span>Аренда байков:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{(summary.rentalPayments || 0).toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Выкуп техники:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">{(summary.buyoutPayments || 0).toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Ремонты СТО:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{(summary.repairPayments || 0).toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>

          {/* Card 2: Fixed Overhead */}
          {(() => {
            const canSeeProfits = !currentUser?.accessLevel || currentUser.accessLevel.canSeeProfits !== false;
            return (
              <div className="p-5 contour-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-emerald-400/80 uppercase">Постоянные расходы</span>
                    {canSeeProfits && (
                      <button
                        onClick={handleOpenSettingsModal}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        Настроить {summary.fixedExpenseItems?.length ? `(${summary.fixedExpenseItems.length})` : ''}
                      </button>
                    )}
                  </div>
                  {canSeeProfits ? (
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
                      {(summary.monthlyFixedExpenses ?? 0).toLocaleString('ru-RU')} ₽
                    </p>
                  ) : (
                    <div className="mt-2 text-xs font-bold text-amber-500 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>🔒 Скрыто (P&L доступ) — коммерческая тайна руководства</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-100 dark:border-emerald-500/10 pt-2 space-y-1">
                  {canSeeProfits ? (
                    summary.fixedExpenseItems && summary.fixedExpenseItems.length > 0 ? (
                      <div className="space-y-0.5 max-h-16 overflow-y-auto custom-scrollbar pr-1">
                        {summary.fixedExpenseItems.slice(0, 3).map((item: any) => (
                          <div key={item.id} className="flex justify-between text-[10px]">
                            <span className="truncate max-w-[130px] text-slate-600 dark:text-slate-400">{item.name}:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {item.amount.toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                        ))}
                        {summary.fixedExpenseItems.length > 3 && (
                          <p className="text-[9px] text-emerald-500 font-semibold">
                            + еще {summary.fixedExpenseItems.length - 3} статьи
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="truncate block" title={summary.fixedExpensesDescription || settings.fixedExpensesDescription}>
                        {summary.fixedExpensesDescription || settings.fixedExpensesDescription || 'Статьи не заданы (0 ₽)'}
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Доступ ограничен правами роли</span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Card 3: Net Margin */}
          {(() => {
            const canSeeProfits = !currentUser?.accessLevel || currentUser.accessLevel.canSeeProfits !== false;
            return (
              <div className="p-5 contour-card flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-emerald-400/80 uppercase">Чистая прибыль</span>
                  {canSeeProfits ? (
                    <p
                      className={`text-2xl font-black mt-1 ${
                        (summary.netMargin ?? 0) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-500'
                      }`}
                    >
                      {(summary.netMargin ?? 0) >= 0 ? '+' : ''}
                      {(summary.netMargin ?? 0).toLocaleString('ru-RU')} ₽
                    </p>
                  ) : (
                    <div className="mt-2 text-xs font-bold text-amber-500 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>🔒 Скрыто (P&L доступ) — коммерческая тайна руководства</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-100 dark:border-emerald-500/10 pt-2">
                  <span>{canSeeProfits ? 'За вычетом запчастей и фикс. расходов' : 'Доступ ограничен правами роли'}</span>
                </div>
              </div>
            );
          })()}

          {/* Card 4: Deposits */}
          <div className="p-5 contour-card flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-emerald-400/80 uppercase">Залоги на руках</span>
              <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
                {summary.activeDepositsHeld.toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-emerald-500/10 pt-2">
              <div className="flex justify-between">
                <span>Собрано:</span>
                <span className="text-emerald-500 font-semibold">+{summary.depositsCollected.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Возвращено:</span>
                <span className="text-rose-400 font-semibold">-{summary.depositsRefunded.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'ALL', label: 'Все операции' },
          { id: 'RENTAL', label: 'Оплата аренды' },
          { id: 'BUYOUT', label: 'Выкуп техники' },
          { id: 'PART_PURCHASE', label: 'Закупки (Снабжение)' },
          { id: 'RETAIL_SALE', label: 'Продажи магазина' },
          { id: 'SALARY_PAYMENT', label: 'Выплаты зарплат (ФОТ)' },
          { id: 'DEPOSIT', label: 'Внесение залога' },
          { id: 'DEPOSIT_REFUND', label: 'Возврат залога' },
          { id: 'REPAIR', label: 'Оплата ремонта СТО' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              typeFilter === tab.id
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                : 'bg-white dark:bg-[#0c1511] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-emerald-500/20 hover:bg-slate-50 dark:hover:bg-[#101d17]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions Table (Desktop) */}
      <div className="contour-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-[#08100c] text-slate-500 dark:text-emerald-400/80 border-b border-slate-200 dark:border-emerald-500/15">
              <tr>
                <th className="p-3.5 font-semibold">Дата и время</th>
                <th className="p-3.5 font-semibold">Тип операции</th>
                <th className="p-3.5 font-semibold">Назначение платежа / Примечание</th>
                <th className="p-3.5 font-semibold">Способ оплаты</th>
                <th className="p-3.5 font-semibold">Договор / Курьер</th>
                <th className="p-3.5 font-semibold text-right">Сумма</th>
                <th className="p-3.5 font-semibold text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p) => {
                const isExpense = p.type === 'DEPOSIT_REFUND' || p.type === 'SALARY_PAYMENT' || p.type === 'PART_PURCHASE';

                const typeLabels: Record<string, { label: string; color: string }> = {
                  RENTAL: { label: 'Аренда', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                  BUYOUT: { label: 'Выкуп техники', color: 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/30' },
                  PART_PURCHASE: { label: 'Закупка расходников', color: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20' },
                  RETAIL_SALE: { label: 'Магазин / Розница', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
                  SALARY_PAYMENT: { label: 'Зарплата / ФОТ', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
                  DEPOSIT: { label: 'Залог', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
                  DEPOSIT_REFUND: { label: 'Возврат залога', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                  REPAIR: { label: 'Ремонт СТО', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                  FINE: { label: 'Штраф', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
                  OUTFIT_SALE: { label: 'Экипировка', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
                };

                const typeInfo = typeLabels[p.type] || { label: p.type, color: 'bg-slate-100 dark:bg-slate-800 text-slate-400' };

                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="p-3.5 font-semibold">
                      <span className={`inline-block align-middle text-center leading-tight px-2 py-1 rounded-lg text-[10px] font-bold border ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-800 dark:text-slate-200">
                      {p.description || 'Платеж по договору'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {p.method}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {p.rental ? (
                        <div>
                          <span className="font-bold text-sky-600 dark:text-sky-400">
                            {p.rental.rentalNumber}
                          </span>
                          <p className="text-[10px] text-slate-400">{p.rental.clientName}</p>
                        </div>
                      ) : (p as any).order ? (
                        <div>
                          <span className="font-bold text-teal-600 dark:text-teal-400">
                            {(p as any).order.orderNumber}
                          </span>
                          <p className="text-[10px] text-slate-400">{(p as any).clientName || (p as any).order.customerName}</p>
                        </div>
                      ) : (p as any).repair ? (
                        <div>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {(p as any).repair.orderNumber}
                          </span>
                          <p className="text-[10px] text-slate-400">{(p as any).clientName || (p as any).repair.clientName}</p>
                        </div>
                      ) : (p as any).clientName ? (
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{(p as any).clientName}</p>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3.5 text-right font-black text-sm whitespace-nowrap">
                      <span
                        className={
                          isExpense
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {isExpense ? '-' : '+'}
                        {p.amount.toLocaleString('ru-RU')} ₽
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Редактировать запись"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(p)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Удалить запись из кассы"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Cards (Mobile) */}
      <div className="block md:hidden space-y-3">
        {payments.map((p) => {
          const isExpense = p.type === 'DEPOSIT_REFUND' || p.type === 'SALARY_PAYMENT' || p.type === 'PART_PURCHASE';

          const typeLabels: Record<string, { label: string; color: string }> = {
            RENTAL: { label: 'Аренда', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            BUYOUT: { label: 'Выкуп техники', color: 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/30' },
            PART_PURCHASE: { label: 'Закупка расходников', color: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20' },
            RETAIL_SALE: { label: 'Магазин / Розница', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
            SALARY_PAYMENT: { label: 'Зарплата / ФОТ', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
            DEPOSIT: { label: 'Залог', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
            DEPOSIT_REFUND: { label: 'Возврат залога', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            REPAIR: { label: 'Ремонт СТО', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            FINE: { label: 'Штраф', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
            OUTFIT_SALE: { label: 'Экипировка', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
          };

          const typeInfo = typeLabels[p.type] || { label: p.type, color: 'bg-slate-100 dark:bg-slate-800 text-slate-400' };

          return (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#0c1812] border border-slate-200 dark:border-emerald-500/15 space-y-3"
            >
              {/* Top row: Type badge & Amount */}
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-block text-center leading-tight px-2.5 py-1 rounded-lg text-xs font-bold border ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
                <span
                  className={`text-base font-black ${
                    isExpense
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isExpense ? '-' : '+'}
                  {p.amount.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium break-words">
                {p.description || 'Платеж по договору'}
              </p>

              {/* Details grid: Method, Date, Rental */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101d17]/80 text-xs border border-slate-100 dark:border-emerald-500/10">
                <div>
                  <span className="text-slate-400 text-[10px] block">Способ оплаты:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                    {p.method}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Дата:</span>
                  <span className="text-slate-600 dark:text-slate-400 text-xs">
                    {new Date(p.createdAt).toLocaleDateString('ru-RU')} {new Date(p.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {p.rental ? (
                  <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-emerald-500/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[10px]">Договор:</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400 text-xs">
                      {p.rental.rentalNumber} <span className="font-normal text-slate-400">({p.rental.clientName})</span>
                    </span>
                  </div>
                ) : (p as any).order ? (
                  <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-emerald-500/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[10px]">Чек магазина:</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400 text-xs">
                      {(p as any).order.orderNumber} <span className="font-normal text-slate-400">({(p as any).clientName || (p as any).order.customerName})</span>
                    </span>
                  </div>
                ) : (p as any).repair ? (
                  <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-emerald-500/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[10px]">Заказ-наряд СТО:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                      {(p as any).repair.orderNumber} <span className="font-normal text-slate-400">({(p as any).clientName || (p as any).repair.clientName})</span>
                    </span>
                  </div>
                ) : (p as any).clientName ? (
                  <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-emerald-500/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[10px]">Клиент:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      {(p as any).clientName}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(p)}
                  className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePayment(p)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add Payment */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ручная фиксация кассовой операции"
        subtitle="Проведение платежа в кассу"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePayment} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Тип операции *</label>
            <select
              value={paymentForm.type}
              onChange={(e) => { setPaymentForm({ ...paymentForm, type: e.target.value as any }); setPaymentRentalId(''); setPaymentClientId(''); }}
              className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-base sm:text-xs text-slate-900 dark:text-white"
            >
              <option value="RENTAL">Оплата аренды (RENTAL)</option>
              <option value="BUYOUT">Взнос по выкупу техники (BUYOUT)</option>
              <option value="PART_PURCHASE">Закупка расходников / склад (PART_PURCHASE)</option>
              <option value="DEPOSIT">Обеспечительный залог (DEPOSIT)</option>
              <option value="REPAIR">Оплата ремонта СТО (REPAIR)</option>
              <option value="OUTFIT_SALE">Продажа экипировки / аксессуара (OUTFIT_SALE)</option>
              <option value="FINE">Штраф за нарушение условий (FINE)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-slate-500 font-semibold">Клиент
              <select value={paymentClientId} onChange={(e) => { setPaymentClientId(e.target.value); setPaymentRentalId(''); }} className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-base sm:text-sm">
                <option value="">Без привязки к клиенту</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.fullName} · {client.phone}</option>)}
              </select>
            </label>
            {['RENTAL', 'BUYOUT', 'DEPOSIT', 'FINE'].includes(paymentForm.type) && <label className="block text-slate-500 font-semibold">Договор
              <select value={paymentRentalId} onChange={(e) => { const rental = rentals.find((r) => r.id === e.target.value); setPaymentRentalId(e.target.value); setPaymentClientId(rental?.clientId || ''); }} className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-base sm:text-sm">
                <option value="">Без привязки к договору</option>
                {rentals.filter((r) => !['CLOSED', 'BOUGHT_OUT'].includes(r.status) && (!paymentClientId || r.clientId === paymentClientId)).map((r) => <option key={r.id} value={r.id}>{r.rentalNumber} · {r.client?.fullName}</option>)}
              </select>
            </label>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Сумма (₽) *</label>
              <input
                required
                type="number"
                min="0.01"
                step="any"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-base sm:text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Способ оплаты *</label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-base sm:text-xs text-slate-900 dark:text-white"
              >
                <option value="CASH">Наличные в кассу</option>
                <option value="SBP">СБП / QR-код</option>
                <option value="CARD">Банковская карта</option>
                <option value="BANK_TRANSFER">Безналичный перевод</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Назначение / Комментарий *</label>
            <input
              required
              type="text"
              placeholder="Оплата аренды за неделю наличными в кассу"
              value={paymentForm.description}
              onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
              className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 h-11 border border-slate-200 dark:border-slate-700 font-semibold rounded-xl text-xs"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-sm text-xs transition-colors"
            >
              Провести платеж
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Payment */}
      <Modal
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        title="Редактирование операции"
        subtitle={editingPayment ? `ID: ${editingPayment.id} • ${editingPayment.description || editingPayment.type}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleUpdatePayment} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Тип операции *</label>
            <select
              value={editPaymentForm.type}
              onChange={(e) => setEditPaymentForm({ ...editPaymentForm, type: e.target.value as any })}
              className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-base sm:text-xs text-slate-900 dark:text-white"
            >
              <option value="RENTAL">Оплата аренды (RENTAL)</option>
              <option value="BUYOUT">Взнос по выкупу техники (BUYOUT)</option>
              <option value="PART_PURCHASE">Закупка расходников / склад (PART_PURCHASE)</option>
              <option value="DEPOSIT">Обеспечительный залог (DEPOSIT)</option>
              <option value="DEPOSIT_REFUND">Возврат залога (DEPOSIT_REFUND)</option>
              <option value="REPAIR">Оплата ремонта СТО (REPAIR)</option>
              <option value="OUTFIT_SALE">Продажа экипировки (OUTFIT_SALE)</option>
              <option value="RETAIL_SALE">Магазин / Розница (RETAIL_SALE)</option>
              <option value="SALARY_PAYMENT">Выплата зарплаты (SALARY_PAYMENT)</option>
              <option value="FINE">Штраф за нарушение (FINE)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Сумма (₽) *</label>
              <input
                required
                type="number"
                min="0.01"
                step="any"
                value={editPaymentForm.amount}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: Number(e.target.value) })}
                className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-base sm:text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Способ оплаты *</label>
              <select
                value={editPaymentForm.method}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, method: e.target.value as any })}
                className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-base sm:text-xs text-slate-900 dark:text-white"
              >
                <option value="CASH">Наличные в кассу</option>
                <option value="SBP">СБП / QR-код</option>
                <option value="CARD">Банковская карта (эквайринг)</option>
                <option value="BANK_TRANSFER">Безналичный перевод</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Дата и время операции</label>
            <input
              type="datetime-local"
              value={editPaymentForm.createdAt}
              onChange={(e) => setEditPaymentForm({ ...editPaymentForm, createdAt: e.target.value })}
              className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Назначение / Комментарий *</label>
            <input
              required
              type="text"
              placeholder="Описание платежа"
              value={editPaymentForm.description}
              onChange={(e) => setEditPaymentForm({ ...editPaymentForm, description: e.target.value })}
              className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (editingPayment) handleDeletePayment(editingPayment);
              }}
              className="px-4 py-2.5 h-11 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Удалить запись
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="px-4 py-2.5 h-11 border border-slate-200 dark:border-slate-700 font-semibold rounded-xl text-xs"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-sm text-xs transition-colors"
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Dynamic Settings for Monthly Fixed Expenses (Overhead items) */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Статьи постоянных расходов"
        subtitle="Аренда хаба, коммунальные платежи, связь, охрана и прочие затраты"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-emerald-950/20 border border-slate-200 dark:border-emerald-500/20 text-slate-600 dark:text-slate-300">
            <p className="leading-relaxed">
              Добавляйте статьи регулярных ежемесячных затрат вашего парка (аренда базы, электричество, интернет, охрана). 
              Система автоматически суммирует их и вычитает при расчете <strong>Чистой прибыли</strong> на Главном дашборде и в финансовом учете.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                Список ежемесячных статей ({expenseItems.length})
              </span>
              <button
                type="button"
                onClick={handleAddExpenseItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить статью</span>
              </button>
            </div>

            {expenseItems.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-2">
                <p className="text-slate-400 text-xs">
                  Статьи постоянных расходов пока не добавлены
                </p>
                <button
                  type="button"
                  onClick={handleAddExpenseItem}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Добавить первую статью расходов
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {expenseItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl"
                  >
                    <span className="text-[11px] font-bold text-slate-400 w-5 text-center">
                      {index + 1}.
                    </span>

                    <div className="flex-1">
                      <input
                        required
                        type="text"
                        placeholder="Например: Аренда помещения сервиса"
                        value={item.name}
                        onChange={(e) => handleUpdateExpenseItem(item.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                      />
                    </div>

                    <div className="w-36 flex items-center gap-1">
                      <input
                        required
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={item.amount === 0 ? '' : item.amount}
                        onChange={(e) => handleUpdateExpenseItem(item.id, 'amount', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-right text-xs"
                      />
                      <span className="text-slate-400 font-bold text-xs">₽</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteExpenseItem(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Удалить статью"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Running Total Bar */}
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-emerald-300">
              Итого постоянных расходов в месяц:
            </span>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {totalMonthlyExpenses.toLocaleString('ru-RU')}
              </span>
              <span className="text-xs font-bold text-emerald-500 ml-1">₽ / мес.</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-sm transition-all"
            >
              Сохранить статьи расходов
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Bank Statement Import */}
      <BankStatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        rentals={rentals}
        onSuccess={loadData}
      />


    </div>
  );
};

