import { useCrmRefresh } from '../hooks/useCrmRefresh';
import React, { useState, useEffect } from 'react';
import { HistoryItem } from '../types';
import { api } from '../services/api';
import {
  History,
  Search,
  Filter,
  KeyRound,
  Banknote,
  Wrench,
  Bike as BikeIcon,
  Users,
  Calendar,
  Clock,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

export const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [daysFilter, setDaysFilter] = useState<number>(0); // 0 = all time
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = () => {
    setIsLoading(true);
    api
      .getHistory({
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        days: daysFilter > 0 ? daysFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 300,
      })
      .then((res) => {
        setHistoryItems(res.items);
        setTotalCount(res.totalCount);
      })
      .catch((err) => toast.error('Ошибка загрузки истории действий: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useCrmRefresh(loadHistory);

  useEffect(() => {
    loadHistory();
  }, [categoryFilter, daysFilter, searchQuery]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'RENTAL':
        return <KeyRound className="w-4 h-4 text-sky-500" />;
      case 'PAYMENT':
        return <Banknote className="w-4 h-4 text-emerald-500" />;
      case 'REPAIR':
        return <Wrench className="w-4 h-4 text-amber-500" />;
      case 'FLEET':
        return <BikeIcon className="w-4 h-4 text-teal-500" />;
      case 'CLIENT':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'INFO':
        return <BookOpen className="w-4 h-4 text-purple-500" />;
      default:
        return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'RENTAL':
        return 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
      case 'PAYMENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'REPAIR':
        return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'FLEET':
        return 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
      case 'CLIENT':
        return 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'INFO':
        return 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'RENTAL':
        return 'Аренда';
      case 'PAYMENT':
        return 'Касса / Финансы';
      case 'REPAIR':
        return 'СТО / Ремонт';
      case 'FLEET':
        return 'Парк техники';
      case 'CLIENT':
        return 'Курьеры / База';
      case 'INFO':
        return 'Информация';
      default:
        return 'Система';
    }
  };

  // Metrics summary
  const rentalCount = historyItems.filter((i) => i.category === 'RENTAL').length;
  const paymentCount = historyItems.filter((i) => i.category === 'PAYMENT').length;
  const repairCount = historyItems.filter((i) => i.category === 'REPAIR').length;
  const infoCount = historyItems.filter((i) => i.category === 'INFO').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-500" />
            История действий и операций
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Прозрачный журнал всех действий в CRM: договоры, касса, СТО, парк техники и база знаний
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 h-11 bg-slate-100 dark:bg-[#101d17] hover:bg-slate-200 dark:hover:bg-[#162720] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Обновить историю</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0b1611] border border-slate-200/80 dark:border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Всего записей</span>
            <History className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            {totalCount.toLocaleString('ru-RU')}
          </p>
          <span className="text-[10px] text-slate-400">В выборке журнала</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0b1611] border border-slate-200/80 dark:border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Аренда</span>
            <KeyRound className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {rentalCount}
          </p>
          <span className="text-[10px] text-slate-400">Договоры и возвраты</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0b1611] border border-slate-200/80 dark:border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Касса</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {paymentCount}
          </p>
          <span className="text-[10px] text-slate-400">Финансовые проводки</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0b1611] border border-slate-200/80 dark:border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">СТО</span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {repairCount}
          </p>
          <span className="text-[10px] text-slate-400">Заказ-наряды и ремонт</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0b1611] border border-slate-200/80 dark:border-emerald-500/20 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Информация</span>
            <BookOpen className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {infoCount}
          </p>
          <span className="text-[10px] text-slate-400">База знаний и памятки</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 contour-card space-y-3">
        {/* Module category pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {[
            { id: 'ALL', label: 'Все события' },
            { id: 'RENTAL', label: 'Аренда' },
            { id: 'PAYMENT', label: 'Касса и финансы' },
            { id: 'REPAIR', label: 'Мастерская СТО' },
            { id: 'FLEET', label: 'Парк техники' },
            { id: 'CLIENT', label: 'Курьеры' },
            { id: 'INFO', label: 'Информация' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720] border border-transparent dark:border-emerald-500/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Time period pills and Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-emerald-500/10">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Период:</span>
            {[
              { days: 0, label: 'За все время' },
              { days: 1, label: 'Сегодня' },
              { days: 7, label: '7 дней' },
              { days: 30, label: '30 дней' },
            ].map((p) => (
              <button
                key={p.days}
                onClick={() => setDaysFilter(p.days)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  daysFilter === p.days
                    ? 'bg-slate-800 text-white dark:bg-emerald-500/20 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по курьеру, байку, сумме, действию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-11 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* History Timeline */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Загрузка журнала действий...</div>
      ) : historyItems.length === 0 ? (
        <div className="p-12 text-center text-slate-400 contour-card">
          Записей истории по выбранным фильтрам не найдено.
        </div>
      ) : (
        <div className="space-y-2.5">
          {historyItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-emerald-500/15 contour-card hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  {getCategoryIcon(item.category)}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryBadgeClass(
                        item.category
                      )}`}
                    >
                      {item.badgeText || getCategoryLabel(item.category)}
                    </span>
                    <strong className="text-slate-900 dark:text-white font-bold text-xs truncate">
                      {item.title}
                    </strong>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {item.details}
                  </p>
                </div>
              </div>

              {/* Timestamp & Actor */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono font-semibold text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(item.timestamp).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
                  {item.actor}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
