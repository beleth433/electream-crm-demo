import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { DemoTour } from './components/DemoTour';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import type { DocumentSummary } from './types/documents';
import { RentalsPage } from './pages/RentalsPage';
import { BikesPage } from './pages/BikesPage';
import { BatteriesPage } from './pages/BatteriesPage';
import { ClientsPage } from './pages/ClientsPage';
import { RepairsPage } from './pages/RepairsPage';
import { InventoryPage } from './pages/InventoryPage';
import { FinancePage } from './pages/FinancePage';
import { EmployeesPage } from './pages/EmployeesPage';
import { InfoPage } from './pages/InfoPage';
import { HistoryPage } from './pages/HistoryPage';
import { ShopPage } from './pages/ShopPage';
import { OutfitsPage } from './pages/OutfitsPage';
import { LoyaltyPage } from './pages/LoyaltyPage';
import { RentalWizardModal } from './pages/RentalWizardModal';
import { PrintableActModal } from './pages/PrintableActModal';
import { RentalCloseModal } from './pages/RentalCloseModal';
import { TimeMachineBar } from './components/TimeMachineBar';
import { SimulationProvider } from './context/SimulationContext';
import { SimulationBar } from './components/simulation/SimulationBar';
import { SimulationQueueDrawer } from './components/simulation/SimulationQueueDrawer';
import { DaySummaryModal } from './components/simulation/DaySummaryModal';
import { api } from './services/api';
import { Rental, User, ChatMessage, PresenceUser } from './types';
import { LoginPage } from './components/auth/LoginPage';
import { TeamChatDrawer } from './components/chat/TeamChatDrawer';
import { NavbarOnlineUsers } from './components/chat/OnlineUsersBadge';
import { ErrorBoundary } from './components/ErrorBoundary';
import { playChatNotificationSound } from './utils/audio';
import {
  Plus,
  Bell,
  Search,
  ShieldCheck,
  Menu,
  LayoutDashboard,
  KeyRound,
  Bike as BikeIcon,
  Banknote,
  Layers,
  MessageSquare,
  Wrench,
  Boxes,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

const VALID_TABS = new Set([
  'documents',
  'dashboard',
  'rentals',
  'shop',
  'bikes',
  'batteries',
  'outfits',
  'clients',
  'employees',
  'repairs',
  'inventory',
  'finance',
  'loyalty',
  'info',
  'history',
]);

const getInitialTab = (): string => {
  if (typeof window !== 'undefined') {
    // 1. URL Hash (e.g. #bikes)
    const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
    if (hash && VALID_TABS.has(hash)) {
      return hash;
    }

    // 2. Query param (e.g. ?tab=bikes)
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab')?.trim().toLowerCase();
      if (tabParam && VALID_TABS.has(tabParam)) {
        return tabParam;
      }
    } catch {}

    // 3. Pathname (e.g. /bikes)
    const pathname = window.location.pathname.replace(/^\//, '').split('/')[0]?.trim().toLowerCase();
    if (pathname && VALID_TABS.has(pathname)) {
      return pathname;
    }

    // 4. LocalStorage
    try {
      const savedTab = localStorage.getItem('crm_active_tab')?.trim().toLowerCase();
      if (savedTab && VALID_TABS.has(savedTab)) {
        return savedTab;
      }
    } catch {}
  }

  return 'dashboard';
};

const MainLayout: React.FC = () => {
  const { theme } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('crm_auth_token') ? localStorage.getItem('crm_auth_user') : null;
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    api.logout().catch(() => {});
    if (currentUser?.id) {
      api.sendPresenceLogout(currentUser.id).catch(() => {});
    }
    localStorage.removeItem('crm_auth_token');
    localStorage.removeItem('crm_auth_user');
    setCurrentUser(null);
    queryClient.clear();
  };
  useEffect(() => {
    const expired = () => { handleLogout(); toast.info('Сессия завершена. Войдите заново.'); };
    const changed = () => { ['dashboardStats', 'batteryStats', 'partOrders', 'financeSettings', 'articles'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] })); };
    window.addEventListener('crm:session-expired', expired);
    window.addEventListener('crm:data-changed', changed);
    return () => { window.removeEventListener('crm:session-expired', expired); window.removeEventListener('crm:data-changed', changed); };
  }, [currentUser?.id]);

  const [currentTab, setCurrentTab] = useState<string>(getInitialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('crm_demo_mode') === 'true';
  });

  const handleSelectTab = (tab: string) => {
    const target = tab;
    if (!VALID_TABS.has(target)) return;

    setSourceDocument(null);
    setCurrentTab(target);
    try {
      localStorage.setItem('crm_active_tab', target);
      if (window.location.hash !== `#${target}`) {
        window.history.pushState(null, '', `#${target}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isTabAllowed = (tabId: string) => {
    if (!currentUser?.accessLevel) return true;
    if (tabId === 'documents') return currentUser.accessLevel.permissions?.documents?.visible !== false && ['rentals', 'shop', 'repairs'].some((source) => currentUser.accessLevel!.permissions?.[source]?.visible !== false);
    const perm = currentUser.accessLevel.permissions?.[tabId];
    if (!perm) return true;
    return perm.visible !== false;
  };

  useEffect(() => {
    if (currentUser?.accessLevel) {
      if (!isTabAllowed(currentTab)) {
        const fallback = Array.from(VALID_TABS).find((t) => isTabAllowed(t)) || 'dashboard';
        handleSelectTab(fallback);
      }
    }
  }, [currentUser, currentTab]);

  useEffect(() => {
    const onLocationChange = () => {
      const tab = getInitialTab();
      setCurrentTab(tab);
      try {
        localStorage.setItem('crm_active_tab', tab);
      } catch {}
    };

    // Ensure the initial active tab is reflected in URL hash if hash is absent
    if (typeof window !== 'undefined') {
      const initial = getInitialTab();
      if (!window.location.hash && !window.location.search) {
        window.history.replaceState(null, '', `#${initial}`);
      }
    }

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, []);

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => {
      const next = !prev;
      localStorage.setItem('crm_demo_mode', String(next));
      return next;
    });
  };

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [wizardInitialClient, setWizardInitialClient] = useState<{
    name: string;
    phone: string;
    company: string;
  } | null>(null);
  const [wizardInitialRentalType, setWizardInitialRentalType] = useState<'STANDARD' | 'RENT_TO_OWN' | undefined>(undefined);
  const [printableRental, setPrintableRental] = useState<Rental | null>(null);
  const [sourceDocument, setSourceDocument] = useState<DocumentSummary | null>(null);
  const [closingRental, setClosingRental] = useState<Rental | null>(null);
  const [repairInitialData, setRepairInitialData] = useState<{
    clientName?: string;
    clientPhone?: string;
    description?: string;
    customItemName?: string;
  } | null>(null);

  // Rentals refresh sync trigger
  const [rentalsRefreshKey, setRentalsRefreshKey] = useState(0);

  // Fetch Dashboard Stats query
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats'],
    enabled: Boolean(currentUser),
    queryFn: api.getDashboardStats,
    refetchInterval: 10000,
  });

  // Real-time synchronization of current user profile & permissions
  const { data: serverUserProfile, error: profileError } = useQuery<User | null>({
    queryKey: ['currentUserProfile', currentUser?.id],
    queryFn: () => (currentUser?.id ? api.getMe(currentUser.id) : null),
    enabled: Boolean(currentUser?.id),
    refetchInterval: 3500,
    staleTime: 0,
  });

  useEffect(() => {
    if (!serverUserProfile || !currentUser) return;

    if (serverUserProfile.isActive === false) {
      toast.error('Ваша учетная запись была деактивирована администратором.');
      handleLogout();
      return;
    }

    const hasRoleChanged = serverUserProfile.role !== currentUser.role;
    const hasRoleTitleChanged = serverUserProfile.roleTitle !== currentUser.roleTitle;
    const hasAccessLevelIdChanged = serverUserProfile.accessLevelId !== currentUser.accessLevelId;
    const hasFullNameChanged = serverUserProfile.fullName !== currentUser.fullName;
    const oldPermsStr = JSON.stringify(currentUser.accessLevel || {});
    const newPermsStr = JSON.stringify(serverUserProfile.accessLevel || {});
    const hasAccessLevelContentChanged = oldPermsStr !== newPermsStr;

    if (
      hasRoleChanged ||
      hasRoleTitleChanged ||
      hasAccessLevelIdChanged ||
      hasFullNameChanged ||
      hasAccessLevelContentChanged
    ) {
      const updatedUser: User = {
        ...currentUser,
        ...serverUserProfile,
      };

      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('crm_auth_user', JSON.stringify(updatedUser));
      } catch {}

      if (hasAccessLevelIdChanged || hasAccessLevelContentChanged || hasRoleChanged) {
        toast.info(
          `Права доступа обновлены: ${
            serverUserProfile.accessLevel?.name || serverUserProfile.roleTitle || 'Новые права'
          }`
        );
      }
    }
  }, [serverUserProfile, currentUser]);

  useEffect(() => {
    if (profileError && currentUser && [401, 404].includes((profileError as any).status)) {
      toast.error('Сессия пользователя недействительна. Пожалуйста, выполните вход.');
      handleLogout();
    }
  }, [profileError]);

  // Fetch Finance Settings (Payment Details for QR)
  const { data: financeSettings } = useQuery({
    queryKey: ['financeSettings'],
    enabled: Boolean(currentUser),
    queryFn: api.getFinanceSettings,
    refetchInterval: 30000,
  });

  // Polling Online Users (Heartbeat & Presence Tracker)
  const { data: onlineUsers = [] } = useQuery<PresenceUser[]>({
    queryKey: ['onlineUsers'],
    enabled: Boolean(currentUser),
    queryFn: api.getOnlineUsers,
    refetchInterval: 8000,
  });

  // Send regular presence heartbeat every 20s
  useEffect(() => {
    if (!currentUser) return;
    const sendHeartbeat = () => {
      const name = currentUser.fullName || currentUser.username || currentUser.login || 'Сотрудник';
      const roleTitle = currentUser.roleTitle || currentUser.role || 'Команда';
      api
        .sendPresenceHeartbeat({
          userId: currentUser.id,
          userName: name,
          userRole: currentUser.role,
          roleTitle,
        })
        .catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 20000);

    const handleBeforeUnload = () => {
      if (currentUser?.id) {
        // Best-effort logout beacon / fetch
        navigator.sendBeacon?.(
          '/api/presence/logout',
          JSON.stringify({ userId: currentUser.id })
        );
        api.sendPresenceLogout(currentUser.id).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // Polling Chat Messages for in-app toasts, sound chime and unread badge
  const { data: chatMessages = [], refetch: refetchChat } = useQuery<ChatMessage[]>({
    queryKey: ['chatMessages'],
    enabled: Boolean(currentUser),
    queryFn: () => api.getChatMessages(50),
    refetchInterval: 3500,
  });

  const [lastReadChatTime, setLastReadChatTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('crm_chat_last_read_time');
      return saved ? Number(saved) : Date.now();
    } catch {
      return Date.now();
    }
  });

  const unreadChatCount = isChatOpen
    ? 0
    : chatMessages.filter(
        (m) =>
          new Date(m.createdAt).getTime() > lastReadChatTime &&
          m.senderId !== (currentUser?.id || 'u-current')
      ).length;

  const lastKnownMessageIdRef = useRef<string | null>(null);
  const isInitialChatLoadRef = useRef<boolean>(true);

  const handleOpenChat = () => {
    setIsChatOpen(true);
    const now = Date.now();
    setLastReadChatTime(now);
    try {
      localStorage.setItem('crm_chat_last_read_time', String(now));
    } catch {}
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    const now = Date.now();
    setLastReadChatTime(now);
    try {
      localStorage.setItem('crm_chat_last_read_time', String(now));
    } catch {}
  };

  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return;

    const latestMsg = chatMessages[chatMessages.length - 1];
    if (!latestMsg) return;

    if (isInitialChatLoadRef.current) {
      lastKnownMessageIdRef.current = latestMsg.id;
      isInitialChatLoadRef.current = false;
      return;
    }

    if (latestMsg.id !== lastKnownMessageIdRef.current) {
      lastKnownMessageIdRef.current = latestMsg.id;

      // If message is from someone else and chat is closed
      const isFromOther = latestMsg.senderId !== (currentUser?.id || 'u-current');
      if (isFromOther && !isChatOpen) {
        // 1. Play soft audio chime
        playChatNotificationSound();

        // 2. Display solid, high-contrast non-transparent interactive toast notification (6 seconds)
        toast.custom(
          (t) => (
            <div
              onClick={() => {
                handleOpenChat();
                toast.dismiss(t);
              }}
              style={{
                backgroundColor: theme === 'dark' ? '#0f2018' : '#ffffff',
                opacity: 1,
              }}
              className="cursor-pointer group flex items-start gap-3.5 sm:gap-4 p-4 sm:p-5 bg-white dark:bg-[#0f2018] border-2 border-emerald-500/70 hover:border-emerald-500 rounded-2xl shadow-2xl shadow-slate-900/40 dark:shadow-black/90 ring-4 ring-emerald-500/20 hover:scale-[1.02] active:scale-[0.99] transition-all max-w-md sm:max-w-lg w-full select-none animate-in fade-in slide-in-from-top-3 duration-200 opacity-100"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0 border border-emerald-500/40 relative shadow-xs">
                <MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#0f2018] animate-pulse" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                      {latestMsg.senderName}
                    </span>
                    {latestMsg.senderRole && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 shrink-0">
                        {latestMsg.senderRole}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 font-semibold">только что</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 line-clamp-3 leading-relaxed font-medium">
                  {latestMsg.text}
                </p>

                <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-2.5 border-t border-slate-200 dark:border-emerald-500/20 mt-3">
                  <span className="text-[11px] text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200 font-semibold">
                    Нажмите, чтобы открыть чат смены
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs font-black">
                    Ответить &rarr;
                  </span>
                </div>
              </div>
            </div>
          ),
          { duration: 6000 }
        );
      }
    }
  }, [chatMessages, isChatOpen, currentUser?.id]);

  const handleCheckoutSuccess = (newRental: Rental) => {
    setIsWizardOpen(false);
    setWizardInitialClient(null);
    setWizardInitialRentalType(undefined);
    refetchStats();
    setRentalsRefreshKey((k) => k + 1);
    setPrintableRental(newRental);
  };

  const handleOpenWizardWithClient = (prefill?: { name: string; phone: string; company: string }) => {
    setWizardInitialClient(prefill || null);
    setWizardInitialRentalType(undefined);
    setIsWizardOpen(true);
  };

  const handleOpenRepairWithClient = (client: { name: string; phone: string; company?: string; issue?: string }) => {
    setRepairInitialData({
      clientName: client.name,
      clientPhone: client.phone,
      description: client.issue || '',
      customItemName: `Электровелосипед (${client.company || 'Курьер'})`,
    });
    handleSelectTab('repairs');
  };

  const handleCloseSuccess = () => {
    setClosingRental(null);
    refetchStats();
    setRentalsRefreshKey((k) => k + 1);
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'documents':
        return 'Документы';
      case 'dashboard':
        return 'Дашборд и KPI';
      case 'rentals':
        return 'Управление арендой и выкупом';
      case 'shop':
        return 'Магазин и касса';
      case 'bikes':
        return 'Парк электровелосипедов';
      case 'batteries':
        return 'Склад аккумуляторов (АКБ)';
      case 'outfits':
        return 'Склад экипировки и аксессуаров';
      case 'clients':
        return 'База клиентов';
      case 'employees':
        return 'Штат сотрудников и доступы (RBAC)';
      case 'repairs':
        return 'Мастерская СТО';
      case 'inventory':
        return 'Склад запчастей и закупки';
      case 'finance':
        return 'Касса и финансы';
      case 'loyalty':
        return 'Система лояльности и скидок';
      case 'info':
        return 'База знаний и информация';
      case 'history':
        return 'История действий и аудит';
      default:
        return 'ELECTREAM PRO SAMOKAT';
    }
  };

  const overdueCount = stats?.rentals?.overdueCount || 0;

  if (!currentUser) {
    return <LoginPage onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="flex min-h-screen bg-[#f2f6f4] dark:bg-[#060b08] text-slate-900 dark:text-slate-100 bg-tech-dots transition-colors font-sans antialiased">
      {/* Sidebar (Desktop persistent + Mobile Drawer) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        stats={stats}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isDemoMode={isDemoMode}
        onToggleDemoMode={toggleDemoMode}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="grow flex flex-col min-w-0">
        {/* Testing Time Machine & Simulation Bar (Only in Demo mode) */}
        {isDemoMode && (
          <>
            <TimeMachineBar />
            <SimulationBar />
          </>
        )}

        {/* Top Navbar */}
        <header className="h-14 sm:h-16 px-3 sm:px-6 bg-white/95 dark:bg-[#09120e]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-emerald-500/20 flex items-center justify-between sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden min-h-11 min-w-11 flex items-center justify-center p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#112219] active:scale-95 transition-all shrink-0"
              title="Открыть меню"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Logo */}
            <img
              src="/electream-logo.png"
              alt="ELECTREAM"
              className="hidden min-[430px]:block md:hidden h-8 w-auto object-contain shrink-0"
            />

            <div className="hidden sm:block min-w-0 overflow-hidden">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500 shrink-0" />
                <span className="truncate">{getPageTitle()}</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                Центральная база • {currentUser.fullName} ({currentUser.roleTitle || 'Сотрудник'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Real-time Online Users Presence */}
            <NavbarOnlineUsers
              onlineUsers={onlineUsers}
              currentUserId={currentUser.id}
              onOpenChat={handleOpenChat}
            />

            {/* Chat Button with Unread Badge */}
            <button
              type="button"
              onClick={handleOpenChat}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition-all shadow-2xs active:scale-95 ${
                unreadChatCount > 0
                  ? 'bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                  : 'bg-slate-100 dark:bg-[#112219] hover:bg-slate-200 dark:hover:bg-[#183124] text-slate-700 dark:text-emerald-400 border-slate-200 dark:border-emerald-500/20'
              }`}
              title="Открыть чат смены"
            >
              <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Чат</span>
              {unreadChatCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shrink-0">
                  {unreadChatCount}
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              )}
            </button>

            <button
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Оформить аренду</span>
              <span className="sm:hidden">Аренда</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="grow p-3 sm:p-6 pb-24 md:pb-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <ErrorBoundary key={currentTab}>
          {currentTab === 'dashboard' && (
            <DashboardPage
              stats={stats || null}
              onOpenCheckoutWizard={() => setIsWizardOpen(true)}
              onNavigateToTab={handleSelectTab}
              currentUser={currentUser}
              onOpenChat={() => setIsChatOpen(true)}
            />
          )}

          {currentTab === 'rentals' && (
            <RentalsPage
              sourceDocument={sourceDocument}
              onClearSource={() => setSourceDocument(null)}
              onOpenCheckoutWizard={(initialType) => {
                setWizardInitialRentalType(initialType);
                setIsWizardOpen(true);
              }}
              onOpenCloseModal={(rental) => setClosingRental(rental)}
              onOpenPrintAct={(rental) => setPrintableRental(rental)}
              onNavigateToTab={handleSelectTab}
              refreshTrigger={rentalsRefreshKey}
            />
          )}

          {currentTab === 'documents' && <DocumentsPage onOpenSource={(doc) => { handleSelectTab(doc.sourceModule); setSourceDocument(doc); }} />}
          {currentTab === 'shop' && <ShopPage sourceDocument={sourceDocument} onClearSource={() => setSourceDocument(null)} />}
          {currentTab === 'bikes' && <BikesPage />}
          {currentTab === 'batteries' && <BatteriesPage />}
          {currentTab === 'outfits' && <OutfitsPage />}
          {currentTab === 'clients' && <ClientsPage />}
          {currentTab === 'employees' && <EmployeesPage currentUser={currentUser} />}
          {currentTab === 'repairs' && (
            <RepairsPage
              sourceDocument={sourceDocument}
              onClearSource={() => setSourceDocument(null)}
              initialData={repairInitialData}
              onClearInitialData={() => setRepairInitialData(null)}
            />
          )}
          {currentTab === 'inventory' && <InventoryPage currentUser={currentUser} />}
          {currentTab === 'finance' && <FinancePage currentUser={currentUser} />}
          {currentTab === 'loyalty' && <LoyaltyPage />}
          {currentTab === 'info' && <InfoPage />}
          {currentTab === 'history' && <HistoryPage />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for quick 1-thumb switching */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#07110c]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-emerald-500/20 px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] flex items-center justify-around shadow-lg">
        {isTabAllowed('dashboard') && (
          <button
            onClick={() => handleSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-3 rounded-xl transition-all ${
              currentTab === 'dashboard'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">KPI</span>
          </button>
        )}

        {isTabAllowed('rentals') && (
          <button
            onClick={() => handleSelectTab('rentals')}
            className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 px-3 rounded-xl transition-all ${
              currentTab === 'rentals'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Аренда</span>
            {overdueCount > 0 && (
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        )}

        {isTabAllowed('repairs') && !isTabAllowed('rentals') && (
          <button
            onClick={() => handleSelectTab('repairs')}
            className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 px-3 rounded-xl transition-all ${
              currentTab === 'repairs'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">СТО</span>
            {(stats?.repairs?.openRepairsCount || 0) > 0 && (
              <span className="absolute top-1 right-2 px-1 rounded-full text-[8px] font-black bg-amber-500 text-white shadow-xs">
                {stats?.repairs?.openRepairsCount}
              </span>
            )}
          </button>
        )}

        {isTabAllowed('bikes') && (
          <button
            onClick={() => handleSelectTab('bikes')}
            className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 px-3 rounded-xl transition-all ${
              currentTab === 'bikes'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <BikeIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Байки</span>
            {(stats?.fleet?.availableBikes ?? 0) > 0 && (
              <span className="absolute top-1 right-2 px-1 rounded-full text-[8px] font-black bg-emerald-500 text-white shadow-xs">
                {stats?.fleet?.availableBikes}
              </span>
            )}
          </button>
        )}

        {isTabAllowed('inventory') && !isTabAllowed('bikes') && (
          <button
            onClick={() => handleSelectTab('inventory')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-3 rounded-xl transition-all ${
              currentTab === 'inventory'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Boxes className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Склад</span>
          </button>
        )}

        {isTabAllowed('finance') && (
          <button
            onClick={() => handleSelectTab('finance')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-3 rounded-xl transition-all ${
              currentTab === 'finance'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Banknote className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Касса</span>
          </button>
        )}

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center min-h-[48px] py-1 px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-all"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Меню</span>
        </button>
      </nav>

      {currentUser.id === 'usr-demo' && <DemoTour onNavigate={handleSelectTab} onOpenRental={() => setIsWizardOpen(true)} />}

      {/* Global Modals */}
      <RentalWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardInitialClient(null);
          setWizardInitialRentalType(undefined);
        }}
        onSuccess={handleCheckoutSuccess}
        initialClient={wizardInitialClient}
        initialRentalType={wizardInitialRentalType}
      />

      <PrintableActModal
        isOpen={!!printableRental}
        onClose={() => setPrintableRental(null)}
        rental={printableRental}
        paymentDetails={financeSettings?.paymentDetails}
      />

      <RentalCloseModal
        isOpen={!!closingRental}
        onClose={() => setClosingRental(null)}
        rental={closingRental}
        onSuccess={handleCloseSuccess}
      />

      {/* Simulation Queue Slide-Over Drawer (only in demo mode) */}
      {isDemoMode && (
        <>
          <SimulationQueueDrawer
            onOpenRentalWizard={handleOpenWizardWithClient}
            onOpenRepairWithClient={handleOpenRepairWithClient}
            onNavigateToTab={handleSelectTab}
          />
          <DaySummaryModal />
        </>
      )}

      {/* Team Chat Drawer */}
      <TeamChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={currentUser}
        onlineUsers={onlineUsers}
      />

      {/* Toast Notifications */}
      <Toaster
        theme={theme === 'dark' ? 'dark' : 'light'}
        position="top-right"
        richColors
        closeButton
        visibleToasts={4}
        toastOptions={{
          className: 'text-sm font-semibold py-3.5 px-4.5 rounded-2xl shadow-2xl opacity-100 bg-white dark:bg-[#12221b] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-emerald-500/30',
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SimulationProvider>
          <MainLayout />
        </SimulationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
