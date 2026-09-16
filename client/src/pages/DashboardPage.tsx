import React, { useState } from 'react';
import { DashboardStats } from '../types';
import {
  Bike as BikeIcon,
  KeyRound,
  AlertTriangle,
  TrendingUp,
  Wrench,
  Boxes,
  Users,
  CreditCard,
  Plus,
  RotateCcw,
  Phone,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  Calendar,
  ChevronDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Ban,
  Activity,
  BarChart3,
  Layers,
} from 'lucide-react';

interface DashboardPageProps {
  stats: DashboardStats | null;
  onOpenCheckoutWizard: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  onOpenCheckoutWizard,
  onNavigateToTab,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('week');

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Загрузка метрик дашборда...
      </div>
    );
  }

  const { fleet, rentals, repairs, inventory, financials } = stats;

  return (
    <div className="space-y-6">
      {/* Header Bar: Fleet Performance Overview & Period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Fleet Performance Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-emerald-400/70 mt-0.5 font-medium">
            Операционный мониторинг парка, договоров аренды и технического состояния
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-500/25 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-400 text-[11px]">Updated:</span>
            <span>Сегодня</span>
          </div>

          {/* Period selector */}
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-white dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-500/25 text-xs font-bold text-slate-800 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 shadow-2xs cursor-pointer"
            >
              <option value="week">All. Неделя</option>
              <option value="month">All. Месяц</option>
              <option value="quarter">All. Квартал</option>
              <option value="year">All. Год</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={onOpenCheckoutWizard}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Новая аренда
          </button>
        </div>
      </div>

      {/* Row 1: 4 Large Contoured KPI Cards with embedded SVG Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Fleet Utilization */}
        <div
          onClick={() => onNavigateToTab('bikes')}
          className="contour-card p-5 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Total Fleet Utilization
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-emerald-400">
                    {fleet.fleetUtilization}%
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                    <ArrowUp className="w-3 h-3" />
                    +{Math.round(fleet.fleetUtilization / 10)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ({fleet.rentedBikes} из {fleet.activeParkBikes} байков на линии)
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-xs">
                <Activity className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* SVG Spline Area Chart */}
          <div className="mt-4 pt-2">
            <svg viewBox="0 0 280 80" className="w-full h-20 overflow-visible">
              <defs>
                <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="280" y2="20" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" strokeDasharray="3 3" />
              <line x1="0" y1="45" x2="280" y2="45" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="280" y2="70" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" />
              {/* Filled Area */}
              <path
                d="M 0 70 Q 35 60 70 40 T 140 50 T 210 20 T 280 15 L 280 75 L 0 75 Z"
                fill="url(#utilGrad)"
              />
              {/* Smooth Spline Curve */}
              <path
                d="M 0 70 Q 35 60 70 40 T 140 50 T 210 20 T 280 15"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Active Dot */}
              <circle cx="280" cy="15" r="4" fill="#10b981" className="animate-pulse" />
            </svg>
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Rentals */}
        <div
          onClick={() => onNavigateToTab('rentals')}
          className="contour-card p-5 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Active Rentals
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {rentals.activeRentalsCount}
                  </span>
                  <span className="text-xs text-emerald-500 font-black flex items-center gap-0.5">
                    <ArrowUp className="w-3.5 h-3.5" />
                    {rentals.activeRentalsCount > 0 ? '+15%' : '0%'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {rentals.overdueCount > 0 ? (
                    <span className="text-rose-500 font-bold">Внимание: {rentals.overdueCount} должника!</span>
                  ) : (
                    <span className="text-emerald-500">Все оплаты внесены в срок</span>
                  )}
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-500 flex items-center justify-center shadow-xs">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* SVG Monthly Curve */}
          <div className="mt-4 pt-2">
            <svg viewBox="0 0 280 80" className="w-full h-20 overflow-visible">
              <defs>
                <linearGradient id="rentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="20" x2="280" y2="20" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" strokeDasharray="3 3" />
              <line x1="0" y1="45" x2="280" y2="45" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="280" y2="70" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" />
              <path
                d="M 0 65 Q 40 45 80 50 T 160 40 T 240 18 L 280 12 L 280 75 L 0 75 Z"
                fill="url(#rentGrad)"
              />
              <path
                d="M 0 65 Q 40 45 80 50 T 160 40 T 240 18 L 280 12"
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="280" cy="12" r="4" fill="#0ea5e9" />
            </svg>
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>
          </div>
        </div>

        {/* Card 3: Revenue (Last 30 Days) */}
        <div
          onClick={() => onNavigateToTab('finance')}
          className="contour-card p-5 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Revenue
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {financials.totalRevenue.toLocaleString('ru-RU')}
                  </span>
                  <span className="text-sm font-bold text-emerald-500">₽</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  (Last 30 Days: {financials.totalRevenue.toLocaleString('ru-RU')} ₽)
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-500 flex items-center justify-center shadow-xs">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Vertical Glowing Bar Chart */}
          <div className="mt-4 pt-2">
            <svg viewBox="0 0 280 80" className="w-full h-20 overflow-visible">
              <line x1="0" y1="20" x2="280" y2="20" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" strokeDasharray="3 3" />
              <line x1="0" y1="45" x2="280" y2="45" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="280" y2="70" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" />
              {/* Bars */}
              {[
                { x: 15, h: 32 },
                { x: 50, h: 48 },
                { x: 85, h: 40 },
                { x: 120, h: 56 },
                { x: 155, h: 65 },
                { x: 190, h: 44 },
                { x: 225, h: 58 },
                { x: 260, h: 46 },
              ].map((b, i) => (
                <g key={i}>
                  <rect
                    x={b.x}
                    y={70 - b.h}
                    width="14"
                    height={b.h}
                    rx="3"
                    className="fill-emerald-500/85 hover:fill-emerald-400 transition-colors"
                  />
                  <rect
                    x={b.x}
                    y={70 - b.h}
                    width="14"
                    height={b.h}
                    rx="3"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1"
                    className="opacity-60"
                  />
                </g>
              ))}
            </svg>
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
              <span>0</span>
              <span>6</span>
              <span>12</span>
              <span>15</span>
              <span>20</span>
              <span>29</span>
              <span>30</span>
            </div>
          </div>
        </div>

        {/* Card 4: Net Profit / Чистая маржа */}
        <div
          onClick={() => onNavigateToTab('finance')}
          className="contour-card p-5 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Net Profit (Чистая прибыль)
                </span>
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
                <p className="text-[11px] text-slate-400 mt-0.5">
                  За вычетом деталей ({financials.totalPartsCost} ₽) и ФОТ
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* SVG Profit Growth Curve */}
          <div className="mt-4 pt-2">
            <svg viewBox="0 0 280 80" className="w-full h-20 overflow-visible">
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="20" x2="280" y2="20" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" strokeDasharray="3 3" />
              <line x1="0" y1="45" x2="280" y2="45" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="280" y2="70" stroke="currentColor" className="text-slate-100 dark:text-emerald-950/60" />
              <path
                d="M 0 70 Q 40 30 80 48 T 160 22 T 240 18 L 280 8 L 280 75 L 0 75 Z"
                fill="url(#profitGrad)"
              />
              <path
                d="M 0 70 Q 40 30 80 48 T 160 22 T 240 18 L 280 8"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="280" cy="8" r="4" fill="#10b981" />
            </svg>
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 4 Sleek Contoured Status Cards (Available, On Rent, Maintenance, Retired) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available */}
        <div
          onClick={() => onNavigateToTab('bikes')}
          className="contour-card p-4 cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Available (Свободно)
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {fleet.availableBikes}
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
          className="contour-card p-4 cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              On Rent (В аренде)
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {fleet.rentedBikes}
            </p>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
              Генерируют доход
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-500 flex items-center justify-center shrink-0">
            <BikeIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Maintenance */}
        <div
          onClick={() => onNavigateToTab('repairs')}
          className="contour-card p-4 cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Maintenance (В СТО)
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {fleet.maintenanceBikes}
            </p>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              В сервисной мастерской
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        {/* Retired / Decommissioned */}
        <div
          onClick={() => onNavigateToTab('bikes')}
          className="contour-card p-4 cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Retired (Списано)
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {fleet.decommissionedBikes + fleet.forSaleBikes}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Выбыли / Продажа
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-500/10 border border-slate-500/30 text-slate-500 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Row 3: 2 Wide Analytical Cards (Fleet Utilization Trend & Revenue by Model) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Fleet Utilization Trend (Last 6 Months) */}
        <div className="contour-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-500/20">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Fleet Utilization Trend (Last 6 Months)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Процент активной занятости парка по месяцам
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-xs">
              AVG: 68%
            </span>
          </div>

          <div className="mt-5">
            <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
              <defs>
                <linearGradient id="wideUtilGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Y Grid & Axis labels */}
              {[
                { y: 30, label: '100%' },
                { y: 65, label: '80%' },
                { y: 100, label: '60%' },
                { y: 135, label: '40%' },
                { y: 170, label: '20%' },
              ].map((g, i) => (
                <g key={i}>
                  <line
                    x1="45"
                    y1={g.y}
                    x2="500"
                    y2={g.y}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-emerald-950/70"
                    strokeDasharray="4 4"
                  />
                  <text x="5" y={g.y + 4} className="fill-slate-400 text-[10px] font-mono">
                    {g.label}
                  </text>
                </g>
              ))}

              {/* Area Spline */}
              <path
                d="M 50 140 Q 110 90 170 125 T 290 55 T 410 40 L 490 60 L 490 180 L 50 180 Z"
                fill="url(#wideUtilGrad)"
              />
              <path
                d="M 50 140 Q 110 90 170 125 T 290 55 T 410 40 L 490 60"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Data points */}
              {[
                { cx: 50, cy: 140, val: '42%' },
                { cx: 135, cy: 98, val: '64%' },
                { cx: 220, cy: 110, val: '58%' },
                { cx: 305, cy: 52, val: '86%' },
                { cx: 395, cy: 42, val: '92%' },
                { cx: 490, cy: 60, val: '80%' },
              ].map((pt, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle cx={pt.cx} cy={pt.cy} r="5" fill="#10b981" className="shadow-lg" />
                  <circle cx={pt.cx} cy={pt.cy} r="8" fill="#10b981" className="opacity-20 group-hover:opacity-60 transition-opacity" />
                </g>
              ))}
            </svg>

            {/* X Labels */}
            <div className="flex justify-between pl-10 pr-2 text-xs font-semibold text-slate-400 dark:text-slate-400 mt-2">
              <span>January</span>
              <span>February</span>
              <span>March</span>
              <span>April</span>
              <span>May</span>
              <span>June</span>
            </div>
          </div>
        </div>

        {/* Right: Revenue by Vehicle Type / Model (Outlined Contoured Bar Chart) */}
        <div className="contour-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-500/20">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Revenue by Vehicle Type
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Доходность по моделям парка (аренда + обслуживание)
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-emerald-400">
              Всего: {financials.totalRevenue.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          <div className="mt-5">
            <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
              {/* Y Grid */}
              {[
                { y: 30, label: '25k ₽' },
                { y: 65, label: '20k ₽' },
                { y: 100, label: '15k ₽' },
                { y: 135, label: '10k ₽' },
                { y: 170, label: '5k ₽' },
              ].map((g, i) => (
                <g key={i}>
                  <line
                    x1="45"
                    y1={g.y}
                    x2="500"
                    y2={g.y}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-emerald-950/70"
                    strokeDasharray="4 4"
                  />
                  <text x="5" y={g.y + 4} className="fill-slate-400 text-[10px] font-mono">
                    {g.label}
                  </text>
                </g>
              ))}

              {/* Outlined / Contoured Bars */}
              {[
                { x: 65, h: 140, label: 'Minako' },
                { x: 155, h: 95, label: 'Wenbox' },
                { x: 245, h: 105, label: 'Jetson' },
                { x: 335, h: 115, label: 'Kugoo' },
                { x: 425, h: 55, label: 'Другие' },
              ].map((b, i) => (
                <g key={i} className="group">
                  {/* Glowing background fill */}
                  <rect
                    x={b.x}
                    y={180 - b.h}
                    width="48"
                    height={b.h}
                    rx="8"
                    className="fill-emerald-500/15 dark:fill-emerald-500/10 group-hover:fill-emerald-500/30 transition-colors"
                  />
                  {/* High-tech Contour Outline */}
                  <rect
                    x={b.x}
                    y={180 - b.h}
                    width="48"
                    height={b.h}
                    rx="8"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    className="opacity-80 group-hover:opacity-100 group-hover:stroke-emerald-400 transition-all"
                  />
                </g>
              ))}
            </svg>

            {/* Model labels */}
            <div className="grid grid-cols-5 pl-10 pr-2 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-2">
              <span>Minako Monster</span>
              <span>Wenbox U3</span>
              <span>Jetson V8</span>
              <span>Kugoo V1</span>
              <span>Прочее</span>
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Договор</th>
                  <th className="p-3.5">Курьер</th>
                  <th className="p-3.5">Служба доставки</th>
                  <th className="p-3.5">Байк</th>
                  <th className="p-3.5 text-center">Просрочка</th>
                  <th className="p-3.5">Залог в базе</th>
                  <th className="p-3.5 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {rentals.urgentOverdueRentals.map((item) => (
                  <tr key={item.rentalId} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white font-mono">
                      {item.rentalNumber}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {item.clientName}
                      </p>
                      <p className="text-[10px] text-slate-400">{item.clientPhone}</p>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        {item.courierService || 'Яндекс Еда'}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {item.bikeInventoryNumber}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white font-black text-[10px] shadow-xs shadow-rose-500/50 animate-pulse">
                        +{item.daysOverdue} дн.
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {item.depositAmount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="p-3.5 text-right">
                      <a
                        href={`tel:${item.clientPhone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all hover:scale-105 active:scale-95"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Позвонить
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 5: Operational Columns - Recent Payments & Low Stock alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              stats.recentPayments.map((p) => (
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
                      p.type === 'DEPOSIT_REFUND'
                        ? 'text-rose-600'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {p.type === 'DEPOSIT_REFUND' ? '-' : '+'}
                    {p.amount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))
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
      </div>
    </div>
  );
};

