import React from 'react';
import { BikeStatus, RentalStatus, ClientStatus, RepairStatus, OutfitStatus } from '../types';

interface StatusBadgeProps {
  type: 'bike' | 'rental' | 'client' | 'repair' | 'outfit';
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, className = '' }) => {
  let label = status;
  let colorClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  if (type === 'bike') {
    switch (status as BikeStatus) {
      case 'AVAILABLE':
        label = 'Свободен / На складе';
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
        break;
      case 'RENTED':
        label = 'В аренде';
        colorClasses = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800';
        break;
      case 'IN_MAINTENANCE':
        label = 'На ремонте / СТО';
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
        break;
      case 'FOR_SALE':
        label = 'На продаже';
        colorClasses = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
        break;
      case 'DECOMMISSIONED':
        label = 'Списан';
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
        break;
      case 'SOLD':
        label = 'Продан (Магазин)';
        colorClasses = 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
        break;
    }
  } else if (type === 'rental') {
    switch (status as RentalStatus) {
      case 'ACTIVE':
        label = 'Активен';
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
        break;
      case 'OVERDUE':
        label = 'Просрочен';
        colorClasses = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-700 animate-pulse font-semibold';
        break;
      case 'DRAFT':
        label = 'Черновик';
        colorClasses = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        break;
      case 'RESERVED':
        label = 'Забронирован';
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
        break;
      case 'CLOSED':
        label = 'Завершен';
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        break;
      case 'PROBLEM':
        label = 'Проблема / ДТП';
        colorClasses = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
        break;
      case 'BOUGHT_OUT':
        label = 'Выкуплен';
        colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 font-semibold';
        break;
    }
  } else if (type === 'client') {
    switch (status as ClientStatus) {
      case 'NORMAL':
        label = 'Надежный';
        colorClasses = 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        break;
      case 'VIP':
        label = 'VIP Клиент';
        colorClasses = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-semibold';
        break;
      case 'PROBLEM':
        label = 'Проблемный';
        colorClasses = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
        break;
      case 'BLACKLIST':
        label = 'Черный список';
        colorClasses = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800 font-bold';
        break;
    }
  } else if (type === 'repair') {
    switch (status as RepairStatus) {
      case 'DIAGNOSTICS':
        label = 'Диагностика';
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
        break;
      case 'WAITING_PARTS':
        label = 'Ожидание запчастей';
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
        break;
      case 'IN_PROGRESS':
        label = 'В работе';
        colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 font-medium';
        break;
      case 'COMPLETED':
        label = 'Завершен';
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
        break;
      case 'CANCELLED':
        label = 'Отменен';
        colorClasses = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        break;
    }
  } else if (type === 'outfit') {
    switch (status as OutfitStatus) {
      case 'IN_STOCK':
        label = 'На складе';
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
        break;
      case 'ISSUED':
        label = 'Выдана';
        colorClasses = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800';
        break;
      case 'DAMAGED':
        label = 'Повреждена';
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
        break;
      case 'LOST':
        label = 'Утеряна';
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
        break;
      case 'SOLD':
        label = 'Списан (Продан)';
        colorClasses = 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${colorClasses} ${className}`}
    >
      {label}
    </span>
  );
};
