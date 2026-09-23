import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { RentalsPage } from './pages/RentalsPage';
import { BikesPage } from './pages/BikesPage';
import { BatteriesPage } from './pages/BatteriesPage';
import { OutfitsPage } from './pages/OutfitsPage';
import { ClientsPage } from './pages/ClientsPage';
import { RepairsPage } from './pages/RepairsPage';
import { InventoryPage } from './pages/InventoryPage';
import { FinancePage } from './pages/FinancePage';
import { LoyaltyPage } from './pages/LoyaltyPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ShopPage } from './pages/ShopPage';
import { RentalWizardModal } from './pages/RentalWizardModal';
import { PrintableActModal } from './pages/PrintableActModal';
import { RentalCloseModal } from './pages/RentalCloseModal';
import { TimeMachineBar } from './components/TimeMachineBar';
import { api } from './services/api';
import { Rental } from './types';
import { Plus, Bell, Search, ShieldCheck } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

const MainLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [printableRental, setPrintableRental] = useState<Rental | null>(null);
  const [closingRental, setClosingRental] = useState<Rental | null>(null);

  // Fetch Dashboard Stats query
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 10000,
  });

  const handleCheckoutSuccess = (newRental: Rental) => {
    setIsWizardOpen(false);
    refetchStats();
    setPrintableRental(newRental);
  };

  const handleCloseSuccess = () => {
    setClosingRental(null);
    refetchStats();
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Дашборд и ключевые показатели (KPI)';
      case 'rentals':
        return 'Управление договорами аренды курьеров';
      case 'shop':
        return 'Магазин и кассовый терминал (POS)';
      case 'bikes':
        return 'Парк электровелосипедов (Minako, Wenbox)';
      case 'outfits':
        return 'Склад экипировки и аксессуаров';
      case 'clients':
        return 'База клиентов (курьеры, покупатели, СТО)';
      case 'employees':
        return 'Штат сотрудников и фонд оплаты труда';
      case 'repairs':
        return 'Мастерская СТО и заказ-наряды';
      case 'inventory':
        return 'Склад запчастей и расходных материалов';
      case 'finance':
        return 'Кассовые операции и финансовый учет';
      case 'loyalty':
        return 'Система лояльности и скидок';
      case 'knowledge-base':
        return 'База знаний, регламенты и инструкции';
      default:
        return 'Courier EBike CRM';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f2f6f4] dark:bg-[#060b08] text-slate-900 dark:text-slate-100 bg-tech-dots transition-colors font-sans antialiased">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        stats={stats}
      />

      {/* Main Content Area */}
      <div className="grow flex flex-col min-w-0">
        {/* Testing Time Machine & Template Management */}
        <TimeMachineBar />

        {/* Top Navbar */}
        <header className="h-16 px-6 bg-white/95 dark:bg-[#09120e]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-emerald-500/20 flex items-center justify-between sticky top-0 z-30 transition-colors">
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500" />
              {getPageTitle()}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              База: Центральная база (м. Дмитровская) • Сессия: Иван Ковалев (Менеджер)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Оформить аренду
            </button>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="grow p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              stats={stats || null}
              onOpenCheckoutWizard={() => setIsWizardOpen(true)}
              onNavigateToTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'rentals' && (
            <RentalsPage
              onOpenCheckoutWizard={() => setIsWizardOpen(true)}
              onOpenCloseModal={(rental) => setClosingRental(rental)}
              onOpenPrintAct={(rental) => setPrintableRental(rental)}
            />
          )}

          {currentTab === 'shop' && <ShopPage />}
          {currentTab === 'bikes' && <BikesPage />}
          {currentTab === 'batteries' && <BatteriesPage />}
          {currentTab === 'outfits' && <OutfitsPage />}
          {currentTab === 'clients' && <ClientsPage />}
          {currentTab === 'employees' && <EmployeesPage />}
          {currentTab === 'repairs' && <RepairsPage />}
          {currentTab === 'inventory' && <InventoryPage />}
          {currentTab === 'finance' && <FinancePage />}
          {currentTab === 'loyalty' && <LoyaltyPage />}
          {currentTab === 'knowledge-base' && <KnowledgeBasePage />}
        </main>
      </div>

      {/* Global Modals */}
      <RentalWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={handleCheckoutSuccess}
      />

      <PrintableActModal
        isOpen={!!printableRental}
        onClose={() => setPrintableRental(null)}
        rental={printableRental}
      />

      <RentalCloseModal
        isOpen={!!closingRental}
        onClose={() => setClosingRental(null)}
        rental={closingRental}
        onSuccess={handleCloseSuccess}
      />

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MainLayout />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
