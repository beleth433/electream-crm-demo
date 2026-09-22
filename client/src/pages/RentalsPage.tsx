import React, { useState, useEffect } from 'react';
import { Rental, RentalStatus, Tariff } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Search,
  Filter,
  Plus,
  KeyRound,
  RotateCcw,
  Printer,
  Calendar,
  Phone,
  ArrowRight,
  Clock,
  CreditCard,
  Sliders,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface RentalsPageProps {
  onOpenCheckoutWizard: () => void;
  onOpenCloseModal: (rental: Rental) => void;
  onOpenPrintAct: (rental: Rental) => void;
}

export const RentalsPage: React.FC<RentalsPageProps> = ({
  onOpenCheckoutWizard,
  onOpenCloseModal,
  onOpenPrintAct,
}) => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Tariffs (Rental Templates) state
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [isTariffsModalOpen, setIsTariffsModalOpen] = useState(false);
  const [isTariffFormOpen, setIsTariffFormOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [tariffForm, setTariffForm] = useState({
    name: '',
    type: 'STANDARD' as 'STANDARD' | 'RENT_TO_OWN',
    durationDays: 7,
    price: 6000,
    depositRequired: 5000,
    isActive: true,
  });

  // Renewal modal state
  const [renewingRental, setRenewingRental] = useState<Rental | null>(null);
  const [renewalDays, setRenewalDays] = useState<number>(7);
  const [renewalAmount, setRenewalAmount] = useState<number>(6000);
  const [renewalMethod, setRenewalMethod] = useState<'CASH' | 'CARD' | 'SBP' | 'BANK_TRANSFER'>('CASH');

  const loadTariffs = () => {
    api
      .getRentalTariffs()
      .then(setTariffs)
      .catch((err) => console.error('Ошибка загрузки тарифов:', err));
  };

  const loadRentals = () => {
    setIsLoading(true);
    api
      .getRentals({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search,
      })
      .then((data) => setRentals(data))
      .catch((err) => toast.error('Ошибка загрузки аренд: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadRentals();
    loadTariffs();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadRentals();
  };

  const handleOpenRenewModal = (rental: Rental) => {
    setRenewingRental(rental);
    setRenewalDays(rental.tariff?.durationDays || 7);
    setRenewalAmount(rental.tariff?.price || 6000);
  };

  const handleConfirmRenewal = async () => {
    if (!renewingRental) return;
    try {
      await api.renewRental(renewingRental.id, {
        durationDays: Number(renewalDays),
        amount: Number(renewalAmount),
        method: renewalMethod,
      });
      toast.success(`Договор ${renewingRental.rentalNumber} успешно продлен на ${renewalDays} дн.!`);
      setRenewingRental(null);
      loadRentals();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка продления аренды');
    }
  };

  const handleOpenCreateTariff = () => {
    setEditingTariff(null);
    setTariffForm({
      name: '',
      type: 'STANDARD',
      durationDays: 7,
      price: 6000,
      depositRequired: 5000,
      isActive: true,
    });
    setIsTariffFormOpen(true);
  };

  const handleOpenEditTariff = (tariff: Tariff) => {
    setEditingTariff(tariff);
    setTariffForm({
      name: tariff.name,
      type: tariff.type,
      durationDays: tariff.durationDays,
      price: tariff.price,
      depositRequired: tariff.depositRequired,
      isActive: tariff.isActive,
    });
    setIsTariffFormOpen(true);
  };

  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTariff) {
        await api.updateRentalTariff(editingTariff.id, tariffForm);
        toast.success(`Шаблон тарифа "${tariffForm.name}" успешно обновлен`);
      } else {
        await api.createRentalTariff(tariffForm);
        toast.success(`Шаблон тарифа "${tariffForm.name}" успешно создан`);
      }
      setIsTariffFormOpen(false);
      setEditingTariff(null);
      loadTariffs();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения шаблона');
    }
  };

  const handleDeleteTariff = async (tariff: Tariff) => {
    if (window.confirm(`Вы действительно хотите удалить шаблон тарифа "${tariff.name}"?`)) {
      try {
        await api.deleteRentalTariff(tariff.id);
        toast.success(`Шаблон "${tariff.name}" удален`);
        loadTariffs();
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления шаблона');
      }
    }
  };

  const handleToggleTariffActive = async (tariff: Tariff) => {
    try {
      await api.updateRentalTariff(tariff.id, { isActive: !tariff.isActive });
      toast.success(
        `Тариф "${tariff.name}" ${!tariff.isActive ? 'активирован' : 'деактивирован'}`
      );
      loadTariffs();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка изменения статуса тарифа');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Реестр договоров аренды
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Управление активными, просроченными и завершенными прокатами
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              setIsTariffsModalOpen(true);
              setIsTariffFormOpen(false);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-[#101d17] hover:bg-slate-200 dark:hover:bg-[#162720] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-emerald-500/20 text-xs font-semibold rounded-xl transition-all"
          >
            <Sliders className="w-4 h-4 text-emerald-500" />
            <span>Шаблоны аренды</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
              {tariffs.length}
            </span>
          </button>

          <button
            onClick={onOpenCheckoutWizard}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Оформить новую аренду
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 contour-card">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
          {[
            { id: 'ALL', label: 'Все' },
            { id: 'ACTIVE', label: 'Активные' },
            { id: 'OVERDUE', label: 'Просроченные' },
            { id: 'CLOSED', label: 'Завершенные' },
            { id: 'BOUGHT_OUT', label: 'Выкупленные' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720] border border-transparent dark:border-emerald-500/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Номер договора, курьер, байк..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </form>
      </div>

      {/* Rentals Table */}
      <div className="contour-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-[#08100c] text-slate-500 dark:text-emerald-400/80 border-b border-slate-200 dark:border-emerald-500/15">
              <tr>
                <th className="p-3.5 font-semibold">Договор</th>
                <th className="p-3.5 font-semibold">Курьер</th>
                <th className="p-3.5 font-semibold">Байк и экипировка</th>
                <th className="p-3.5 font-semibold">Тариф</th>
                <th className="p-3.5 font-semibold">Срок действия</th>
                <th className="p-3.5 font-semibold">Залог</th>
                <th className="p-3.5 font-semibold text-center">Статус</th>
                <th className="p-3.5 font-semibold text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/10">
              {rentals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    Договоры аренды не найдены
                  </td>
                </tr>
              ) : (
                rentals.map((r) => {
                  const isOverdue = r.status === 'OVERDUE';
                  const isClosed = r.status === 'CLOSED' || r.status === 'BOUGHT_OUT';

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isOverdue ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {r.rentalNumber}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {new Date(r.startedAt).toLocaleDateString('ru-RU')}
                        </p>
                      </td>

                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {r.client?.fullName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {r.client?.phone}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {r.client?.courierService || 'Яндекс Еда'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-extrabold text-sky-600 dark:text-sky-400">
                          {r.bike?.inventoryNumber}
                        </span>{' '}
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          ({r.bike?.model?.name})
                        </span>
                        {r.outfits && r.outfits.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                            Экипировка: {r.outfits.map((o) => o.name.split(' ')[0]).join(', ')}
                          </p>
                        )}
                      </td>

                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.tariff?.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {r.tariff?.price.toLocaleString('ru-RU')} ₽ / {r.tariff?.durationDays} дн.
                        </p>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span
                            className={`font-semibold ${
                              isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            до {new Date(r.expiresAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-rose-600 font-bold">
                            Просрочен платеж!
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {r.depositAmount.toLocaleString('ru-RU')} ₽
                        </span>
                        {r.depositRefunded && (
                          <p className="text-[10px] text-emerald-600">Залог возвращен</p>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <StatusBadge type="rental" status={r.status} />
                      </td>

                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Print Handover Act */}
                        <button
                          onClick={() => onOpenPrintAct(r)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Печать Акта приема-передачи"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {!isClosed && (
                          <>
                            {/* Renew Button */}
                            <button
                              onClick={() => handleOpenRenewModal(r)}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 text-xs font-bold transition-colors"
                              title="Продлить аренду"
                            >
                              Продлить
                            </button>

                            {/* Return / Close Button */}
                            <button
                              onClick={() => onOpenCloseModal(r)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition-colors"
                              title="Принять байк и закрыть аренду"
                            >
                              Возврат
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Renew Rental */}
      <Modal
        isOpen={!!renewingRental}
        onClose={() => setRenewingRental(null)}
        title="Продление срока аренды"
        subtitle={`Договор ${renewingRental?.rentalNumber} • Курьер: ${renewingRental?.client?.fullName}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Срок продления (дней) *</label>
              <input
                type="number"
                min="1"
                value={renewalDays}
                onChange={(e) => setRenewalDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Сумма к оплате (₽) *</label>
              <input
                type="number"
                min="0"
                value={renewalAmount}
                onChange={(e) => setRenewalAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center text-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Способ оплаты</label>
            <select
              value={renewalMethod}
              onChange={(e) => setRenewalMethod(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="CASH">Наличные в кассу</option>
              <option value="SBP">СБП (Система быстрых платежей / QR)</option>
              <option value="CARD">Банковская карта</option>
              <option value="BANK_TRANSFER">Безналичный перевод</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setRenewingRental(null)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirmRenewal}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm"
            >
              Подтвердить оплату и продлить
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Rental Tariffs / Templates Management */}
      <Modal
        isOpen={isTariffsModalOpen}
        onClose={() => {
          setIsTariffsModalOpen(false);
          setIsTariffFormOpen(false);
          setEditingTariff(null);
        }}
        title="Шаблоны тарифов аренды"
        subtitle="Настройка шаблонов, которые выбираются менеджером при выдаче байка"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {isTariffFormOpen ? (
            <form onSubmit={handleSaveTariff} className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-emerald-500/10">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {editingTariff ? 'Редактирование шаблона' : 'Новый шаблон тарифа'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsTariffFormOpen(false);
                    setEditingTariff(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  Отмена
                </button>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                  Название тарифа *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Например: Недельный рабочий, Месячный, Выкуп 9 мес..."
                  value={tariffForm.name}
                  onChange={(e) => setTariffForm({ ...tariffForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                    Тип аренды *
                  </label>
                  <select
                    value={tariffForm.type}
                    onChange={(e) =>
                      setTariffForm({
                        ...tariffForm,
                        type: e.target.value as 'STANDARD' | 'RENT_TO_OWN',
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="STANDARD">Обычная аренда (STANDARD)</option>
                    <option value="RENT_TO_OWN">Аренда с выкупом (RENT_TO_OWN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                    Срок аренды (дней) *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={tariffForm.durationDays}
                    onChange={(e) =>
                      setTariffForm({ ...tariffForm, durationDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                    Стоимость аренды (₽) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="100"
                    value={tariffForm.price}
                    onChange={(e) =>
                      setTariffForm({ ...tariffForm, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-black text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                    Обязательный залог (₽) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="500"
                    value={tariffForm.depositRequired}
                    onChange={(e) =>
                      setTariffForm({ ...tariffForm, depositRequired: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tariffActive"
                  checked={tariffForm.isActive}
                  onChange={(e) => setTariffForm({ ...tariffForm, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="tariffActive" className="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  Тариф активен и доступен в мастере выдачи
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-emerald-500/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsTariffFormOpen(false);
                    setEditingTariff(null);
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-sm"
                >
                  {editingTariff ? 'Сохранить изменения' : 'Создать тариф'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Всего шаблонов: <strong className="text-slate-900 dark:text-white">{tariffs.length}</strong>
                </span>
                <button
                  onClick={handleOpenCreateTariff}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Создать шаблон
                </button>
              </div>

              {tariffs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-emerald-500/20 bg-slate-50/50 dark:bg-[#101d17]/50 space-y-2">
                  <Sliders className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    Шаблоны аренды еще не созданы
                  </p>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    Создайте шаблоны с удобными сроками (например, 1 день, 7 дней или 30 дней) для мгновенного выбора при оформлении выдачи.
                  </p>
                  <button
                    onClick={handleOpenCreateTariff}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить первый шаблон
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                  {tariffs.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-emerald-500/20 bg-white dark:bg-[#101d17] hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                            {t.name}
                          </h5>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              t.type === 'RENT_TO_OWN'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {t.type === 'RENT_TO_OWN' ? 'Выкуп' : 'Аренда'}
                          </span>
                          {!t.isActive && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500">
                              Отключен
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          <span>
                            Срок: <strong className="text-slate-800 dark:text-slate-200">{t.durationDays} дн.</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Стоимость: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{t.price.toLocaleString('ru-RU')} ₽</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Залог: <strong className="text-slate-800 dark:text-slate-200">{t.depositRequired.toLocaleString('ru-RU')} ₽</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleToggleTariffActive(t)}
                          title={t.isActive ? 'Деактивировать' : 'Активировать'}
                          className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            t.isActive
                              ? 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              : 'border-slate-300 dark:border-slate-700 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {t.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleOpenEditTariff(t)}
                          title="Редактировать шаблон"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTariff(t)}
                          title="Удалить шаблон"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setIsTariffsModalOpen(false);
                setIsTariffFormOpen(false);
                setEditingTariff(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Закрыть
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
