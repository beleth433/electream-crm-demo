import { useCrmRefresh } from '../hooks/useCrmRefresh';
import React, { useState, useEffect } from 'react';
import { Rental, RentalStatus, Tariff, BikeModel, BatteryModel, TariffBuyoutBatteryItem } from '../types';
import { api } from '../services/api';
import type { DocumentSummary } from '../types/documents';
import { SourceOperationNotice } from '../components/SourceOperationNotice';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { PhoneQrModal } from '../components/PhoneQrModal';
import {
  Search,
  Filter,
  Plus,
  KeyRound,
  RotateCcw,
  Printer,
  Calendar,
  Phone,
  QrCode,
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
  sourceDocument?: DocumentSummary | null;
  onClearSource?: () => void;
  onOpenCheckoutWizard: (initialType?: 'STANDARD' | 'RENT_TO_OWN') => void;
  onOpenCloseModal: (rental: Rental) => void;
  onOpenPrintAct: (rental: Rental) => void;
  onNavigateToTab?: (tab: string) => void;
  refreshTrigger?: number;
}

export const RentalsPage: React.FC<RentalsPageProps> = ({
  onOpenCheckoutWizard,
  onOpenCloseModal,
  onOpenPrintAct,
  onNavigateToTab,
  refreshTrigger,
  sourceDocument,
  onClearSource,
}) => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [activeMode, setActiveMode] = useState<'standard' | 'buyout'>(() => {
    try {
      const saved = localStorage.getItem('crm_rentals_mode');
      return saved === 'buyout' ? 'buyout' : 'standard';
    } catch {
      return 'standard';
    }
  });

  // Contact / Phone QR Modal state
  const [selectedContactModal, setSelectedContactModal] = useState<{
    phone: string;
    clientName: string;
    telegram?: string | null;
    details?: {
      rentalNumber?: string;
      bikeInventoryNumber?: string;
      daysOverdue?: number;
      courierService?: string;
      telegram?: string | null;
    };
  } | null>(null);

  const handleSelectMode = (mode: 'standard' | 'buyout') => {
    setActiveMode(mode);
    try {
      localStorage.setItem('crm_rentals_mode', mode);
    } catch {}
  };

  // Tariffs (Rental Templates) state
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [tariffsFilter, setTariffsFilter] = useState<'ALL' | 'STANDARD' | 'RENT_TO_OWN'>('ALL');
  const [models, setModels] = useState<BikeModel[]>([]);
  const [batteryModels, setBatteryModels] = useState<BatteryModel[]>([]);
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
    includedBatteries: [] as TariffBuyoutBatteryItem[],
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
    api
      .getBatteryModels()
      .then(setBatteryModels)
      .catch((err) => console.error('Ошибка загрузки моделей АКБ:', err));
  };

  const loadRentals = () => {
    setIsLoading(true);
    api
      .getRentals({
        status: sourceDocument || statusFilter === 'ALL' ? undefined : statusFilter,
        search: sourceDocument ? undefined : search,
      })
      .then((data) => setRentals(data))
      .catch((err) => toast.error('Ошибка загрузки аренд: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useCrmRefresh(() => { loadRentals(); loadTariffs(); });

  useEffect(() => {
    loadRentals();
    loadTariffs();
  }, [statusFilter, refreshTrigger, sourceDocument]);

  useEffect(() => {
    if (!sourceDocument) return;
    setStatusFilter('ALL');
    setSearch('');
    let cancelled = false;
    api.getRental(sourceDocument.sourceId).then((rental) => {
      if (!cancelled) setActiveMode(rental.type === 'RENT_TO_OWN' ? 'buyout' : 'standard');
    }).catch((err) => { if (!cancelled) toast.error(err.message); });
    return () => { cancelled = true; };
  }, [sourceDocument]);

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
    setRenewalAmount(isRentToOwn ? Math.min(instPayment, rental.remainingBuyoutAmount ?? instPayment) : (rental.tariff?.price || 6000));
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
        toast.success(`🎉 Договор ${renewingRental.rentalNumber} полностью выкуплен! Байк переведен в статус "Выкуплен".`);
      } else {
        toast.success(`Договор ${renewingRental.rentalNumber} успешно ${renewingRental.type === 'RENT_TO_OWN' ? 'пополнен платежом по выкупу' : `продлен на ${renewalDays} дн.`}!`);
      }
      setRenewingRental(null);
      loadRentals();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка продления аренды');
    }
  };

  const recalculateBuyoutFromItems = (
    bikeModelId: string,
    batteries: TariffBuyoutBatteryItem[],
    overrides?: { durationDays?: number; paymentIntervalDays?: number; type?: 'STANDARD' | 'RENT_TO_OWN' }
  ) => {
    const selectedBikeModel = models.find((m) => m.id === bikeModelId);
    const bikePrice = selectedBikeModel ? (selectedBikeModel.baseBuyoutPrice || selectedBikeModel.salePrice || 60000) : 0;
    const batteriesTotal = (batteries || []).reduce(
      (sum, b) => sum + (Number(b.quantity) || 0) * (Number(b.price) || 0),
      0
    );
    const total = bikePrice + batteriesTotal;
    const dur = overrides?.durationDays ?? tariffForm.durationDays ?? 180;
    const interval = overrides?.paymentIntervalDays ?? tariffForm.paymentIntervalDays ?? 7;
    const periods = Math.max(1, Math.round(dur / interval));
    const inst = Math.ceil((total / periods) / 10) * 10;

    setTariffForm((prev) => ({
      ...prev,
      type: overrides?.type ?? prev.type,
      bikeModelId,
      includedBatteries: batteries,
      durationDays: dur,
      paymentIntervalDays: interval,
      totalBuyoutPrice: total > 0 ? total : (prev.totalBuyoutPrice || 60000),
      installmentPayment: total > 0 ? inst : (prev.installmentPayment || 6000),
      price: total > 0 ? inst : (prev.price || 6000),
    }));
  };

  const handleAddBuyoutBattery = () => {
    const firstModel = batteryModels[0];
    const newBat: TariffBuyoutBatteryItem = {
      batteryModelId: firstModel ? firstModel.id : '',
      quantity: 1,
      price: firstModel ? (firstModel.salePrice || 25000) : 25000,
    };
    const updated = [...tariffForm.includedBatteries, newBat];
    recalculateBuyoutFromItems(tariffForm.bikeModelId, updated);
  };

  const handleUpdateBuyoutBattery = (
    index: number,
    updates: Partial<TariffBuyoutBatteryItem>
  ) => {
    const updated = tariffForm.includedBatteries.map((item, idx) => {
      if (idx !== index) return item;
      const newItem = { ...item, ...updates };
      if (updates.batteryModelId && updates.batteryModelId !== item.batteryModelId) {
        const found = batteryModels.find((m) => m.id === updates.batteryModelId);
        if (found) {
          newItem.price = found.salePrice || 25000;
        }
      }
      return newItem;
    });
    recalculateBuyoutFromItems(tariffForm.bikeModelId, updated);
  };

  const handleRemoveBuyoutBattery = (index: number) => {
    const updated = tariffForm.includedBatteries.filter((_, idx) => idx !== index);
    recalculateBuyoutFromItems(tariffForm.bikeModelId, updated);
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
      includedBatteries: [],
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
      includedBatteries: tariff.includedBatteries ? [...tariff.includedBatteries] : [],
    });
    setIsTariffFormOpen(true);
  };

  const handleCalculateInstallment = () => {
    const total = Number(tariffForm.totalBuyoutPrice) || 0;
    const dur = Number(tariffForm.durationDays) || 180;
    const interval = Number(tariffForm.paymentIntervalDays) || 7;
    const periods = Math.max(1, Math.round(dur / interval));
    const inst = Math.ceil((total / periods) / 10) * 10;
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

  const handleDeleteRental = async (rental: Rental) => {
    if (rental.status === 'ACTIVE' || rental.status === 'OVERDUE') {
      toast.error('Нельзя удалить активный или просроченный договор. Сначала оформите возврат техники.');
      return;
    }

    if (
      !window.confirm(
        `Вы действительно хотите безвозвратно удалить завершенный договор ${rental.rentalNumber} (${rental.client?.fullName || 'Курьер'})?`
      )
    ) {
      return;
    }

    try {
      await api.deleteRental(rental.id);
      toast.success(`Договор аренды ${rental.rentalNumber} успешно удален`);
      loadRentals();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления договора');
    }
  };

  const sourceRentals = sourceDocument ? rentals.filter((r) => r.id === sourceDocument.sourceId) : rentals;
  const standardRentals = sourceRentals.filter((r) => r.type !== 'RENT_TO_OWN');
  const buyoutRentals = sourceRentals.filter((r) => r.type === 'RENT_TO_OWN');

  const activeStandardCount = standardRentals.filter((r) => r.status === 'ACTIVE' || r.status === 'OVERDUE').length;
  const activeBuyoutCount = buyoutRentals.filter((r) => r.status === 'ACTIVE' || r.status === 'OVERDUE').length;
  const overdueStandardCount = standardRentals.filter((r) => r.status === 'OVERDUE').length;
  const overdueBuyoutCount = buyoutRentals.filter((r) => r.status === 'OVERDUE').length;

  const currentModeRentals = activeMode === 'buyout' ? buyoutRentals : standardRentals;

  return (
    <div className="space-y-6">
      <SourceOperationNotice document={sourceDocument} onClear={onClearSource} />
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {activeMode === 'standard' ? 'Реестр договоров аренды' : 'Реестр выкупа техники (Rent-to-Own)'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeMode === 'standard'
              ? 'Управление активными, просроченными и завершенными прокатами'
              : 'Договоры аренды с правом выкупа, графики регулярных взносов и контроль рассрочки'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setTariffsFilter(activeMode === 'buyout' ? 'RENT_TO_OWN' : 'STANDARD');
              setIsTariffsModalOpen(true);
              setIsTariffFormOpen(false);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-slate-100 dark:bg-[#101d17] hover:bg-slate-200 dark:hover:bg-[#162720] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-emerald-500/20 text-xs font-semibold rounded-xl transition-all"
          >
            <Sliders className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">Шаблоны</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
              {tariffs.length}
            </span>
          </button>

          {activeMode === 'standard' ? (
            <button
              onClick={() => onOpenCheckoutWizard('STANDARD')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">Новая аренда</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenCheckoutWizard('RENT_TO_OWN')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/25 transition-all"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">Оформить выкуп</span>
            </button>
          )}
        </div>
      </div>

      {/* Dual Mode Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-[#0c1812] rounded-2xl border border-slate-200/80 dark:border-emerald-500/20">
        <button
          type="button"
          onClick={() => handleSelectMode('standard')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeMode === 'standard'
              ? 'bg-white dark:bg-[#152a20] text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4 shrink-0" />
          <span>Стандартная аренда</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeMode === 'standard'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {standardRentals.length}
          </span>
          {overdueStandardCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
              {overdueStandardCount} проср.
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSelectMode('buyout')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeMode === 'buyout'
              ? 'bg-white dark:bg-[#20152a] text-purple-600 dark:text-purple-400 shadow-sm border border-purple-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Coins className="w-4 h-4 shrink-0" />
          <span>Выкуп техники (Rent-to-Own)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeMode === 'buyout'
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {buyoutRentals.length}
          </span>
          {overdueBuyoutCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
              {overdueBuyoutCount} проср.
            </span>
          )}
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 contour-card">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
          {(activeMode === 'standard'
            ? [
                { id: 'ACTIVE', label: 'Активные' },
                { id: 'OVERDUE', label: 'Просроченные' },
                { id: 'CLOSED', label: 'Завершенные' },
                { id: 'ALL', label: 'Все' },
              ]
            : [
                { id: 'ACTIVE', label: 'В процессе' },
                { id: 'OVERDUE', label: 'Просрочен взнос' },
                { id: 'BOUGHT_OUT', label: 'Выкупленные' },
                { id: 'CLOSED', label: 'Расторгнутые' },
                { id: 'ALL', label: 'Все' },
              ]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? activeMode === 'buyout'
                    ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-600/25'
                    : 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
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
            placeholder={activeMode === 'standard' ? "Номер договора, курьер, байк..." : "Договор выкупа, покупатель, байк..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </form>
      </div>

      {/* Rentals Table (Desktop) */}
      <div className="hidden md:block contour-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-[#08100c] text-slate-500 dark:text-emerald-400/80 border-b border-slate-200 dark:border-emerald-500/15">
              <tr>
                <th className="p-3.5 font-semibold">{activeMode === 'standard' ? 'Договор' : 'Договор выкупа'}</th>
                <th className="p-3.5 font-semibold">{activeMode === 'standard' ? 'Курьер' : 'Покупатель / Курьер'}</th>
                <th className="p-3.5 font-semibold">{activeMode === 'standard' ? 'Байк и экипировка' : 'Байк и АКБ'}</th>
                <th className="p-3.5 font-semibold">{activeMode === 'standard' ? 'Тариф' : 'Прогресс выкупа'}</th>
                <th className="p-3.5 font-semibold">{activeMode === 'standard' ? 'Срок действия' : 'График взносов'}</th>
                <th className="p-3.5 font-semibold">{activeMode === 'standard' ? 'Залог' : 'Залог / Депозит'}</th>
                <th className="p-3.5 font-semibold text-center">Статус</th>
                <th className="p-3.5 font-semibold text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/10">
              {currentModeRentals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    {activeMode === 'standard' ? 'Договоры аренды не найдены' : 'Договоры выкупа техники не найдены'}
                  </td>
                </tr>
              ) : (
                currentModeRentals.map((r) => {
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
                        {r.client?.phone ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedContactModal({
                                phone: r.client?.phone || '',
                                clientName: r.client?.fullName || '',
                                telegram: r.client?.telegram,
                                details: {
                                  rentalNumber: r.rentalNumber,
                                  bikeInventoryNumber: r.bike?.inventoryNumber,
                                  daysOverdue: r.status === 'OVERDUE' ? 1 : 0,
                                  courierService: r.client?.courierService || undefined,
                                  telegram: r.client?.telegram,
                                },
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700 text-[11px] font-medium transition group"
                            title="Открыть QR-код для звонка или написать в Telegram"
                          >
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <span className="font-mono">{r.client.phone}</span>
                            <QrCode className="w-3 h-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                          </button>
                        ) : (
                          <p className="text-[11px] text-slate-400">Нет телефона</p>
                        )}
                        <div>
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {r.client?.courierService || 'Яндекс Еда'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-extrabold text-sky-600 dark:text-sky-400">
                          {r.bike?.inventoryNumber}
                        </span>{' '}
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          ({r.bike?.model?.name})
                        </span>
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
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

                        {r.status === 'BOUGHT_OUT' && !r.depositRefunded && (
                          <button onClick={() => onOpenCloseModal(r)} className="min-h-[44px] px-3 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">Экипировка и залог</button>
                        )}
                        {isClosed && (
                          <button
                            onClick={() => handleDeleteRental(r)}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Удалить завершенный договор"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Mobile Card Layout (visible on phones < 768px) */}
      <div className="block md:hidden space-y-3">
        {currentModeRentals.length === 0 ? (
          <div className="p-8 text-center text-slate-400 italic contour-card">
            {activeMode === 'standard' ? 'Договоры аренды не найдены' : 'Договоры выкупа техники не найдены'}
          </div>
        ) : (
          currentModeRentals.map((r) => {
            const isOverdue = r.status === 'OVERDUE';
            const isClosed = r.status === 'CLOSED' || r.status === 'BOUGHT_OUT';

            return (
              <div
                key={r.id}
                className={`p-4 rounded-2xl border contour-card space-y-3 transition-all ${
                  isOverdue
                    ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/10'
                    : 'border-slate-200 dark:border-emerald-500/15'
                }`}
              >
                {/* Header: Number, Date, Status, Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white">
                        {r.rentalNumber}
                      </span>
                      {r.type === 'RENT_TO_OWN' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                          Выкуп
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      От {new Date(r.startedAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge type="rental" status={r.status} />
                    {isClosed && (
                      <button
                        onClick={() => handleDeleteRental(r)}
                        className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Удалить завершенный договор"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Courier & Quick Call Button */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {r.client?.fullName}
                    </p>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {r.client?.courierService || 'Яндекс Еда'}
                    </span>
                  </div>
                  {r.client?.phone && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${r.client.phone}`}
                        className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-colors active:scale-95"
                        title="Позвонить курьеру"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="font-mono">{r.client.phone}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedContactModal({
                            phone: r.client?.phone || '',
                            clientName: r.client?.fullName || '',
                            telegram: r.client?.telegram,
                            details: {
                              rentalNumber: r.rentalNumber,
                              bikeInventoryNumber: r.bike?.inventoryNumber,
                              daysOverdue: r.status === 'OVERDUE' ? 1 : 0,
                              courierService: r.client?.courierService || undefined,
                              telegram: r.client?.telegram,
                            },
                          })
                        }
                        className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors active:scale-95"
                        title="Открыть QR-код и Telegram"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Bike & Tariff details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block">Байк</span>
                    <strong className="text-sky-600 dark:text-sky-400 font-bold block truncate">
                      {r.bike?.inventoryNumber}
                    </strong>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {r.bike?.model?.name}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block">Срок действия</span>
                    <strong
                      className={`font-bold block truncate ${
                        isOverdue ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {r.type === 'RENT_TO_OWN'
                        ? `Взнос: ${new Date(r.nextPaymentDue).toLocaleDateString('ru-RU')}`
                        : `до ${new Date(r.expiresAt).toLocaleDateString('ru-RU')}`}
                    </strong>
                    <span className="text-[10px] text-slate-500 truncate block">
                      Залог: {r.depositAmount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>

                {/* Buyout Progress bar if rent-to-own */}
                {r.type === 'RENT_TO_OWN' && (
                  <div className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Выплачено: <strong className="text-emerald-600 font-bold">{(r.totalPaidForBuyout || 0).toLocaleString('ru-RU')} ₽</strong>
                      </span>
                      <span className="font-bold text-purple-700 dark:text-purple-300">
                        Остаток: {(r.remainingBuyoutAmount ?? 0).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round(((r.totalPaidForBuyout || 0) / Math.max(1, r.totalBuyoutPrice || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Mobile Touch Action Buttons (min-height 44px) */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-emerald-500/10">
                  <button
                    onClick={() => onOpenPrintAct(r)}
                    className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0"
                    title="Печать Акта"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Акт</span>
                  </button>

                  {r.status === 'BOUGHT_OUT' && !r.depositRefunded && (
                    <button onClick={() => onOpenCloseModal(r)} className="min-h-[44px] px-3 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-sm font-bold">Экипировка и залог</button>
                  )}
                  {!isClosed && (
                    <>
                      <button
                        onClick={() => handleOpenRenewModal(r)}
                        className={`h-11 flex-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                          r.type === 'RENT_TO_OWN'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200'
                            : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                        <span>{r.type === 'RENT_TO_OWN' ? 'Взнос' : 'Продлить'}</span>
                      </button>

                      <button
                        onClick={() => onOpenCloseModal(r)}
                        className="h-11 flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Возврат</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
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
                step="any"
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
                step="any"
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
        maxWidth="3xl"
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
                <div className="flex flex-col justify-between">
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem]">
                    Название тарифа *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Например: Недельный рабочий, Месячный, Выкуп Minako..."
                    value={tariffForm.name}
                    onChange={(e) => setTariffForm({ ...tariffForm, name: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-col justify-between">
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem] flex items-center justify-between">
                    <span>Привязка к модели байка</span>
                    <span className="text-[10px] text-slate-400 font-normal">Опционально</span>
                  </label>
                  <select
                    value={tariffForm.bikeModelId}
                    onChange={(e) => {
                      const selectedModelId = e.target.value;
                      const selectedModel = models.find((m) => m.id === selectedModelId);
                      if (tariffForm.type === 'RENT_TO_OWN') {
                        recalculateBuyoutFromItems(selectedModelId, tariffForm.includedBatteries || []);
                        if (selectedModel) {
                          const p = selectedModel.baseBuyoutPrice || selectedModel.salePrice || 60000;
                          toast.info(`Выбрана модель "${selectedModel.name}". Базовая стоимость: ${p.toLocaleString('ru-RU')} ₽`);
                        }
                      } else {
                        setTariffForm((prev) => ({
                          ...prev,
                          bikeModelId: selectedModelId,
                        }));
                        if (selectedModel) {
                          toast.info(`Выбрана модель "${selectedModel.name}"`);
                        }
                      }
                    }}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-medium text-slate-900 dark:text-white"
                  >
                    <option value="">Все модели (универсальный тариф)</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.powerWatts}W)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col justify-between">
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem]">
                    Тип аренды *
                  </label>
                  <select
                    value={tariffForm.type}
                    onChange={(e) => {
                      const newType = e.target.value as 'STANDARD' | 'RENT_TO_OWN';
                      if (newType === 'RENT_TO_OWN') {
                        recalculateBuyoutFromItems(tariffForm.bikeModelId, tariffForm.includedBatteries || [], {
                          type: 'RENT_TO_OWN',
                          durationDays: tariffForm.durationDays && tariffForm.durationDays > 30 ? tariffForm.durationDays : 180,
                        });
                      } else {
                        setTariffForm((prev) => ({
                          ...prev,
                          type: 'STANDARD',
                          durationDays: prev.durationDays === 180 ? 7 : (prev.durationDays || 7),
                          price: prev.price || 6000,
                        }));
                      }
                    }}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="STANDARD">Обычная аренда (STANDARD)</option>
                    <option value="RENT_TO_OWN">Аренда с выкупом (RENT_TO_OWN)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-between">
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem]">
                    {tariffForm.type === 'RENT_TO_OWN' ? 'Общий срок выкупа (дней) *' : 'Срок аренды (дней) *'}
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="any"
                    value={tariffForm.durationDays}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTariffForm((prev) => {
                        const interval = prev.paymentIntervalDays || 7;
                        const periods = Math.max(1, Math.round(val / interval));
                        const inst = Math.ceil(((prev.totalBuyoutPrice || 0) / periods) / 10) * 10;
                        return {
                          ...prev,
                          durationDays: val,
                          installmentPayment: prev.type === 'RENT_TO_OWN' ? inst : prev.installmentPayment,
                          price: prev.type === 'RENT_TO_OWN' ? inst : prev.price,
                        };
                      });
                    }}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {tariffForm.type === 'RENT_TO_OWN' ? (
                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                      Параметры выкупа (рассрочки)
                    </span>
                    <button
                      type="button"
                      onClick={handleCalculateInstallment}
                      className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                      title="Автоматически рассчитать платеж исходя из общей суммы и интервала"
                    >
                      <Sparkles className="w-3 h-3" />
                      Рассчитать платёж
                    </button>
                  </div>

                  {/* Batteries in buyout section */}
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#0c1611] border border-purple-200 dark:border-purple-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-purple-300 text-xs flex items-center gap-1">
                          🔋 Аккумуляторы в выкупе
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({tariffForm.includedBatteries.length} поз.)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddBuyoutBattery}
                        className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        Добавить АКБ
                      </button>
                    </div>

                    {tariffForm.includedBatteries.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-2 px-3 text-center bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-dashed border-purple-200 dark:border-purple-800/30">
                        Велосипед идет в выкуп без аккумуляторов. Нажмите <strong>«+ Добавить АКБ»</strong>, если в выкуп входят батареи.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-400 px-1">
                          <span className="col-span-6">Модель аккумулятора</span>
                          <span className="col-span-2 text-center">Кол-во</span>
                          <span className="col-span-2 text-right">Цена за шт.</span>
                          <span className="col-span-2 text-right">Итого</span>
                        </div>
                        {tariffForm.includedBatteries.map((item, idx) => {
                          const rowTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
                          return (
                            <div
                              key={idx}
                              className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-50 dark:bg-[#101d17] border border-purple-100 dark:border-purple-900/40 text-xs"
                            >
                              <div className="col-span-6">
                                <select
                                  value={item.batteryModelId}
                                  onChange={(e) =>
                                    handleUpdateBuyoutBattery(idx, { batteryModelId: e.target.value })
                                  }
                                  className="w-full px-2 py-1.5 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-purple-800/40 rounded-lg text-[11px] font-semibold"
                                >
                                  <option value="">-- Выберите модель АКБ --</option>
                                  {batteryModels.map((bm) => (
                                    <option key={bm.id} value={bm.id}>
                                      {bm.name} ({bm.voltage}V {bm.capacityAh}Ah) — {(bm.salePrice || 25000).toLocaleString('ru-RU')} ₽
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  min="1"
                                  step="any"
                                  title="Количество"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateBuyoutBattery(idx, { quantity: Math.max(1, Number(e.target.value)) })
                                  }
                                  className="w-full px-2 py-1.5 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-purple-800/40 rounded-lg text-[11px] font-bold text-center"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  title="Цена за шт. (₽)"
                                  value={item.price}
                                  onChange={(e) =>
                                    handleUpdateBuyoutBattery(idx, { price: Number(e.target.value) })
                                  }
                                  className="w-full px-2 py-1.5 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-purple-800/40 rounded-lg text-[11px] font-bold text-emerald-600 dark:text-emerald-400 text-right"
                                />
                              </div>
                              <div className="col-span-2 flex items-center justify-end gap-1.5">
                                <span className="font-extrabold text-[11px] text-purple-700 dark:text-purple-300">
                                  {rowTotal.toLocaleString('ru-RU')} ₽
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBuyoutBattery(idx)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                                  title="Удалить АКБ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Breakdown bar */}
                    {(() => {
                      const curModel = models.find((m) => m.id === tariffForm.bikeModelId);
                      const bPrice = curModel ? (curModel.baseBuyoutPrice || curModel.salePrice || 60000) : 0;
                      const batsTotal = (tariffForm.includedBatteries || []).reduce(
                        (sum, b) => sum + (Number(b.quantity) || 0) * (Number(b.price) || 0),
                        0
                      );
                      const totalCalculated = bPrice + batsTotal;
                      return (
                        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] pt-1.5 border-t border-purple-100 dark:border-purple-800/30">
                          <span className="text-slate-600 dark:text-slate-400">
                            Авто-расчёт: {curModel ? curModel.name : 'Байк'} ({bPrice.toLocaleString('ru-RU')} ₽)
                            {batsTotal > 0 && ` + АКБ (${batsTotal.toLocaleString('ru-RU')} ₽)`}
                            {' = '}
                            <strong className="font-black text-purple-700 dark:text-purple-300">
                              {totalCalculated.toLocaleString('ru-RU')} ₽
                            </strong>
                          </span>
                          {tariffForm.totalBuyoutPrice !== totalCalculated && totalCalculated > 0 && (
                            <button
                              type="button"
                              onClick={() => recalculateBuyoutFromItems(tariffForm.bikeModelId, tariffForm.includedBatteries)}
                              className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold"
                            >
                              ↻ Применить расчет ({totalCalculated.toLocaleString('ru-RU')} ₽)
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col justify-between">
                      <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem] flex items-center justify-between">
                        <span>Полная выкупная цена (₽) *</span>
                        <span className="text-[10px] text-slate-400 font-normal">можно изменить</span>
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="any"
                        value={tariffForm.totalBuyoutPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const dur = tariffForm.durationDays || 180;
                          const interval = tariffForm.paymentIntervalDays || 7;
                          const periods = Math.max(1, Math.round(dur / interval));
                          const inst = Math.ceil((val / periods) / 10) * 10;
                          setTariffForm({
                            ...tariffForm,
                            totalBuyoutPrice: val,
                            installmentPayment: inst,
                            price: inst,
                          });
                        }}
                        className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-black text-purple-700 dark:text-purple-300"
                      />
                    </div>

                    <div className="flex flex-col justify-between">
                      <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                        Интервал платежей (дней) *
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        step="any"
                        value={tariffForm.paymentIntervalDays}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value));
                          const dur = tariffForm.durationDays || 180;
                          const periods = Math.max(1, Math.round(dur / val));
                          const inst = Math.ceil(((tariffForm.totalBuyoutPrice || 0) / periods) / 10) * 10;
                          setTariffForm({
                            ...tariffForm,
                            paymentIntervalDays: val,
                            installmentPayment: inst,
                            price: inst,
                          });
                        }}
                        className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col justify-between">
                      <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                        Регулярный платёж за интервал (₽) *
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="any"
                        value={tariffForm.installmentPayment}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const total = Number(tariffForm.totalBuyoutPrice) || 0;
                          const interval = Number(tariffForm.paymentIntervalDays) || 7;
                          if (val >= 500 && total > 0) {
                            const periods = Math.max(1, Math.ceil(total / val));
                            const newDur = Math.min(3650, periods * interval);
                            setTariffForm({
                              ...tariffForm,
                              installmentPayment: val,
                              price: val,
                              durationDays: newDur,
                            });
                          } else {
                            setTariffForm({
                              ...tariffForm,
                              installmentPayment: val,
                              price: val,
                            });
                          }
                        }}
                        onBlur={() => {
                          const val = Number(tariffForm.installmentPayment) || 0;
                          const total = Number(tariffForm.totalBuyoutPrice) || 0;
                          const interval = Number(tariffForm.paymentIntervalDays) || 7;
                          if (val > 0 && total > 0) {
                            const periods = Math.max(1, Math.ceil(total / val));
                            const newDur = Math.min(3650, periods * interval);
                            setTariffForm((prev) => ({
                              ...prev,
                              durationDays: newDur,
                            }));
                          }
                        }}
                        className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-black text-emerald-600 dark:text-emerald-400"
                      />
                    </div>

                    <div className="flex flex-col justify-between">
                      <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                        Обязательный залог (₽) *
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="any"
                        value={tariffForm.depositRequired}
                        onChange={(e) =>
                          setTariffForm({ ...tariffForm, depositRequired: Number(e.target.value) })
                        }
                        className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Dynamic Buyout Schedule Summary */}
                  {(() => {
                    const total = Number(tariffForm.totalBuyoutPrice) || 0;
                    const interval = Number(tariffForm.paymentIntervalDays) || 7;
                    const inst = Number(tariffForm.installmentPayment) || 0;
                    const dur = Number(tariffForm.durationDays) || 180;

                    // How many periods are needed to fully pay off total with this installment
                    const periods = inst > 0 && total > 0
                      ? Math.max(1, Math.ceil(total / inst))
                      : Math.max(1, Math.round(dur / interval));

                    const alignedDays = periods * interval;
                    const regularCount = Math.max(0, periods - 1);
                    const regularTotal = regularCount * inst;
                    const finalPayment = Math.max(0, total - regularTotal);
                    const isDurationMismatched = dur !== alignedDays;

                    return (
                      <div className="p-3 rounded-xl bg-purple-100/60 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/40 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 text-[11px]">
                            📊 График выплат: {periods} {periods === 1 ? 'платёж' : periods < 5 ? 'платежа' : 'платежей'} каждые {interval} дн. (срок {alignedDays} дн.)
                          </span>
                          {isDurationMismatched && (
                            <button
                              type="button"
                              onClick={() => {
                                setTariffForm((prev) => ({
                                  ...prev,
                                  durationDays: alignedDays,
                                }));
                                toast.success(`Срок синхронизирован: ${alignedDays} дн. (${periods} нед.)`);
                              }}
                              className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold transition shadow-sm"
                              title="Установить срок тарифа равным рассчитанному сроку погашения"
                            >
                              ↻ Установить срок {alignedDays} дн.
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1.5 border-t border-purple-200/70 dark:border-purple-800/40">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                              {regularCount > 0 ? `Платежи 1–${regularCount}:` : 'Платёж:'}
                            </span>
                            <strong className="text-slate-800 dark:text-slate-100 font-bold">
                              {inst.toLocaleString('ru-RU')} ₽ / {interval} дн.
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Финальный платёж:</span>
                            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {finalPayment.toLocaleString('ru-RU')} ₽ (закрывает долг)
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Итоговая сумма:</span>
                            <strong className="text-purple-700 dark:text-purple-300 font-black">
                              {total.toLocaleString('ru-RU')} ₽ ровно
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col justify-between">
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem]">
                      Стоимость аренды (₽) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="any"
                      value={tariffForm.price}
                      onChange={(e) =>
                        setTariffForm({ ...tariffForm, price: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-black text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  <div className="flex flex-col justify-between">
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem]">
                      Обязательный залог (₽) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="any"
                      value={tariffForm.depositRequired}
                      onChange={(e) =>
                        setTariffForm({ ...tariffForm, depositRequired: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-emerald-500/10">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {[
                    { id: 'ALL', label: 'Все шаблоны' },
                    { id: 'STANDARD', label: 'Аренда' },
                    { id: 'RENT_TO_OWN', label: 'Выкуп (Rent-to-Own)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTariffsFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        tariffsFilter === f.id
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleOpenCreateTariff}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all self-start sm:self-auto shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Создать шаблон
                </button>
              </div>

              {tariffs.filter((t) => tariffsFilter === 'ALL' || t.type === tariffsFilter).length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-emerald-500/20 bg-slate-50/50 dark:bg-[#101d17]/50 space-y-2">
                  <Sliders className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    Шаблоны еще не созданы
                  </p>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    Создайте шаблоны тарифов для быстрой выдачи техники курьерам.
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
                  {tariffs
                    .filter((t) => tariffsFilter === 'ALL' || t.type === tariffsFilter)
                    .map((t) => (
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

      {/* Contact / Phone QR Modal */}
      {selectedContactModal && (
        <PhoneQrModal
          isOpen={!!selectedContactModal}
          onClose={() => setSelectedContactModal(null)}
          phone={selectedContactModal.phone}
          clientName={selectedContactModal.clientName}
          telegram={selectedContactModal.telegram}
          details={selectedContactModal.details}
        />
      )}
    </div>
  );
};
