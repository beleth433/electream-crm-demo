import React from 'react';
import {
  LayoutDashboard,
  KeyRound,
  Bike as BikeIcon,
  ShieldCheck,
  Users,
  Wrench,
  Boxes,
  Banknote,
  Star,
  BookOpen,
  ShoppingBag,
  UserCheck,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { DashboardStats } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  stats?: DashboardStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  stats,
}) => {
  const { theme, toggleTheme } = useTheme();

  const overdueCount = stats?.rentals.overdueCount || 0;
  const openRepairsCount = stats?.repairs.openRepairsCount || 0;
  const lowStockCount = stats?.inventory.lowStockPartsCount || 0;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Дашборд',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'rentals',
      label: 'Аренда',
      icon: KeyRound,
      badge: overdueCount > 0 ? { count: overdueCount, variant: 'danger' as const } : null,
    },
    {
      id: 'shop',
      label: 'Магазин (POS)',
      icon: ShoppingBag,
      badge: null,
    },
    {
      id: 'bikes',
      label: 'Парк техники',
      icon: BikeIcon,
      badge: null,
    },
    {
      id: 'outfits',
      label: 'Склад экипировки',
      icon: ShieldCheck,
      badge: null,
    },
    {
      id: 'clients',
      label: 'База курьеров',
      icon: Users,
      badge: null,
    },
    {
      id: 'employees',
      label: 'Сотрудники',
      icon: UserCheck,
      badge: null,
    },
    {
      id: 'repairs',
      label: 'Мастерская / СТО',
      icon: Wrench,
      badge: openRepairsCount > 0 ? { count: openRepairsCount, variant: 'warning' as const } : null,
    },
    {
      id: 'inventory',
      label: 'Склад запчастей',
      icon: Boxes,
      badge: lowStockCount > 0 ? { count: lowStockCount, variant: 'warning' as const } : null,
    },
    {
      id: 'finance',
      label: 'Касса и финансы',
      icon: Banknote,
      badge: null,
    },
    {
      id: 'reviews',
      label: 'Отзывы курьеров',
      icon: Star,
      badge: null,
    },
    {
      id: 'knowledge-base',
      label: 'База знаний и FAQ',
      icon: BookOpen,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#070e0a] border-r border-slate-200 dark:border-emerald-500/20 flex flex-col shrink-0 h-screen sticky top-0 transition-colors z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200/80 dark:border-emerald-500/20 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
          <BikeIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-black text-xs tracking-wider text-slate-900 dark:text-white uppercase leading-tight">
            COURIER <span className="text-emerald-500">EBIKE</span>
          </h1>
          <p className="text-[9px] text-slate-400 dark:text-emerald-400/80 font-semibold tracking-wide uppercase">
            CRM & Fleet Control
          </p>
        </div>
      </div>

      {/* Navigation list */}
      <div className="grow overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 dark:text-emerald-500/70 uppercase tracking-widest">
          Основное меню
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all group ${
                isActive
                  ? 'bg-slate-100 dark:bg-[#0d1d15] text-emerald-700 dark:text-emerald-300 font-bold border border-slate-300 dark:border-emerald-500/40 shadow-xs dark:shadow-contour-emerald'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-[#0b1611] hover:text-slate-900 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    item.badge.variant === 'danger'
                      ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/50 animate-pulse'
                      : 'bg-amber-500 text-white shadow-xs'
                  }`}
                >
                  {item.badge.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Alert Banner if Overdue */}
      {overdueCount > 0 && (
        <div
          className="mx-3 mb-3 p-3 rounded-xl bg-rose-50 dark:bg-[#1a0b10] border border-rose-200 dark:border-rose-600/40 flex items-center gap-2.5 cursor-pointer shadow-xs dark:shadow-contour-rose transition-all hover:scale-102"
          onClick={() => onSelectTab('rentals')}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
          <div className="text-[11px] leading-tight">
            <span className="font-black text-rose-800 dark:text-rose-200">
              {overdueCount} {overdueCount === 1 ? 'должник' : 'должника'}
            </span>
            <p className="text-rose-600 dark:text-rose-400 text-[10px] font-semibold">
              Требуется звонок
            </p>
          </div>
        </div>
      )}

      {/* Bottom Profile & Theme Bar */}
      <div className="p-3 border-t border-slate-200/80 dark:border-emerald-500/20 space-y-2 shrink-0 bg-slate-50/50 dark:bg-transparent">
        {/* Theme Switcher */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0c1813] border border-slate-200/60 dark:border-emerald-500/20 text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
            Тема: {theme === 'dark' ? 'Темная' : 'Светлая'}
          </span>
          <button
            onClick={toggleTheme}
            className="p-1 rounded-lg bg-white dark:bg-[#12241c] text-slate-700 dark:text-slate-200 shadow-2xs hover:scale-110 active:scale-95 transition-transform"
            title="Переключить тему"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-emerald-600" />
            )}
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#0c1813] border border-slate-200/80 dark:border-emerald-500/20 shadow-2xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs">
              ИК
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                Иван Ковалев
              </p>
              <p className="text-[10px] text-slate-400 dark:text-emerald-400/80 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500" />
                Менеджер базы
              </p>
            </div>
          </div>
          <button
            onClick={() => alert('Сессия активна: Иван Ковалев')}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
