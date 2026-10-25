import { useCrmRefresh } from '../hooks/useCrmRefresh';
import React, { useState, useEffect } from 'react';
import { LoyaltyTier, Client } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Users,
  Percent,
  Sparkles,
  TrendingUp,
  Search,
  Filter,
  ShieldCheck,
  Bike,
  Wrench,
  ShoppingBag,
  Clock,
  Coins,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const COLOR_OPTIONS = [
  { value: 'amber', label: 'Янтарный / Бронзовый', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-500' },
  { value: 'slate', label: 'Серебристый / Стальной', bg: 'bg-slate-500/10 border-slate-500/30 text-slate-400' },
  { value: 'emerald', label: 'Изумрудный / Золотой', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' },
  { value: 'purple', label: 'Фиолетовый / Платиновый', bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
  { value: 'sky', label: 'Лазурный / Премиум', bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400' },
  { value: 'rose', label: 'Рубиновый', bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400' },
];

export const LoyaltyPage: React.FC = () => {
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tiers' | 'clients'>('tiers');

  // Filters for Clients tab
  const [clientSearch, setClientSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'COURIER' | 'RETAIL'>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');

  // Tier Modal (Create / Edit)
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [tierForm, setTierForm] = useState({
    name: '',
    color: 'amber',
    minRentalDays: 0,
    minTotalSpent: 0,
    discountRentalPercent: 0,
    discountPartsPercent: 0,
    discountRepairsPercent: 0,
    description: '',
    isDefault: false,
  });

  // Client Override Tier Modal
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedClientForOverride, setSelectedClientForOverride] = useState<Client | null>(null);
  const [targetTierId, setTargetTierId] = useState<string>('AUTO'); // 'AUTO' or tier.id

  const loadData = (background = false) => {
    if (!background) setIsLoading(true);
    return Promise.all([api.getLoyaltyTiers(), api.getClients()])
      .then(([tiersData, clientsData]) => {
        setTiers(tiersData);
        setClients(clientsData);
      })
      .catch((err) => toast.error('Ошибка загрузки данных программы лояльности: ' + err.message))
      .finally(() => { if (!background) setIsLoading(false); });
  };

  useCrmRefresh(loadData);

  useEffect(() => {
    loadData();
  }, []);

  // Open Create Tier
  const handleOpenCreateTier = () => {
    setEditingTier(null);
    setTierForm({
      name: '',
      color: 'emerald',
      minRentalDays: 0,
      minTotalSpent: 0,
      discountRentalPercent: 5,
      discountPartsPercent: 5,
      discountRepairsPercent: 5,
      description: '',
      isDefault: false,
    });
    setIsTierModalOpen(true);
  };

  // Open Edit Tier
  const handleOpenEditTier = (tier: LoyaltyTier) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name,
      color: tier.color || 'amber',
      minRentalDays: tier.minRentalDays,
      minTotalSpent: tier.minTotalSpent,
      discountRentalPercent: tier.discountRentalPercent,
      discountPartsPercent: tier.discountPartsPercent,
      discountRepairsPercent: tier.discountRepairsPercent,
      description: tier.description || '',
      isDefault: Boolean(tier.isDefault),
    });
    setIsTierModalOpen(true);
  };

  // Save Tier (Create or Update)
  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierForm.name.trim()) {
      toast.error('Введите название уровня лояльности');
      return;
    }

    try {
      if (editingTier) {
        await api.updateLoyaltyTier(editingTier.id, tierForm);
        toast.success(`Уровень "${tierForm.name}" успешно обновлен`);
      } else {
        await api.createLoyaltyTier(tierForm);
        toast.success(`Уровень "${tierForm.name}" успешно создан`);
      }
      setIsTierModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения уровня лояльности');
    }
  };

  // Delete Tier
  const handleDeleteTier = async (tier: LoyaltyTier) => {
    if (tiers.length <= 1) {
      toast.error('Нельзя удалить единственный оставшийся уровень лояльности');
      return;
    }

    if (!confirm(`Вы действительно хотите удалить уровень "${tier.name}"? Клиенты с этим уровнем будут пересчитаны на автоматический расчет.`)) {
      return;
    }

    try {
      await api.deleteLoyaltyTier(tier.id);
      toast.success(`Уровень "${tier.name}" удален`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления уровня лояльности');
    }
  };

  // Open Override Modal
  const handleOpenOverrideModal = (client: Client) => {
    setSelectedClientForOverride(client);
    setTargetTierId(client.manualLoyaltyTierId || 'AUTO');
    setIsOverrideModalOpen(true);
  };

  // Save Client Override
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForOverride) return;

    try {
      const tierValue = targetTierId === 'AUTO' ? null : targetTierId;
      await api.setClientLoyaltyTier(selectedClientForOverride.id, tierValue);
      toast.success(
        tierValue
          ? `Клиенту ${selectedClientForOverride.fullName} назначен фиксированный уровень`
          : `Клиенту ${selectedClientForOverride.fullName} возвращен автоматический расчет`
      );
      setIsOverrideModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления уровня лояльности клиента');
    }
  };

  // Calculations & KPIs
  const totalTiersCount = tiers.length;
  const totalClientsCount = clients.length;
  const clientsWithDiscountCount = clients.filter((c) => {
    const d = c.loyaltyTier?.discountRentalPercent || 0;
    return d > 0;
  }).length;
  const maxDiscountInProgram = Math.max(
    0,
    ...tiers.map((t) => Math.max(t.discountRentalPercent, t.discountPartsPercent, t.discountRepairsPercent))
  );

  // Filter clients
  const filteredClients = clients.filter((c) => {
    if (typeFilter !== 'ALL') {
      const cType = c.clientType || 'COURIER';
      if (cType !== typeFilter) return false;
    }
    if (tierFilter !== 'ALL') {
      if (c.loyaltyTier?.id !== tierFilter) return false;
    }
    if (clientSearch.trim()) {
      const q = clientSearch.toLowerCase();
      const matchName = c.fullName.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchTelegram = c.telegram?.toLowerCase().includes(q);
      const matchCourier = c.courierService?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchTelegram && !matchCourier) return false;
    }
    return true;
  });

  const getTierColorStyle = (color?: string) => {
    switch (color) {
      case 'amber':
        return {
          badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
          gradient: 'from-amber-500/10 to-transparent',
          border: 'border-amber-500/30',
          accent: 'text-amber-500',
        };
      case 'slate':
        return {
          badge: 'bg-slate-400/10 text-slate-400 border-slate-400/30',
          gradient: 'from-slate-500/10 to-transparent',
          border: 'border-slate-500/30',
          accent: 'text-slate-400',
        };
      case 'emerald':
        return {
          badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
          gradient: 'from-emerald-500/10 to-transparent',
          border: 'border-emerald-500/30',
          accent: 'text-emerald-500',
        };
      case 'purple':
        return {
          badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          gradient: 'from-purple-500/10 to-transparent',
          border: 'border-purple-500/30',
          accent: 'text-purple-400',
        };
      case 'sky':
        return {
          badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          gradient: 'from-sky-500/10 to-transparent',
          border: 'border-sky-500/30',
          accent: 'text-sky-400',
        };
      case 'rose':
        return {
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          gradient: 'from-rose-500/10 to-transparent',
          border: 'border-rose-500/30',
          accent: 'text-rose-400',
        };
      default:
        return {
          badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
          gradient: 'from-slate-500/10 to-transparent',
          border: 'border-slate-500/30',
          accent: 'text-slate-400',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Лояльность и дисконтная программа</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Система лояльности клиентов
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Многоуровневые скидки на аренду, магазин и СТО с гибким расчетом по дням и сумме трат
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="p-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title="Обновить данные"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateTier}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Новый уровень лояльности</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-[#070e0a] rounded-2xl border border-slate-200 dark:border-emerald-500/20 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {totalTiersCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Уровней лояльности
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-[#070e0a] rounded-2xl border border-slate-200 dark:border-emerald-500/20 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {totalClientsCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Клиентов в базе
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-[#070e0a] rounded-2xl border border-slate-200 dark:border-emerald-500/20 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {clientsWithDiscountCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Клиентов со скидкой
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-[#070e0a] rounded-2xl border border-slate-200 dark:border-emerald-500/20 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {maxDiscountInProgram}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Максимальная скидка
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'tiers'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Уровни лояльности ({tiers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'clients'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Клиенты и скидки ({clients.length})</span>
        </button>
      </div>

      {/* TAB 1: TIERS GRID */}
      {activeTab === 'tiers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier, idx) => {
              const style = getTierColorStyle(tier.color);
              return (
                <div
                  key={tier.id}
                  className={`bg-white dark:bg-[#070e0a] rounded-2xl border ${style.border} p-5 flex flex-col justify-between shadow-sm relative overflow-hidden transition hover:shadow-md`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${style.gradient} rounded-bl-full pointer-events-none`} />

                  <div>
                    {/* Tier Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${style.badge}`}>
                            {tier.name}
                          </span>
                          {tier.isDefault && (
                            <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              Старт
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-mono">
                          Уровень #{idx + 1}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditTier(tier)}
                          className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Редактировать уровень"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTier(tier)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Удалить уровень"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Criteria */}
                    <div className="space-y-2 mb-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Условия перехода:
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5" /> Дней аренды:
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          от {tier.minRentalDays} дн.
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Coins className="w-3.5 h-3.5" /> Сумма трат:
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          от {tier.minTotalSpent.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    </div>

                    {/* Discounts list */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Бонусы и привилегии:
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Bike className="w-3.5 h-3.5 text-emerald-500" /> Скидка на аренду:
                        </span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {tier.discountRentalPercent}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-500/20">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <ShoppingBag className="w-3.5 h-3.5 text-sky-500" /> Скидка в магазине:
                        </span>
                        <span className="font-extrabold text-sky-600 dark:text-sky-400">
                          {tier.discountPartsPercent}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Wrench className="w-3.5 h-3.5 text-purple-500" /> Скидка на СТО:
                        </span>
                        <span className="font-extrabold text-purple-600 dark:text-purple-400">
                          {tier.discountRepairsPercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {tier.description && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 italic">
                      "{tier.description}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick info note */}
          <div className="p-4 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-500/20 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white">
                Как работает сквозная лояльность:
              </span>
              <p>
                Система автоматически считает накопленные дни аренды и сумму оплат курьера или розничного клиента (включая аренду, покупки в кассе и ремонт).
                Клиент переходит на следующий ранг, как только достигает порога по дням <b>ИЛИ</b> по сумме покупок.
                Скидки сразу применяются при оформлении новых договоров аренды и чеков в кассовом терминале.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLIENTS TABLE */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#070e0a] p-3 rounded-2xl border border-slate-200 dark:border-emerald-500/20">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по ФИО, телефону, службе..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="ALL">Все типы клиентов</option>
                <option value="COURIER">Только курьеры</option>
                <option value="RETAIL">Розничные клиенты / СТО</option>
              </select>

              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="ALL">Все уровни лояльности</option>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#070e0a] rounded-2xl border border-slate-200 dark:border-emerald-500/20 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Клиент</th>
                    <th className="py-3 px-4">Тип</th>
                    <th className="py-3 px-4">Дней аренды</th>
                    <th className="py-3 px-4">Сумма трат</th>
                    <th className="py-3 px-4">Текущий уровень</th>
                    <th className="py-3 px-4">Скидки</th>
                    <th className="py-3 px-4">Режим</th>
                    <th className="py-3 px-4 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Клиентов по заданным фильтрам не найдено
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => {
                      const tier = client.loyaltyTier;
                      const style = getTierColorStyle(tier?.color);
                      const isManual = client.loyaltyMode === 'MANUAL';
                      const isRetail = client.clientType === 'RETAIL';

                      return (
                        <tr
                          key={client.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {client.fullName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {client.phone}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isRetail ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/30">
                                Розничный / СТО
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                                {client.courierService || 'Курьер'}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {client.totalRentalDays || 0} дн.
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {(client.totalSpent || 0).toLocaleString('ru-RU')} ₽
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${style.badge}`}>
                              {tier?.name || 'Базовый'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-emerald-500 font-bold" title="Скидка на аренду">
                                🚲 {tier?.discountRentalPercent || 0}%
                              </span>
                              <span className="text-sky-500 font-bold" title="Скидка в магазине">
                                ⚙️ {tier?.discountPartsPercent || 0}%
                              </span>
                              <span className="text-purple-500 font-bold" title="Скидка на ремонт">
                                🔧 {tier?.discountRepairsPercent || 0}%
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isManual ? (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 cursor-help"
                                title="Уровень зафиксирован менеджером вручную"
                              >
                                Вручную
                              </span>
                            ) : (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/30 cursor-help"
                                title="Рассчитан автоматически по истории трат и аренды"
                              >
                                Автоматически
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenOverrideModal(client)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-300 hover:text-emerald-500 rounded-lg text-xs font-semibold transition border border-slate-200 dark:border-slate-700"
                            >
                              Изменить ранг
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Create / Edit Tier */}
      <Modal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        title={editingTier ? `Редактирование уровня "${editingTier.name}"` : 'Новый уровень лояльности'}
        subtitle="Настройка порогов квалификации и скидок на аренду, магазин и СТО"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTier} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Название уровня *
            </label>
            <input
              required
              type="text"
              placeholder="Например: Серебро, Золото, VIP Партнер"
              value={tierForm.name}
              onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Цветовое оформление
              </label>
              <select
                value={tierForm.color}
                onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={tierForm.isDefault}
                  onChange={(e) => setTierForm({ ...tierForm, isDefault: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Стартовый уровень по умолчанию</span>
              </label>
            </div>
          </div>

          {/* Qualification thresholds */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Пороги квалификации (автоматический переход):
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Мин. срок аренды (дней)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tierForm.minRentalDays}
                  onChange={(e) => setTierForm({ ...tierForm, minRentalDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Мин. сумма трат (₽)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={tierForm.minTotalSpent}
                  onChange={(e) => setTierForm({ ...tierForm, minTotalSpent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Discounts */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Скидки и привилегии уровня (%):
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Bike className="w-3 h-3 text-emerald-500" /> Аренда, %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tierForm.discountRentalPercent}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, discountRentalPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-sky-500" /> Магазин, %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tierForm.discountPartsPercent}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, discountPartsPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-purple-500" /> СТО / Ремонт, %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tierForm.discountRepairsPercent}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, discountRepairsPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-purple-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Описание привилегий / Примечание
            </label>
            <textarea
              rows={2}
              placeholder="Краткое описание уровня, например: Выдается при аренде от 1 месяца"
              value={tierForm.description}
              onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsTierModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
            >
              Сохранить уровень
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Change / Override Client Tier */}
      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title="Назначение уровня лояльности"
        subtitle={selectedClientForOverride ? `Клиент: ${selectedClientForOverride.fullName} (${selectedClientForOverride.phone})` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleSaveOverride} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
            <div className="text-slate-500">
              Фактическая статистика клиента:
            </div>
            <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
              <span>Дней аренды:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {selectedClientForOverride?.totalRentalDays || 0} дн.
              </span>
            </div>
            <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
              <span>Всего потрачено (аренда, магазин, СТО):</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {(selectedClientForOverride?.totalSpent || 0).toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Выберите вариант присвоения ранга:
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 cursor-pointer transition">
                <input
                  type="radio"
                  name="tierTarget"
                  value="AUTO"
                  checked={targetTierId === 'AUTO'}
                  onChange={() => setTargetTierId('AUTO')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Автоматический расчет (рекомендуется)</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Система сама подбирает ранг по фактическим дням аренды и сумме трат
                  </div>
                </div>
              </label>

              {tiers.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 cursor-pointer transition"
                >
                  <input
                    type="radio"
                    name="tierTarget"
                    value={t.id}
                    checked={targetTierId === t.id}
                    onChange={() => setTargetTierId(t.id)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {t.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Скидки: {t.discountRentalPercent}% аренда / {t.discountPartsPercent}% магазин / {t.discountRepairsPercent}% СТО
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      Ручной оверрайд
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOverrideModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
            >
              Применить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
