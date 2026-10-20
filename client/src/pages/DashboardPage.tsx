import React, { useState } from 'react';
import { DashboardStats, User } from '../types';
import { RevenueAnalyticsDashboard } from '../components/dashboard/RevenueAnalyticsDashboard';
import { PhoneQrModal } from '../components/PhoneQrModal';
import { DashboardChatWidget } from '../components/chat/DashboardChatWidget';
import {
  Bike as BikeIcon,
  KeyRound,
  Wrench,
  Boxes,
  Users,
  CreditCard,
  Plus,
  Phone,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Ban,
  Activity,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Layers,
  Lock,
  QrCode,
  MessageSquare,
} from 'lucide-react';

interface DashboardPageProps {
  stats: DashboardStats | null;
  onOpenCheckoutWizard: () => void;
  onNavigateToTab: (tab: string) => void;
  currentUser?: User | null;
  onOpenChat?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  onOpenCheckoutWizard,
  onNavigateToTab,
  currentUser,
  onOpenChat,
}) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Загрузка метрик дашборда...
      </div>
    );
  }

  const { fleet, rentals, repairs, inventory, financials } = stats;

  const totalRev = financials.totalRevenue || 0;
  const rentalPercent = totalRev > 0 ? Math.round((financials.rentalRevenue / totalRev) * 100) : 0;
  const buyoutPercent = totalRev > 0 ? Math.round(((financials.buyoutRevenue || 0) / totalRev) * 100) : 0;
  const retailPercent = totalRev > 0 ? Math.round(((financials.retailRevenue || 0) / totalRev) * 100) : 0;
  const repairPercent = totalRev > 0 ? Math.round(((financials.clientRepairRevenue || 0) / totalRev) * 100) : 0;
  const outfitPercent = totalRev > 0 ? Math.round(((financials.outfitRevenue || 0) / totalRev) * 100) : 0;

  const activeBikes = fleet.activeParkBikes || 0;
  const rentedPct = activeBikes > 0 ? Math.round((fleet.rentedBikes / activeBikes) * 100) : 0;
  const availablePct = activeBikes > 0 ? Math.round((fleet.availableBikes / activeBikes) * 100) : 0;
  const maintenancePct = activeBikes > 0 ? Math.round((fleet.maintenanceBikes / activeBikes) * 100) : 0;

  const currentDateStr = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const [viewMode, setViewMode] = useState<'monitoring' | 'analytics'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get('mode') as 'monitoring' | 'analytics';
      if (urlMode === 'monitoring' || urlMode === 'analytics') return urlMode;
    }
    return (
      (localStorage.getItem('crm_dashboard_mode') as 'monitoring' | 'analytics') ||
      'monitoring'
    );
  });

  const [selectedPhoneCall, setSelectedPhoneCall] = useState<{
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

  const handleToggleMode = (mode: 'monitoring' | 'analytics') => {
    setViewMode(mode);
    try {
      localStorage.setItem('crm_dashboard_mode', mode);
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header Bar: Clean Russian Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Сводка и ключевые показатели (KPI)
          </h2>
          <p className="text-xs text-slate-500 dark:text-emerald-400/80 mt-0.5 font-medium">
            Операционный мониторинг парка техники, договоров аренды, кассы и мастерской
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-500/25 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-400 text-[11px]">Обновлено:</span>
            <span>{currentDateStr}</span>
          </div>

          <button
            onClick={onOpenCheckoutWizard}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Оформить аренду
          </button>
        </div>
      </div>

      {/* Mode Switcher: Classic Monitoring vs Recharts Financial Analytics */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-white dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-500/25 shadow-2xs">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => handleToggleMode('monitoring')}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              viewMode === 'monitoring'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#12241b]'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Мониторинг</span>
            <span className="hidden sm:inline">Операционный мониторинг</span>
          </button>

          <button
            onClick={() => handleToggleMode('analytics')}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              viewMode === 'analytics'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#12241b]'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Аналитика KPI</span>
            <span className="hidden sm:inline">Финансовая аналитика & KPI</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 px-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Синхронизировано с базой данных парка</span>
        </div>
      </div>

      {viewMode === 'analytics' ? (
        <RevenueAnalyticsDashboard
          stats={stats}
          onOpenCheckoutWizard={onOpenCheckoutWizard}
          onNavigateToTab={onNavigateToTab}
        />
      ) : (
        <>
          {/* Row 1: 4 Key Indicator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Fleet Utilization */}
        <div
          onClick={() => onNavigateToTab('bikes')}
          className="contour-card p-5 cursor-pointer flex flex-col justify-between hover:border-emerald-500/50 transition-all"
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Загрузка парка техники
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-emerald-400">
                    {fleet.fleetUtilization}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {fleet.rentedBikes} из {fleet.activeParkBikes} байков на линии
                </p>
              </div>

              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Real Segmented Progress Bar */}
          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-emerald-500/15">
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${rentedPct}%` }}
                title={`В аренде: ${fleet.rentedBikes} шт.`}
                className="bg-emerald-500 h-full"
              />
              <div
                style={{ width: `${availablePct}%` }}
                title={`Свободно: ${fleet.availableBikes} шт.`}
                className="bg-sky-500 h-full"
              />
              <div
                style={{ width: `${maintenancePct}%` }}
                title={`В ремонте: ${fleet.maintenanceBikes} шт.`}
                className="bg-amber-500 h-full"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> В аренде: {fleet.rentedBikes}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> Свободно: {fleet.availableBikes}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> В СТО: {fleet.maintenanceBikes}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Rentals */}
        <div
          onClick={() => onNavigateToTab('rentals')}
          className="contour-card p-5 cursor-pointer flex flex-col justify-between hover:border-sky-500/50 transition-all"
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Действующие договоры
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {rentals.activeRentalsCount}
                  </span>
                  <span className="text-xs text-sky-500 font-bold">
                    активно
                  </span>
                </div>
                <p className="text-[11px] mt-0.5">
                  {rentals.overdueCount > 0 ? (
                    <span className="text-rose-500 font-bold">⚠️ Просрочено: {rentals.overdueCount} договоров!</span>
                  ) : (
                    <span className="text-emerald-500 font-medium">✓ Все курьеры платят вовремя</span>
                  )}
                </p>
              </div>

              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-500 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-emerald-500/15 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Залогов в кассе:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {financials.activeDepositsHeld.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        {/* Card 3: Total Revenue */}
        <div
          onClick={() => onNavigateToTab('finance')}
          className="contour-card p-5 cursor-pointer flex flex-col justify-between hover:border-emerald-500/50 transition-all"
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Общая выручка кассы
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {financials.totalRevenue.toLocaleString('ru-RU')}
                  </span>
                  <span className="text-sm font-bold text-emerald-500">₽</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Все фактические поступления
                </p>
              </div>

              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-500 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-emerald-500/15 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
            <span>Аренда: <strong className="text-slate-700 dark:text-slate-200">{financials.rentalRevenue.toLocaleString('ru-RU')} ₽</strong></span>
            <span>Выкуп: <strong className="text-purple-600 dark:text-purple-400">{(financials.buyoutRevenue || 0).toLocaleString('ru-RU')} ₽</strong></span>
            <span>Магазин: <strong className="text-slate-700 dark:text-slate-200">{(financials.retailRevenue || 0).toLocaleString('ru-RU')} ₽</strong></span>
          </div>
        </div>

        {/* Card 4: Net Margin / Profit */}
        {(() => {
          const canSeeProfits = !currentUser?.accessLevel || currentUser.accessLevel.canSeeProfits !== false;
          return (
            <div
              onClick={() => onNavigateToTab('finance')}
              className="contour-card p-5 cursor-pointer flex flex-col justify-between hover:border-emerald-500/50 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Чистая прибыль
                    </span>
                    {canSeeProfits ? (
                      <>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span
                            className={`text-3xl font-black ${
                              financials.netMargin >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-500'
                            }`}
                          >
                            {financials.netMargin >= 0 ? '+' : ''}
                            {financials.netMargin.toLocaleString('ru-RU')}
                          </span>
                          <span className="text-sm font-bold text-emerald-500">₽</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {financials.monthlyFixedExpenses && financials.monthlyFixedExpenses > 0
                            ? `За вычетом запчастей, ФОТ и фикс. расходов (${financials.monthlyFixedExpenses.toLocaleString('ru-RU')} ₽)`
                            : 'За вычетом запчастей и ФОТ'}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-xl sm:text-2xl font-black text-amber-500 flex items-center gap-1.5">
                            <Lock className="w-5 h-5 shrink-0" />
                            🔒 Скрыто (P&L)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                          Доступно только руководителю
                        </p>
                      </>
                    )}
                  </div>

                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-emerald-500/15 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
                <span>Фикс. расходы (аренда):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {canSeeProfits
                    ? `${((financials.monthlyFixedExpenses !== undefined ? financials.monthlyFixedExpenses : financials.fixedExpenses) || 0).toLocaleString('ru-RU')} ₽`
                    : '🔒 Скрыто'}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Row 2: Fleet Status Cards (Свободно, В аренде, В мастерской, Списано) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available */}
        <div
          onClick={() => onNavigateToTab('bikes')}
          className="contour-card p-4 cursor-pointer flex items-center justify-between hover:border-emerald-500/40 transition-all"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Свободно на базе
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {fleet.availableBikes} <span className="text-xs font-normal text-slate-400">шт.</span>
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Готовы к выдаче курьерам
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* On Rent */}
        <div
          onClick={() => onNavigateToTab('bikes')}
          className="contour-card p-4 cursor-pointer flex items-center justify-between hover:border-sky-500/40 transition-all"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              В аренде у курьеров
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {fleet.rentedBikes} <span className="text-xs font-normal text-slate-400">шт.</span>
            </p>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
              На линии, приносят доход
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-500 flex items-center justify-center shrink-0">
            <BikeIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Maintenance */}
        <div
          onClick={() => onNavigateToTab('repairs')}
          className="contour-card p-4 cursor-pointer flex items-center justify-between hover:border-amber-500/40 transition-all"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              В мастерской СТО
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {fleet.maintenanceBikes} <span className="text-xs font-normal text-slate-400">шт.</span>
            </p>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              На диагностике или ТО
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        {/* Retired / For Sale */}
        <div
          onClick={() => onNavigateToTab('bikes')}
          className="contour-card p-4 cursor-pointer flex items-center justify-between hover:border-slate-400/40 transition-all"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Списано / В магазине
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {fleet.decommissionedBikes + fleet.forSaleBikes + (fleet.soldBikes || 0)} <span className="text-xs font-normal text-slate-400">шт.</span>
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Выбыли из аренды
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-500/10 border border-slate-500/30 text-slate-500 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Row 3: Real Operational Analytics (Model Breakdown & Revenue Structure) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Real Models Utilization Breakdown */}
        <div className="contour-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-500/20">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Занятость парка по моделям техники
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Соотношение байков на линии и на складе по каждой модели
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('bikes')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                Все модели →
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {(!stats.modelsBreakdown || stats.modelsBreakdown.length === 0) ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <p>В парке пока нет добавленных моделей техники.</p>
                  <button
                    onClick={() => onNavigateToTab('bikes')}
                    className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    + Добавить электровелосипеды в парк
                  </button>
                </div>
              ) : (
                stats.modelsBreakdown.map((m) => (
                  <div key={m.modelId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {m.name} {m.powerWatts ? `(${m.powerWatts}W)` : ''}
                      </span>
                      <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
                        {m.rented} из {m.total} на линии ({m.utilization}%)
                      </span>
                    </div>

                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${m.utilization}%` }}
                        className="bg-emerald-500 h-full rounded-full transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>Свободно: <strong className="text-slate-700 dark:text-slate-300">{m.available}</strong></span>
                      {m.maintenance > 0 && (
                        <span className="text-amber-500">В ремонте: <strong>{m.maintenance}</strong></span>
                      )}
                      <span>Всего в парке: <strong className="text-slate-700 dark:text-slate-300">{m.total}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-emerald-500/15 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-4">
            <span>Всего моделей в парке: <strong className="text-slate-800 dark:text-slate-200">{stats.modelsBreakdown?.length || 0}</strong></span>
            <span>Рабочий парк: <strong className="text-emerald-600 dark:text-emerald-400">{fleet.activeParkBikes} байков</strong></span>
          </div>
        </div>

        {/* Right: Revenue Structure Breakdown */}
        <div className="contour-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-500/20">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Структура доходов и кассовый баланс
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Распределение денежных поступлений по источникам
                </p>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                Всего: {totalRev.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {/* Rental Revenue Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                    Аренда электровелосипедов
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {financials.rentalRevenue.toLocaleString('ru-RU')} ₽ ({rentalPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div style={{ width: `${rentalPercent}%` }} className="bg-emerald-500 h-full" />
                </div>
              </div>

              {/* Buyout Revenue Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />
                    Выкуп электровелосипедов (Rent-to-Own)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(financials.buyoutRevenue || 0).toLocaleString('ru-RU')} ₽ ({buyoutPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div style={{ width: `${buyoutPercent}%` }} className="bg-purple-500 h-full" />
                </div>
              </div>

              {/* Retail Revenue Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block" />
                    Продажи в магазине
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(financials.retailRevenue || 0).toLocaleString('ru-RU')} ₽ ({retailPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div style={{ width: `${retailPercent}%` }} className="bg-sky-500 h-full" />
                </div>
              </div>

              {/* Client Repairs Revenue Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
                    Платный ремонт и ТО курьеров
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(financials.clientRepairRevenue || 0).toLocaleString('ru-RU')} ₽ ({repairPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div style={{ width: `${repairPercent}%` }} className="bg-amber-500 h-full" />
                </div>
              </div>

              {/* Outfit Sales Revenue Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />
                    Экипировка и аксессуары
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(financials.outfitRevenue || 0).toLocaleString('ru-RU')} ₽ ({outfitPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div style={{ width: `${outfitPercent}%` }} className="bg-purple-500 h-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 mt-4 rounded-xl bg-slate-50 dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-500/15 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">Залоговый фонд на удержании:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {financials.activeDepositsHeld.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block">Клиентов в базе:</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.totalClients || 0} чел.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Urgent Attention - Overdue Rentals Table */}
      {rentals.urgentOverdueRentals && rentals.urgentOverdueRentals.length > 0 && (
        <div className="contour-card-rose overflow-hidden">
          <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-rose-800 dark:text-rose-200">
              <ShieldAlert className="w-5 h-5 text-rose-600 animate-bounce" />
              <h3 className="font-extrabold text-sm">
                Срочное внимание: Просроченные договоры аренды ({rentals.urgentOverdueRentals.length})
              </h3>
            </div>
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              Требуется связаться с курьерами
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold whitespace-nowrap">Договор</th>
                  <th className="p-3.5 font-semibold whitespace-nowrap">Курьер</th>
                  <th className="p-3.5 font-semibold whitespace-nowrap">Служба доставки</th>
                  <th className="p-3.5 font-semibold whitespace-nowrap">Байк</th>
                  <th className="p-3.5 font-semibold text-center whitespace-nowrap">Просрочка</th>
                  <th className="p-3.5 font-semibold whitespace-nowrap">Залог в базе</th>
                  <th className="p-3.5 font-semibold text-right whitespace-nowrap">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {rentals.urgentOverdueRentals.map((item) => (
                  <tr key={item.rentalId} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white font-mono whitespace-nowrap">
                      {item.rentalNumber}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {item.clientName}
                      </p>
                      <p className="text-[10px] text-slate-400">{item.clientPhone}</p>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] whitespace-nowrap">
                        {item.courierService || 'Яндекс Еда'}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                      {item.bikeInventoryNumber}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white font-black text-[10px] shadow-xs shadow-rose-500/50 animate-pulse">
                        +{item.daysOverdue} дн.
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {item.depositAmount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPhoneCall({
                              phone: item.clientPhone,
                              clientName: item.clientName,
                              telegram: item.clientTelegram,
                              details: {
                                rentalNumber: item.rentalNumber,
                                bikeInventoryNumber: item.bikeInventoryNumber,
                                daysOverdue: item.daysOverdue,
                                courierService: item.courierService,
                                telegram: item.clientTelegram,
                              },
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all hover:scale-105 active:scale-95"
                          title="Показать QR-код для мгновенного набора номера смартфоном или связи в Telegram"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR Звонок</span>
                        </button>

                        <a
                          href={`tel:${item.clientPhone}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Прямой вызов через приложение (tel:)"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Touch / Card layout < md) */}
          <div className="block md:hidden p-3 space-y-3">
            {rentals.urgentOverdueRentals.map((item) => (
              <div
                key={item.rentalId}
                className="p-3.5 rounded-xl bg-white dark:bg-[#12080a] border border-rose-200 dark:border-rose-900/50 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    {item.rentalNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] shadow-xs animate-pulse">
                    +{item.daysOverdue} дн.
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {item.clientName}
                    </p>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {item.courierService || 'Яндекс Еда'} • Байк {item.bikeInventoryNumber}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Залог: {item.depositAmount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${item.clientPhone}`}
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Позвонить ({item.clientPhone})</span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhoneCall({
                        phone: item.clientPhone,
                        clientName: item.clientName,
                        telegram: item.clientTelegram,
                        details: {
                          rentalNumber: item.rentalNumber,
                          bikeInventoryNumber: item.bikeInventoryNumber,
                          daysOverdue: item.daysOverdue,
                          courierService: item.courierService,
                          telegram: item.clientTelegram,
                        },
                      })
                    }
                    className="w-11 h-11 flex items-center justify-center bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl transition hover:bg-rose-100 shrink-0"
                    title="Показать QR-код и Telegram"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 5: Operational Columns - Recent Payments, Low Stock alerts & Team Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <div className="contour-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-500/20">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Последние поступления в кассу
            </h3>
            <button
              onClick={() => onNavigateToTab('finance')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-semibold"
            >
              Вся касса <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            {stats.recentPayments.length === 0 ? (
              <p className="text-slate-400 italic text-center py-4">Нет операций за последнее время</p>
            ) : (
              stats.recentPayments.map((p) => {
                const isExpense = p.type === 'DEPOSIT_REFUND' || p.type === 'SALARY_PAYMENT' || p.type === 'PART_PURCHASE';
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1813] border border-slate-100 dark:border-emerald-500/20 flex items-center justify-between transition-colors hover:border-emerald-500/40"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {p.description || `Платеж ${p.type}`}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(p.createdAt).toLocaleString('ru-RU')} • Способ: {p.method}
                      </p>
                    </div>
                    <span
                      className={`font-black text-xs ${
                        isExpense
                          ? 'text-rose-600'
                          : p.type === 'BUYOUT'
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {p.amount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Low Stock Parts alert */}
        <div className="contour-card-amber p-5">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200 dark:border-amber-900/60">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-500" />
              Дефицит запчастей на складе
            </h3>
            <button
              onClick={() => onNavigateToTab('inventory')}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 font-semibold"
            >
              Склад запчастей <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            {inventory.lowStockParts.length === 0 ? (
              <p className="text-slate-400 italic text-center py-4">Все запчасти в достаточном количестве</p>
            ) : (
              inventory.lowStockParts.map((part) => (
                <div
                  key={part.id}
                  className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between transition-colors hover:border-amber-500/60"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {part.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-amber-400/80">
                      Артикул: {part.sku} • Порог: {part.minQuantity} шт.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-black text-[11px] shadow-xs">
                      Остаток: {part.quantity} шт.
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Chat Widget */}
        <DashboardChatWidget
          currentUser={currentUser}
          onOpenFullChat={onOpenChat || (() => {})}
        />
      </div>
        </>
      )}

      {/* Phone QR Call Modal */}
      {selectedPhoneCall && (
        <PhoneQrModal
          isOpen={!!selectedPhoneCall}
          onClose={() => setSelectedPhoneCall(null)}
          phone={selectedPhoneCall.phone}
          clientName={selectedPhoneCall.clientName}
          telegram={selectedPhoneCall.telegram}
          details={selectedPhoneCall.details}
        />
      )}
    </div>
  );
};

