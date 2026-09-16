import React, { useState, useEffect } from 'react';
import { Payment, PaymentType, PaymentMethod } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import {
  Banknote,
  TrendingUp,
  CreditCard,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

export const FinancePage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Manual payment modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    type: 'RENTAL' as PaymentType,
    amount: 1000,
    method: 'CASH' as PaymentMethod,
    description: '',
  });

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      api.getPayments({ type: typeFilter === 'ALL' ? undefined : typeFilter }),
      api.getFinanceSummary(),
    ])
      .then(([payRes, sumRes]) => {
        setPayments(payRes);
        setSummary(sumRes);
      })
      .catch((err) => toast.error('Ошибка загрузки финансов: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [typeFilter]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPayment({
        ...paymentForm,
        amount: Number(paymentForm.amount),
      });
      toast.success('Платеж успешно зарегистрирован в кассе!');
      setIsAddModalOpen(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Касса и финансы
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Журнал кассовых операций, приход за аренду и ремонт, учет возвратных залогов
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Внести операцию в кассу
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 contour-card">
            <span className="text-xs font-bold text-slate-500 dark:text-emerald-400/80 uppercase">Общая выручка</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              +{summary.totalRevenue.toLocaleString('ru-RU')} ₽
            </p>
            <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Аренда байков:</span>
                <span>{summary.rentalPayments.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Ремонты (вина курьера):</span>
                <span>{summary.repairPayments.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>

          <div className="p-5 contour-card">
            <span className="text-xs font-bold text-slate-500 dark:text-emerald-400/80 uppercase">Обеспечительные залоги (на руках)</span>
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
              {summary.activeDepositsHeld.toLocaleString('ru-RU')} ₽
            </p>
            <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Собрано залогов:</span>
                <span>+{summary.depositsCollected.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Возвращено залогов:</span>
                <span className="text-rose-400">-{summary.depositsRefunded.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>

          <div className="p-5 contour-card">
            <span className="text-xs font-bold text-slate-500 dark:text-emerald-400/80 uppercase">Чистый денежный поток</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {(summary.totalRevenue + summary.activeDepositsHeld).toLocaleString('ru-RU')} ₽
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              Суммарно фактически в кассе и на расчетных счетах точки
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'ALL', label: 'Все операции' },
          { id: 'RENTAL', label: 'Оплата аренды' },
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

      {/* Transactions Table */}
      <div className="contour-card overflow-hidden">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p) => {
                const isExpense = p.type === 'DEPOSIT_REFUND' || p.type === 'SALARY_PAYMENT';

                const typeLabels: Record<string, { label: string; color: string }> = {
                  RENTAL: { label: 'Аренда', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                  RETAIL_SALE: { label: 'Магазин (POS)', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeInfo.color}`}>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Payment */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ручная фиксация кассовой операции"
        subtitle="Проведение платежа в кассу"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePayment} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">Тип операции *</label>
            <select
              value={paymentForm.type}
              onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
            >
              <option value="RENTAL">Оплата аренды (RENTAL)</option>
              <option value="DEPOSIT">Обеспечительный залог (DEPOSIT)</option>
              <option value="REPAIR">Оплата ремонта СТО (REPAIR)</option>
              <option value="OUTFIT_SALE">Продажа экипировки / аксессуара (OUTFIT_SALE)</option>
              <option value="FINE">Штраф за нарушение условий (FINE)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Сумма (₽) *</label>
              <input
                required
                type="number"
                min="1"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Способ оплаты *</label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
              >
                <option value="CASH">Наличные</option>
                <option value="SBP">СБП / QR-код</option>
                <option value="CARD">Банковская карта</option>
                <option value="BANK_TRANSFER">Безналичный перевод</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Назначение / Комментарий *</label>
            <input
              required
              type="text"
              placeholder="Оплата аренды за неделю наличными в кассу"
              value={paymentForm.description}
              onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm"
            >
              Провести платеж
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
