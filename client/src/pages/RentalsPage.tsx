import React, { useState, useEffect } from 'react';
import { Rental, RentalStatus, Tariff, BikeModel } from '../types';
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
  Sparkles,
  Coins,
  Percent,
  Check,
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
  const [models, setModels] = useState<BikeModel[]>([]);
  const [isTariffsModalOpen, setIsTariffsModalOpen] = useState(false);
  const [isTariffFormOpen, setIsTariffFormOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [tariffForm, setTariffForm] = useState({
    name: '',
    type: 'STANDARD' as 'STANDARD' | 'RENT_TO_OWN',
    bikeModelId: '',
    durationDays: 7,
    price: 6000,
    depositRequired: 5000,
    isActive: true,
    totalBuyoutPrice: 60000,
    paymentIntervalDays: 7,
    installmentPayment: 6000,
  });

  // Renewal modal state
  const [renewingRental, setRenewingRental] = useState<Rental | null>(null);
  const [renewalDays, setRenewalDays] = useState<number>(7);
  const [renewalAmount, setRenewalAmount] = useState<number>(6000);
  const [renewalMethod, setRenewalMethod] = useState<'CASH' | 'CARD' | 'SBP' | 'BANK_TRANSFER'>('CASH');
  const [isBuyoutFinal, setIsBuyoutFinal] = useState<boolean>(false);

  const loadTariffs = () => {
    api
      .getRentalTariffs()
      .then(setTariffs)
      .catch((err) => console.error('Ошибка загрузки тарифов:', err));
    api
      .getBikeModels()
      .then(setModels)
      .catch((err) => console.error('Ошибка загрузки моделей:', err));
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
    const isRentToOwn = rental.type === 'RENT_TO_OWN';
    const intervalDays = rental.paymentIntervalDays || rental.tariff?.paymentIntervalDays || 7;
    const instPayment = rental.installmentPayment || rental.tariff?.installmentPayment || rental.tariff?.price || 6000;
    setRenewalDays(isRentToOwn ? intervalDays : (rental.tariff?.durationDays || 7));
    setRenewalAmount(isRentToOwn ? instPayment : (rental.tariff?.price || 6000));
    setIsBuyoutFinal(false);
  };

  const handleConfirmRenewal = async () => {
    if (!renewingRental) return;
    try {
      await api.renewRental(renewingRental.id, {
        durationDays: Number(renewalDays),
        amount: Number(renewalAmount),
        method: renewalMethod,
        isBuyoutFinal,
      });
      if (isBuyoutFinal || (renewingRental.type === 'RENT_TO_OWN' && renewingRental.remainingBuyoutAmount !== undefined && renewalAmount >= renewingRental.remainingBuyoutAmount)) {
        toast.success(`🎉 Договор ${renewingRental.rentalNumber} полностью выкуплен! Байк переведен в статус "Продан".`);
      } else {
        toast.success(`Договор ${renewingRental.rentalNumber} успешно ${renewingRental.type === 'RENT_TO_OWN' ? 'пополнен платежом по выкупу' : `продлен на ${renewalDays} дн.`}!`);
      }
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
      bikeModelId: '',
      durationDays: 7,
      price: 6000,
      depositRequired: 5000,
      isActive: true,
      totalBuyoutPrice: 60000,
      paymentIntervalDays: 7,
      installmentPayment: 6000,
    });
    setIsTariffFormOpen(true);
  };

  const handleOpenEditTariff = (tariff: Tariff) => {
    setEditingTariff(tariff);
    setTariffForm({
      name: tariff.name,
      type: tariff.type,
      bikeModelId: tariff.bikeModelId || '',
      durationDays: tariff.durationDays,
      price: tariff.price,
      depositRequired: tariff.depositRequired,
      isActive: tariff.isActive,
      totalBuyoutPrice: tariff.totalBuyoutPrice || (tariff.type === 'RENT_TO_OWN' ? tariff.price : 60000),
      paymentIntervalDays: tariff.paymentIntervalDays || 7,
      installmentPayment: tariff.installmentPayment || tariff.price || 6000,
    });
    setIsTariffFormOpen(true);
  };

  const handleCalculateInstallment = () => {
    const total = Number(tariffForm.totalBuyoutPrice) || 0;
    const dur = Number(tariffForm.durationDays) || 1;
    const interval = Number(tariffForm.paymentIntervalDays) || 7;
    const periods = Math.max(1, Math.round(dur / interval));
    const inst = Math.ceil(total / periods);
    setTariffForm((prev) => ({
      ...prev,
      installmentPayment: inst,
      price: inst,
    }));
    toast.success(`Рассчитано: ${periods} платежей по ${inst.toLocaleString('ru-RU')} ₽`);
  };

  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...tariffForm,
        bikeModelId: tariffForm.bikeModelId ? tariffForm.bikeModelId : null,
      };
      if (editingTariff) {
        await api.updateRentalTariff(editingTariff.id, payload);
        toast.success(`Шаблон тарифа "${tariffForm.name}" успешно обновлен`);
      } else {
        await api.createRentalTariff(payload);
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
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {r.tariff?.name}
                          </p>
                          {r.type === 'RENT_TO_OWN' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                              Выкуп
                            </span>
                          )}
                        </div>
                        {r.type === 'RENT_TO_OWN' ? (
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                              <span>Выплачено: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{(r.totalPaidForBuyout || 0).toLocaleString('ru-RU')} ₽</strong></span>
                              <span>из {(r.totalBuyoutPrice || 0).toLocaleString('ru-RU')} ₽</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-purple-500 h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, Math.round(((r.totalPaidForBuyout || 0) / Math.max(1, r.totalBuyoutPrice || 1)) * 100))}%`,
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Остаток: <strong className="text-slate-900 dark:text-white font-bold">{(r.remainingBuyoutAmount ?? 0).toLocaleString('ru-RU')} ₽</strong>
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500">
                            {r.tariff?.price.toLocaleString('ru-RU')} ₽ / {r.tariff?.durationDays} дн.
                          </p>
                        )}
                      </td>

                      <td className="p-3.5">
                        {r.type === 'RENT_TO_OWN' ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span
                                className={`font-semibold ${
                                  isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                След. взнос: {new Date(r.nextPaymentDue).toLocaleDateString('ru-RU')}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 pl-5">
                              (срок договора: до {new Date(r.expiresAt).toLocaleDateString('ru-RU')})
                            </p>
                            {isOverdue && (
                              <span className="text-[10px] text-rose-600 font-bold pl-5 block">
                                Просрочен очередной взнос!
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
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
                          </>
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
                            {/* Renew / Buyout Button */}
                            <button
                              onClick={() => handleOpenRenewModal(r)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                r.type === 'RENT_TO_OWN'
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                                  : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100'
                              }`}
                              title={r.type === 'RENT_TO_OWN' ? 'Внести взнос по выкупу' : 'Продлить аренду'}
                            >
                              {r.type === 'RENT_TO_OWN' ? 'Взнос' : 'Продлить'}
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

      {/* Modal: Renew / Buyout Payment */}
      <Modal
        isOpen={!!renewingRental}
        onClose={() => setRenewingRental(null)}
        title={renewingRental?.type === 'RENT_TO_OWN' ? 'Внесение платежа по выкупу' : 'Продление срока аренды'}
        subtitle={`Договор ${renewingRental?.rentalNumber} • Курьер: ${renewingRental?.client?.fullName} • Байк: ${renewingRental?.bike?.inventoryNumber}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {renewingRental?.type === 'RENT_TO_OWN' && (
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                  Прогресс выкупа электровелосипеда
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                  {Math.min(100, Math.round(((renewingRental.totalPaidForBuyout || 0) / Math.max(1, renewingRental.totalBuyoutPrice || 1)) * 100))}%
                </span>
              </div>

              <div className="w-full bg-purple-200 dark:bg-purple-900/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 dark:bg-purple-400 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(((renewingRental.totalPaidForBuyout || 0) / Math.max(1, renewingRental.totalBuyoutPrice || 1)) * 100))}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Полный выкуп:</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">
                    {(renewingRental.totalBuyoutPrice || 0).toLocaleString('ru-RU')} ₽
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Оплачено:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {(renewingRental.totalPaidForBuyout || 0).toLocaleString('ru-RU')} ₽
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Остаток долга:</span>
                  <strong className="text-purple-700 dark:text-purple-300 font-bold">
                    {(renewingRental.remainingBuyoutAmount ?? 0).toLocaleString('ru-RU')} ₽
                  </strong>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const inst = renewingRental.installmentPayment || renewingRental.tariff?.installmentPayment || renewingRental.tariff?.price || 6000;
                    setRenewalAmount(inst);
                    setIsBuyoutFinal(false);
                  }}
                  className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition text-center"
                >
                  Регулярный платёж ({(renewingRental.installmentPayment || renewingRental.tariff?.installmentPayment || 6000).toLocaleString('ru-RU')} ₽)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rem = renewingRental.remainingBuyoutAmount ?? 0;
                    setRenewalAmount(rem);
                    setIsBuyoutFinal(true);
                  }}
                  className="flex-1 py-1.5 px-2 bg-purple-600 text-white rounded-lg text-[10px] font-bold hover:bg-purple-500 transition shadow-sm text-center"
                >
                  Досрочный выкуп ({(renewingRental.remainingBuyoutAmount ?? 0).toLocaleString('ru-RU')} ₽)
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">
                {renewingRental?.type === 'RENT_TO_OWN' ? 'Срок до след. платежа (дней) *' : 'Срок продления (дней) *'}
              </label>
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
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRenewalAmount(val);
                  if (renewingRental?.type === 'RENT_TO_OWN' && renewingRental.remainingBuyoutAmount && val >= renewingRental.remainingBuyoutAmount) {
                    setIsBuyoutFinal(true);
                  }
                }}
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

          {renewingRental?.type === 'RENT_TO_OWN' && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                id="buyoutFinalCheck"
                checked={isBuyoutFinal}
                onChange={(e) => setIsBuyoutFinal(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
              />
              <label htmlFor="buyoutFinalCheck" className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                Финальный выкупной платёж (перевести электровелосипед в статус "Продан")
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setRenewingRental(null)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirmRenewal}
              className={`px-5 py-2 font-bold rounded-xl shadow-sm text-white ${
                renewingRental?.type === 'RENT_TO_OWN'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {renewingRental?.type === 'RENT_TO_OWN' ? 'Провести платёж по выкупу' : 'Подтвердить оплату и продлить'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                    Название тарифа *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Например: Недельный рабочий, Месячный, Выкуп Minako..."
                    value={tariffForm.name}
                    onChange={(e) => setTariffForm({ ...tariffForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold flex items-center justify-between">
                    <span>Привязка к модели байка</span>
                    <span className="text-[10px] text-slate-400 font-normal">Опционально</span>
                  </label>
                  <select
                    value={tariffForm.bikeModelId}
                    onChange={(e) => {
                      const selectedModelId = e.target.value;
                      const selectedModel = models.find((m) => m.id === selectedModelId);
                      setTariffForm((prev) => {
                        const next = { ...prev, bikeModelId: selectedModelId };
                        if (selectedModel) {
                          if (selectedModel.baseRentalPrice && prev.type === 'STANDARD') {
                            next.price = selectedModel.baseRentalPrice;
                          }
                          if (selectedModel.baseBuyoutPrice && prev.type === 'RENT_TO_OWN') {
                            next.totalBuyoutPrice = selectedModel.baseBuyoutPrice;
                            const periods = Math.max(1, Math.round(next.durationDays / (next.paymentIntervalDays || 7)));
                            const inst = Math.ceil(selectedModel.baseBuyoutPrice / periods);
                            next.installmentPayment = inst;
                            next.price = inst;
                          }
                        }
                        return next;
                      });
                      if (selectedModel) {
                        toast.info(`Подставлены базовые цены модели "${selectedModel.name}"`);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-medium text-slate-900 dark:text-white"
                  >
                    <option value="">Все модели (универсальный тариф)</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.baseRentalPrice ? `(${m.baseRentalPrice.toLocaleString('ru-RU')} ₽)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                    Тип аренды *
                  </label>
                  <select
                    value={tariffForm.type}
                    onChange={(e) => {
                      const newType = e.target.value as 'STANDARD' | 'RENT_TO_OWN';
                      const selectedModel = models.find((m) => m.id === tariffForm.bikeModelId);
                      setTariffForm((prev) => {
                        const dur = newType === 'RENT_TO_OWN' ? 180 : 7;
                        let nextTotalBuyout = prev.totalBuyoutPrice;
                        let nextPrice = prev.price;
                        let nextInstallment = prev.installmentPayment;

                        if (selectedModel) {
                          if (newType === 'RENT_TO_OWN' && selectedModel.baseBuyoutPrice) {
                            nextTotalBuyout = selectedModel.baseBuyoutPrice;
                            const periods = Math.max(1, Math.round(dur / (prev.paymentIntervalDays || 7)));
                            nextInstallment = Math.ceil(selectedModel.baseBuyoutPrice / periods);
                            nextPrice = nextInstallment;
                          } else if (newType === 'STANDARD' && selectedModel.baseRentalPrice) {
                            nextPrice = selectedModel.baseRentalPrice;
                          }
                        }

                        return {
                          ...prev,
                          type: newType,
                          durationDays: dur,
                          totalBuyoutPrice: nextTotalBuyout,
                          price: nextPrice,
                          installmentPayment: nextInstallment,
                        };
                      });
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="STANDARD">Обычная аренда (STANDARD)</option>
                    <option value="RENT_TO_OWN">Аренда с выкупом (RENT_TO_OWN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                    {tariffForm.type === 'RENT_TO_OWN' ? 'Общий срок выкупа (дней) *' : 'Срок аренды (дней) *'}
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

              {tariffForm.type === 'RENT_TO_OWN' ? (
                <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                      Параметры выкупа (рассрочки)
                    </span>
                    <button
                      type="button"
                      onClick={handleCalculateInstallment}
                      className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                      title="Автоматически рассчитать платеж исходя из общей суммы и интервала"
                    >
                      <Sparkles className="w-3 h-3" />
                      Рассчитать платёж
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold">
                        Полная выкупная цена (₽) *
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="1000"
                        value={tariffForm.totalBuyoutPrice}
                        onChange={(e) =>
                          setTariffForm({ ...tariffForm, totalBuyoutPrice: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-black text-purple-700 dark:text-purple-300"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold">
                        Интервал платежей (дней) *
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={tariffForm.paymentIntervalDays}
                        onChange={(e) =>
                          setTariffForm({ ...tariffForm, paymentIntervalDays: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold">
                        Регулярный платёж за интервал (₽) *
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="100"
                        value={tariffForm.installmentPayment}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTariffForm({
                            ...tariffForm,
                            installmentPayment: val,
                            price: val,
                          });
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-black text-emerald-600 dark:text-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold">
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
                        className="w-full px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
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
              )}

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
                          {t.bikeModelId ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              🚲 {t.bikeModel?.name || models.find((m) => m.id === t.bikeModelId)?.name || 'Модель'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                              Все модели
                            </span>
                          )}
                          {!t.isActive && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500">
                              Отключен
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          {t.type === 'RENT_TO_OWN' ? (
                            <>
                              <span>
                                Полный выкуп: <strong className="text-purple-700 dark:text-purple-300 font-bold">{(t.totalBuyoutPrice || t.price).toLocaleString('ru-RU')} ₽</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Взнос: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{(t.installmentPayment || t.price).toLocaleString('ru-RU')} ₽ / {t.paymentIntervalDays || 7} дн.</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Срок: <strong className="text-slate-800 dark:text-slate-200">{t.durationDays} дн.</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Залог: <strong className="text-slate-800 dark:text-slate-200">{t.depositRequired.toLocaleString('ru-RU')} ₽</strong>
                              </span>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
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
