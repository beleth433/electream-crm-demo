import React, { useState } from 'react';
import {
  AreaTrend,
  BarCompare,
  ChartCard,
  DonutBreakdown,
  KpiCard,
} from '@/components/ui/revenue-charts-kpi';
import { DashboardStats } from '../../types';

interface RevenueAnalyticsDashboardProps {
  stats: DashboardStats | null;
  onOpenCheckoutWizard?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

const RANGES = {
  '6m': ['Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт'],
  '12m': [
    'Ноя',
    'Дек',
    'Янв',
    'Фев',
    'Мар',
    'Апр',
    'Май',
    'Июн',
    'Июл',
    'Авг',
    'Сен',
    'Окт',
  ],
} as const;

const formatCurrencyRub = (v: number) => {
  if (Math.abs(v) >= 1000000) {
    return `₽${(v / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(v) >= 1000) {
    return `₽${Math.round(v / 1000)}k`;
  }
  return `₽${v.toLocaleString('ru-RU')}`;
};

export const RevenueAnalyticsDashboard: React.FC<RevenueAnalyticsDashboardProps> = ({
  stats,
  onOpenCheckoutWizard,
  onNavigateToTab,
}) => {
  const [range, setRange] = useState<keyof typeof RANGES>('6m');

  const currentDateStr = new Date(stats?.systemTime?.currentDate || Date.now()).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const revenueData = (stats?.revenueByMonth || []).slice(range === '6m' ? -6 : -12);
  const months = revenueData.map((row) => row.month);
  const currentMonth = revenueData[revenueData.length - 1];

  // 100% Real Data from CRM Database
  const totalRevenue = currentMonth?.total ?? 0;
  const rentalRevenue = currentMonth?.rental ?? 0;
  const repairRevenue = currentMonth?.repair ?? 0;
  const depositsHeld = stats?.financials?.activeDepositsHeld ?? 0;
  const buyoutRevenue = currentMonth?.buyout ?? 0;

  const totalBikes = stats?.fleet?.activeParkBikes ?? 0;
  const rentedBikes = stats?.fleet?.rentedBikes ?? 0;
  const activeRentals = stats?.rentals?.activeRentalsCount ?? 0;
  const overdueCount = stats?.rentals?.overdueCount ?? 0;
  const overduePercent = activeRentals > 0 ? (overdueCount / activeRentals) * 100 : 0;

  // Real Fleet Models from DB
  const fleetModels = stats?.modelsBreakdown || [];

  // Fleet data by real models
  const fleetSeries = fleetModels.length > 0
    ? fleetModels.map((model, idx) => ({
        key: model.modelId || `model_${idx}`,
        label: model.name || `Модель ${idx + 1}`,
        slot: ((idx % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      }))
    : [{ key: 'bikes', label: 'Электровелосипеды на линии', slot: 1 as const }];

  const fleetData = [(() => {
    const row: Record<string, any> = { month: 'Сейчас' };
    if (fleetModels.length > 0) {
      fleetModels.forEach((model) => {
        row[model.modelId] = model.rented;
      });
    } else {
      row.bikes = rentedBikes;
    }
    return row;
  })()];

  // Donut chart: real cash flow streams
  const donutData = [
    {
      label: 'Аренда электровелосипедов',
      value: rentalRevenue,
      slot: 1 as const,
    },
    {
      label: 'Выкуп техники',
      value: buyoutRevenue,
      slot: 2 as const,
    },
    {
      label: 'Мастерская СТО / Сервис',
      value: repairRevenue,
      slot: 3 as const,
    },
    {
      label: 'Магазин и экипировка',
      value: (currentMonth?.retail || 0) + (currentMonth?.outfit || 0),
      slot: 4 as const,
    },
    { label: 'Штрафы', value: currentMonth?.fines || 0, slot: 5 as const },
  ].filter((d) => d.value > 0);

  // If completely empty, show 0 slice
  const finalDonutData = donutData.length > 0
    ? donutData
    : [{ label: 'Нет поступлений', value: 0, slot: 1 as const }];

  return (
    <div
      className="space-y-6 w-full max-w-7xl mx-auto"
      style={
        {
          '--chart-1': '#10b981',
          '--chart-2': '#0ea5e9',
          '--chart-3': '#8b5cf6',
          '--chart-4': '#f59e0b',
          '--chart-5': '#ec4899',
        } as React.CSSProperties
      }
    >
      {/* Top Header: Title, Real Status Badge & Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Выручка и динамика парка
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-500/30">
              База данных CRM
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Фактические показатели базы данных парка • {currentDateStr}
          </p>
        </div>

        {/* 6m / 12m Switcher */}
        <div
          role="radiogroup"
          aria-label="Период аналитики"
          className="inline-flex rounded-xl bg-slate-200/70 dark:bg-[#112219] p-1 border border-slate-300/60 dark:border-emerald-500/20 shrink-0 self-start sm:self-auto"
        >
          {(['6m', '12m'] as const).map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={`h-9 min-h-[36px] rounded-lg px-4 text-xs font-bold transition-all outline-hidden ${
                range === r
                  ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {r === '6m' ? '6 месяцев' : '12 месяцев'}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: 3 KPI Cards with Real Figures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: Monthly Revenue */}
        <KpiCard
          label="Поступления за месяц"
          value={`₽${totalRevenue.toLocaleString('ru-RU')}`}
          delta={0}
          period="текущий месяц"
          trend={revenueData.map((r) => r.total)}
          className="border-slate-200 dark:border-emerald-500/20 shadow-xs hover:border-emerald-500/40 transition-colors"
        />

        {/* KPI 2: Active fleet */}
        <KpiCard
          label="Байков на линии (в аренде)"
          value={`${rentedBikes} шт.`}
          delta={0}
          period={`из ${totalBikes} в парке`}
          trend={revenueData.map(() => rentedBikes)}
          className="border-slate-200 dark:border-emerald-500/20 shadow-xs hover:border-emerald-500/40 transition-colors"
        />

        {/* KPI 3: Overdue Rate */}
        <KpiCard
          label="Доля просрочек и долгов"
          value={`${overduePercent.toFixed(1)}%`}
          delta={0}
          good="down"
          period={overdueCount > 0 ? `${overdueCount} долж.` : 'нет должников'}
          trend={revenueData.map(() => overduePercent)}
          className="border-slate-200 dark:border-emerald-500/20 shadow-xs hover:border-emerald-500/40 transition-colors sm:col-span-2 lg:col-span-1"
        />
      </div>

      {/* Row 2: Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: AreaTrend - Real Revenue Streams */}
        <ChartCard
          title="Выручка по направлениям"
          subtitle="Регулярная аренда и платежи по выкупу техники"
          className="border-slate-200 dark:border-emerald-500/20 shadow-xs"
        >
          <AreaTrend
            data={revenueData}
            xKey="month"
            format={formatCurrencyRub}
            description={`Динамика выручки по направлениям за ${months[0]} – ${months[months.length - 1]}`}
            series={[
              { key: 'rental', label: 'Аренда байков', slot: 1 },
              { key: 'buyout', label: 'Выкуп техники', slot: 2 },
            ]}
          />
        </ChartCard>

        {/* Chart 2: BarCompare - Real Fleet Utilization */}
        <ChartCard
          title="Занятость парка по моделям"
          subtitle="Текущее количество байков на линии"
          className="border-slate-200 dark:border-emerald-500/20 shadow-xs"
        >
          <BarCompare
            data={fleetData}
            xKey="month"
            description="Текущая занятость парка по моделям"
            series={fleetSeries}
          />
        </ChartCard>

        {/* Chart 3: DonutBreakdown - Real Month Distribution */}
        <ChartCard
          title="Структура кассовых поступлений за текущий месяц"
          subtitle="Фактическое распределение источников дохода базы"
          className="lg:col-span-2 border-slate-200 dark:border-emerald-500/20 shadow-xs"
        >
          <DonutBreakdown
            format={(v) => `₽${v.toLocaleString('ru-RU')}`}
            centerLabel="Всего в кассу"
            description="Структура доходов за расчетный период"
            data={finalDonutData}
          />
        </ChartCard>
      </div>
    </div>
  );
};
