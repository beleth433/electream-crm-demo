import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Modal } from '../Modal';
import {
  Trophy,
  Users,
  CheckCircle,
  XCircle,
  Bike,
  ShoppingBag,
  Wrench,
  BatteryCharging,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const DaySummaryModal: React.FC = () => {
  const { daySummary, setDaySummary, startNextDay } = useSimulation();

  if (!daySummary) return null;

  const satisfactionRate =
    daySummary.totalClients > 0
      ? Math.round((daySummary.servedCount / daySummary.totalClients) * 100)
      : 100;

  return (
    <Modal
      isOpen={!!daySummary}
      onClose={() => setDaySummary(null)}
      title={`Итоги рабочего дня ${daySummary.dayNumber}`}
      subtitle="15 минут реального времени завершены • Смена 09:00 — 21:00"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Banner with Trophy */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-sky-500/15 border border-emerald-500/30 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-md shadow-emerald-500/30 shrink-0">
            🏆
          </div>
          <div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              Рабочий день {daySummary.dayNumber} успешно закрыт!
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
              Успешность обслуживания клиентов:{' '}
              <strong
                className={
                  satisfactionRate >= 75
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }
              >
                {satisfactionRate}%
              </strong>
            </p>
          </div>
        </div>

        {/* Big metrics grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 text-center">
            <div className="text-slate-400 text-[11px] mb-1">Всего обращений</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {daySummary.totalClients}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-600/30 text-center">
            <div className="text-emerald-700 dark:text-emerald-400 text-[11px] mb-1 font-semibold">
              Обслужено
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {daySummary.servedCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/30 text-center">
            <div className="text-rose-700 dark:text-rose-400 text-[11px] mb-1 font-semibold">
              Отказов / упущено
            </div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400">
              {daySummary.rejectedCount}
            </div>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2 bg-white dark:bg-[#0d1612]">
          <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-2">
            Структура запросов клиентов:
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Bike className="w-3.5 h-3.5 text-emerald-500" />
              <span>Аренда электробайков</span>
            </div>
            <span className="font-bold">{daySummary.rentalsCount} шт.</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <ShoppingBag className="w-3.5 h-3.5 text-sky-500" />
              <span>Покупка запчастей и экипировки</span>
            </div>
            <span className="font-bold">{daySummary.purchasesCount} шт.</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
              <span>Ремонт и шиномонтаж в СТО</span>
            </div>
            <span className="font-bold">{daySummary.repairsCount} шт.</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <BatteryCharging className="w-3.5 h-3.5 text-teal-500" />
              <span>Свап / замена батарей</span>
            </div>
            <span className="font-bold">{daySummary.batterySwapsCount} шт.</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setDaySummary(null)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
          >
            Закрыть отчет
          </button>
          <button
            type="button"
            onClick={startNextDay}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-md shadow-emerald-600/30 transition-all hover:scale-102 active:scale-98"
          >
            <span>Начать День {daySummary.dayNumber + 1}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
