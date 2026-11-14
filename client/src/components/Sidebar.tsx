import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  LayoutDashboard,
  KeyRound,
  Bike as BikeIcon,
  BatteryCharging,
  Users,
  Wrench,
  Boxes,
  Banknote,
  UserCheck,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Download,
  X,
  Sparkles,
  ShieldCheck,
  Layers,
  BookOpen,
  History,
  ShoppingBag,
  Award,
  FileText,
  MessageSquare,
} from 'lucide-react';

import { useTheme } from '../context/ThemeContext';
import { DashboardStats, User, PartOrder, Article, BatteryStats } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  stats?: DashboardStats | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isDemoMode?: boolean;
  onToggleDemoMode?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  stats,
  isMobileOpen = false,
  onCloseMobile,
  isDemoMode = false,
  onToggleDemoMode,
  currentUser,
  onLogout,
}) => {
  const { theme, toggleTheme } = useTheme();

  // Battery Stats for free batteries badge
  const { data: batteryStats } = useQuery<BatteryStats>({
    queryKey: ['batteryStats'],
    queryFn: api.getBatteryStats,
    refetchInterval: 15000,
  });

  // Part Orders for inventory active & unviewed requests (fast 3s polling for real-time badge updates)
  const { data: partOrders = [] } = useQuery<PartOrder[]>({
    queryKey: ['partOrders'],
    queryFn: () => api.getPartOrders(),
    refetchInterval: 3000,
  });

  // Articles for new knowledge base items
  const { data: articles = [] } = useQuery<Article[]>({
    queryKey: ['articles'],
    queryFn: () => api.getArticles(),
    refetchInterval: 15000,
  });

  const overdueCount = stats?.rentals.overdueCount || 0;
  const openRepairsCount = stats?.repairs.openRepairsCount || 0;
  const lowStockCount = stats?.inventory.lowStockPartsCount || 0;
  const availableBikesCount = stats?.fleet.availableBikes ?? 0;
  const availableBatteriesCount = batteryStats?.available ?? 0;

  // Active part orders (REQUESTED and ORDERED)
  const activePartOrders = useMemo(
    () => partOrders.filter((o) => o.status === 'REQUESTED' || o.status === 'ORDERED'),
    [partOrders]
  );
  const activeOrdersCount = activePartOrders.length;

  // Unread Part Orders & Articles per-user tracking
  const userKey = currentUser?.id || 'guest';
  const lastSeenOrdersKey = `crm_part_orders_last_seen_${userKey}`;
  const lastSeenArticlesKey = `crm_articles_last_seen_${userKey}`;

  const [lastSeenOrdersTime, setLastSeenOrdersTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(lastSeenOrdersKey);
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  const [lastSeenArticlesTime, setLastSeenArticlesTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(lastSeenArticlesKey);
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  // Sync state on user change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(lastSeenOrdersKey);
      setLastSeenOrdersTime(saved ? Number(saved) : 0);
    } catch {
      setLastSeenOrdersTime(0);
    }
  }, [lastSeenOrdersKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(lastSeenArticlesKey);
      setLastSeenArticlesTime(saved ? Number(saved) : 0);
    } catch {
      setLastSeenArticlesTime(0);
    }
  }, [lastSeenArticlesKey]);

  // When user is viewing inventory tab, mark orders as seen
  useEffect(() => {
    if (currentTab === 'inventory') {
      const now = Date.now();
      setLastSeenOrdersTime(now);
      try {
        localStorage.setItem(lastSeenOrdersKey, String(now));
      } catch {}
    }
  }, [currentTab, lastSeenOrdersKey]);

  // When user is viewing info tab, mark articles as seen
  useEffect(() => {
    if (currentTab === 'info') {
      const now = Date.now();
      setLastSeenArticlesTime(now);
      try {
        localStorage.setItem(lastSeenArticlesKey, String(now));
      } catch {}
    }
  }, [currentTab, lastSeenArticlesKey]);

  const unseenOrders = useMemo(() => {
    if (currentTab === 'inventory') return [];
    if (!lastSeenOrdersTime || lastSeenOrdersTime === 0) {
      // If user has not opened inventory yet, all active orders are new
      return activePartOrders;
    }
    return activePartOrders.filter((o) => {
      const orderTime = o.requestedAt ? new Date(o.requestedAt).getTime() : 0;
      return orderTime > lastSeenOrdersTime;
    });
  }, [activePartOrders, lastSeenOrdersTime, currentTab]);

  const unseenOrdersCount = unseenOrders.length;
  const hasUrgentUnseen = unseenOrders.some((o) => o.priority === 'URGENT');

  const unseenArticles = useMemo(() => {
    if (currentTab === 'info') return [];
    if (!lastSeenArticlesTime || lastSeenArticlesTime === 0) {
      return articles;
    }
    return articles.filter((a) => {
      const articleTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      return articleTime > lastSeenArticlesTime;
    });
  }, [articles, lastSeenArticlesTime, currentTab]);

  const unseenArticlesCount = unseenArticles.length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Дашборд',
      icon: LayoutDashboard,
    },
    {
      id: 'rentals',
      label: 'Аренда и выкуп',
      icon: KeyRound,
    },
    {
      id: 'shop',
      label: 'Магазин и касса',
      icon: ShoppingBag,
    },
    {
      id: 'bikes',
      label: 'Парк техники',
      icon: BikeIcon,
    },
    {
      id: 'batteries',
      label: 'Аккумуляторы (АКБ)',
      icon: BatteryCharging,
    },
    {
      id: 'outfits',
      label: 'Склад экипировки',
      icon: ShieldCheck,
    },
    {
      id: 'clients',
      label: 'База клиентов',
      icon: Users,
    },
    {
      id: 'employees',
      label: 'Сотрудники',
      icon: UserCheck,
    },
    {
      id: 'repairs',
      label: 'Мастерская / СТО',
      icon: Wrench,
    },
    {
      id: 'inventory',
      label: 'Склад запчастей',
      icon: Boxes,
    },
    {
      id: 'finance',
      label: 'Касса и финансы',
      icon: Banknote,
    },
    {
      id: 'loyalty',
      label: 'Система лояльности',
      icon: Award,
    },
    {
      id: 'info',
      label: 'Информация',
      icon: BookOpen,
    },
    {
      id: 'history',
      label: 'История',
      icon: History,
    },
    { id: 'documents', label: 'Документы', icon: FileText },
  ];

  const isTabAllowed = (tabId: string) => {
    if (!currentUser?.accessLevel) return true;
    if (tabId === 'documents') return currentUser.accessLevel.permissions?.documents?.visible !== false && ['rentals', 'shop', 'repairs'].some((source) => currentUser.accessLevel!.permissions?.[source]?.visible !== false);
    const perm = currentUser.accessLevel.permissions?.[tabId];
    if (!perm) return true;
    return perm.visible !== false;
  };

  const visibleNavItems = navItems.filter((item) => isTabAllowed(item.id));

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderNavBadge = (id: string) => {
    // 1. Аренда: Красный бейдж просрочек
    if (id === 'rentals' && overdueCount > 0) {
      return (
        <span
          className="ml-2 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs shadow-rose-500/50 animate-pulse"
          title={`${overdueCount} просроченных договоров`}
        >
          {overdueCount}
        </span>
      );
    }

    // 2. Парк техники: Зеленый бейдж свободных электровелосипедов
    if (id === 'bikes' && availableBikesCount > 0) {
      return (
        <span
          className="ml-2 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
          title={`${availableBikesCount} свободных электровелосипедов, готовых к выдаче`}
        >
          {availableBikesCount}
        </span>
      );
    }

    // 3. Аккумуляторы: Зеленый бейдж свободных АКБ
    if (id === 'batteries' && availableBatteriesCount > 0) {
      return (
        <span
          className="ml-2 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
          title={`${availableBatteriesCount} свободных АКБ на складе`}
        >
          {availableBatteriesCount}
        </span>
      );
    }

    // 4. Мастерская / СТО: Янтарный бейдж байков в ремонте
    if (id === 'repairs' && openRepairsCount > 0) {
      return (
        <span
          className="ml-2 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs"
          title={`${openRepairsCount} активных заказ-нарядов на СТО`}
        >
          {openRepairsCount}
        </span>
      );
    }

    // 5. Склад запчастей (Вариант 1): ⚠️ если дефицит + число заявок и +N новых
    if (id === 'inventory') {
      const hasLowStock = lowStockCount > 0;
      const hasOrders = activeOrdersCount > 0 || unseenOrdersCount > 0;
      if (!hasLowStock && !hasOrders) return null;

      return (
        <div
          className="ml-2 shrink-0 flex items-center gap-1"
          title={`Дефицит деталей на складе: ${lowStockCount} | Активных заявок: ${activeOrdersCount}${
            unseenOrdersCount > 0 ? ` (+${unseenOrdersCount} новых)` : ''
          }`}
        >
          {hasLowStock && (
            <span
              className="text-[11px] leading-none text-amber-500 animate-pulse select-none"
              title={`Заканчиваются ${lowStockCount} деталей на складе (остаток ниже минимума)`}
            >
              ⚠️
            </span>
          )}
          {hasOrders && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200/90 dark:bg-[#152a20] text-slate-700 dark:text-emerald-300 border border-slate-300 dark:border-emerald-500/30 shadow-2xs">
              <span>{activeOrdersCount}</span>
              {unseenOrdersCount > 0 && (
                <span
                  className={`ml-0.5 px-1 rounded-full text-[9px] font-black ${
                    hasUrgentUnseen
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-blue-500 text-white'
                  }`}
                  title={`+${unseenOrdersCount} новых заявок на закупку`}
                >
                  +{unseenOrdersCount}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    // 6. Информация: Фиолетовый бейдж новых статей / регламентов
    if (id === 'info' && unseenArticlesCount > 0) {
      return (
        <span
          className="ml-2 shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-purple-500 text-white animate-pulse shadow-xs"
          title={`+${unseenArticlesCount} новых памяток / регламентов`}
        >
          +{unseenArticlesCount}
        </span>
      );
    }

    return null;
  };

  const renderContent = (isDrawer = false) => (
    <div className="flex flex-col h-full bg-white dark:bg-[#070e0a] text-slate-900 dark:text-slate-100 select-none">
      {/* Brand Header */}
      <div className="py-3 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-emerald-500/20 shrink-0">
        <div className="flex flex-col min-w-0">
          <img
            src="/electream-logo.png"
            alt="ELECTREAM"
            className="w-44 h-auto object-contain -my-3"
          />
          
        </div>

        {isDrawer && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Закрыть меню"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation list */}
      <div className="grow overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 dark:text-emerald-500/70 uppercase tracking-widest">
          Основное меню
        </div>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs transition-all group ${
                isActive
                  ? 'bg-slate-100 dark:bg-[#0d1d15] text-emerald-700 dark:text-emerald-300 font-bold border border-slate-300 dark:border-emerald-500/40 shadow-xs dark:shadow-contour-emerald'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-[#0b1611] hover:text-slate-900 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {renderNavBadge(item.id)}
            </button>
          );
        })}
      </div>

      {/* Quick Alert Banner if Overdue */}
      {overdueCount > 0 && (
        <div
          className="mx-3 mb-2 p-3 rounded-xl bg-rose-50 dark:bg-[#1a0b10] border border-rose-200 dark:border-rose-600/40 flex items-center gap-2.5 cursor-pointer shadow-xs dark:shadow-contour-rose transition-all hover:scale-102 shrink-0"
          onClick={() => handleNavClick('rentals')}
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

      {/* Bottom Profile, Controls & Backup */}
      <div className="p-3 border-t border-slate-200/80 dark:border-emerald-500/20 space-y-2 shrink-0 bg-slate-50/50 dark:bg-transparent">
        {/* Backup Download Button */}
        <a
          href="/api/system/backup"
          download
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0c1813] dark:hover:bg-[#12241c] border border-slate-200/60 dark:border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300 transition-colors"
          title="Скачать резервную копию всей базы данных (crm_db.json)"
        >
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] font-medium">Резервная копия</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            JSON
          </span>
        </a>

        {/* Work vs Demo Mode Switch (временно скрыт по запросу) */}
        {/*
        {onToggleDemoMode && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0c1813] border border-slate-200/60 dark:border-emerald-500/20 text-xs">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                {isDemoMode ? 'Демо-тест' : 'Рабочий режим'}
              </span>
            </div>
            <button
              onClick={onToggleDemoMode}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                isDemoMode
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-emerald-600 text-white shadow-xs'
              }`}
            >
              {isDemoMode ? 'ДЕМО' : 'ПРОД'}
            </button>
          </div>
        )}
        */}

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
              {currentUser?.fullName
                ? currentUser.fullName
                    .split(' ')
                    .filter(Boolean)
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'AD'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {currentUser?.fullName || 'Администратор'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-emerald-400/80 flex items-center gap-1 font-medium truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500 shrink-0" />
                <span className="truncate">
                  {currentUser?.roleTitle || (currentUser?.role === 'ADMIN' ? 'Руководитель парка' : currentUser?.role === 'MECHANIC' ? 'Мастер СТО' : 'Управляющий')}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0"
            title="Выйти из системы"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 dark:border-emerald-500/20 flex-col shrink-0 h-screen sticky top-0 transition-colors z-20">
        {renderContent(false)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />

          {/* Drawer Sidebar */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
