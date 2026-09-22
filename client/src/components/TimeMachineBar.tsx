import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Calendar,
  FastForward,
  RotateCcw,
  Trash2,
  Sparkles,
  Clock,
  Check,
  AlertCircle,
  Play,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export const TimeMachineBar: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCustomDate, setSelectedCustomDate] = useState('');

  // Fetch current system state
  const { data: state, refetch } = useQuery({
    queryKey: ['systemState'],
    queryFn: api.getSystemState,
    refetchInterval: 15000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries();
    refetch();
  };

  // Mutate time
  const timeMutation = useMutation({
    mutationFn: api.setSystemTime,
    onSuccess: (res) => {
      toast.success(res.message);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Ошибка смены даты');
    },
  });

  // Clear DB to clean state
  const clearMutation = useMutation({
    mutationFn: api.clearTemplates,
    onSuccess: (res) => {
      toast.info(res.message);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Ошибка очистки');
    },
  });

  const currentDateObj = state ? new Date(state.currentDate) : new Date();
  const isSimulated = state?.isSimulated ?? false;

  const formattedCurrentDate = currentDateObj.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleAddDays = (days: number) => {
    timeMutation.mutate({ addDays: days });
  };

  const handleResetDate = () => {
    timeMutation.mutate({ reset: true });
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedCustomDate(val);
    if (val) {
      timeMutation.mutate({ date: new Date(val).toISOString() });
    }
  };

  const handleClearTemplates = () => {
    if (
      window.confirm(
        'Вы уверены, что хотите очистить всю базу данных? Все созданные вами модели, байки, аккумуляторы, курьеры и записи будут удалены, и база вернется к исходному чистому состоянию.'
      )
    ) {
      clearMutation.mutate();
    }
  };

  return (
    <div className="bg-[#edf2ee] dark:bg-[#08120d] border-b border-slate-200/90 dark:border-emerald-500/20 text-slate-800 dark:text-slate-100 px-5 py-2.5 text-xs shadow-sm shrink-0 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active Date & Simulation badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-500/30 font-semibold shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Дата CRM:</span>
            <span className="text-slate-900 dark:text-emerald-400 font-bold">{formattedCurrentDate}</span>
          </div>

          {isSimulated && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-[10px] animate-pulse">
              <Clock className="w-3 h-3" />
              СИМУЛЯЦИЯ
            </span>
          )}

          {isSimulated && (
            <button
              onClick={handleResetDate}
              title="Сбросить на реальное сегодняшнее время"
              className="px-2.5 py-1.5 bg-white dark:bg-[#0c1813] hover:bg-slate-100 dark:hover:bg-[#12241c] border border-slate-200 dark:border-emerald-500/30 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl flex items-center gap-1 text-[11px] font-semibold transition-all"
            >
              <RotateCcw className="w-3 h-3 text-emerald-500" />
              Сегодня
            </button>
          )}
        </div>

        {/* Center: Time Jump Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden md:inline mr-1">
            Переход по датам:
          </span>

          <button
            onClick={() => handleAddDays(1)}
            disabled={timeMutation.isPending}
            className="px-3 py-1.5 bg-white dark:bg-[#0c1813] hover:bg-emerald-50 dark:hover:bg-[#12241c] border border-slate-200 dark:border-emerald-500/25 text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
          >
            +1 день
          </button>
          <button
            onClick={() => handleAddDays(3)}
            disabled={timeMutation.isPending}
            className="px-3 py-1.5 bg-white dark:bg-[#0c1813] hover:bg-emerald-50 dark:hover:bg-[#12241c] border border-slate-200 dark:border-emerald-500/25 text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
          >
            +3 дня
          </button>
          <button
            onClick={() => handleAddDays(7)}
            disabled={timeMutation.isPending}
            className="px-3 py-1.5 bg-emerald-500/10 dark:bg-[#12281e] hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-2xs"
          >
            +7 дней (Неделя)
          </button>
          <button
            onClick={() => handleAddDays(30)}
            disabled={timeMutation.isPending}
            className="px-3 py-1.5 bg-white dark:bg-[#0c1813] hover:bg-indigo-50 dark:hover:bg-[#12241c] border border-slate-200 dark:border-emerald-500/25 text-slate-700 dark:text-slate-200 hover:border-indigo-500/50 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
          >
            +30 дней
          </button>

          {/* Direct Date Input */}
          <div className="flex items-center ml-1">
            <input
              type="date"
              value={selectedCustomDate}
              onChange={handleCustomDateChange}
              title="Выбрать конкретную дату"
              className="px-2.5 py-1 bg-white dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-500/30 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
        </div>

        {/* Right: Reset to fresh database */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleClearTemplates}
            disabled={clearMutation.isPending}
            title="Очистить все добавленные данные и начать тестирование с чистого листа"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-600/50 text-rose-700 dark:text-rose-300 rounded-xl font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            Сброс к чистому листу (0)
          </button>
        </div>
      </div>
    </div>
  );
};
