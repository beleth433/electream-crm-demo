import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { SimulatedClient, ClientRequestType } from '../../types/simulation';
import {
  X,
  User,
  ShoppingBag,
  Wrench,
  Bike as BikeIcon,
  BatteryCharging,
  RotateCcw,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  Sparkles,
  Phone,
  MessageSquareQuote,
  Building,
} from 'lucide-react';

interface SimulationQueueDrawerProps {
  onOpenRentalWizard: (prefillClient?: { name: string; phone: string; company: string }) => void;
  onNavigateToTab: (tab: string) => void;
}

export const SimulationQueueDrawer: React.FC<SimulationQueueDrawerProps> = ({
  onOpenRentalWizard,
  onNavigateToTab,
}) => {
  const {
    isQueueOpen,
    setIsQueueOpen,
    queue,
    activeWaitingCount,
    serveClient,
    rejectClient,
    spawnManualClient,
  } = useSimulation();

  if (!isQueueOpen) return null;

  const getRequestBadge = (type: ClientRequestType) => {
    switch (type) {
      case 'RENTAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <BikeIcon className="w-3 h-3" />
            Аренда байка
          </span>
        );
      case 'BUY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
            <ShoppingBag className="w-3 h-3" />
            Покупка товаров
          </span>
        );
      case 'REPAIR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Wrench className="w-3 h-3" />
            Ремонт в СТО
          </span>
        );
      case 'BATTERY_SWAP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
            <BatteryCharging className="w-3 h-3" />
            Свап АКБ
          </span>
        );
      case 'RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            <RotateCcw className="w-3 h-3" />
            Возврат / Сдача
          </span>
        );
      default:
        return null;
    }
  };

  const handleActionClick = (client: SimulatedClient) => {
    switch (client.requestType) {
      case 'RENTAL':
        onOpenRentalWizard({
          name: client.name,
          phone: client.phone,
          company: client.company,
        });
        break;
      case 'BUY':
        onNavigateToTab('shop');
        break;
      case 'REPAIR':
        onNavigateToTab('repairs');
        break;
      case 'BATTERY_SWAP':
        onNavigateToTab('batteries');
        break;
      case 'RETURN':
        onNavigateToTab('rentals');
        break;
    }
  };

  const getActionButtonLabel = (type: ClientRequestType) => {
    switch (type) {
      case 'RENTAL':
        return 'Оформить аренду в CRM';
      case 'BUY':
        return 'Открыть Магазин (POS)';
      case 'REPAIR':
        return 'Открыть Мастерскую СТО';
      case 'BATTERY_SWAP':
        return 'Открыть Склад АКБ';
      case 'RETURN':
        return 'Открыть Аренды (закрыть)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div
        onClick={() => setIsQueueOpen(false)}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-2xs pointer-events-auto transition-opacity"
      />

      {/* Slide-over Drawer Panel on the right */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-auto">
        <div className="w-screen max-w-md bg-white dark:bg-[#0c1813] border-l border-slate-200 dark:border-emerald-500/20 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#09120e]">
            <div className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  Очередь у стойки
                  {activeWaitingCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-xs">
                      {activeWaitingCount}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Входящие клиенты в реальном времени
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={spawnManualClient}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-100 transition"
                title="Позвать еще одного клиента прямо сейчас"
              >
                + Клиент
              </button>
              <button
                onClick={() => setIsQueueOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="grow overflow-y-auto p-4 space-y-3.5">
            {queue.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="text-4xl mb-3">☕</div>
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  У стойки пока никого нет
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Симуляция идет — новый клиент появится в течение минуты. Или нажмите кнопку "+ Клиент", чтобы позвать посетителя сразу.
                </p>
                <button
                  onClick={spawnManualClient}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
                >
                  Позвать первого клиента
                </button>
              </div>
            ) : (
              queue.map((client) => {
                const isWaiting = client.status === 'WAITING';
                return (
                  <div
                    key={client.id}
                    className={`rounded-2xl border p-4 transition-all text-xs ${
                      isWaiting
                        ? 'bg-white dark:bg-[#101d17] border-emerald-500/40 dark:border-emerald-500/30 shadow-md ring-1 ring-emerald-500/10'
                        : client.status === 'SERVED'
                        ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-75'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{client.avatar}</span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            {client.name}
                            <span className="text-[10px] font-normal text-slate-400">
                              • {client.createdAtGameTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{client.company}</span>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{client.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div>{getRequestBadge(client.requestType)}</div>
                    </div>

                    {/* Dialogue quote bubble */}
                    <div className="p-3 bg-slate-50 dark:bg-[#07100b] rounded-xl border border-slate-200/70 dark:border-emerald-500/15 text-slate-700 dark:text-slate-300 text-xs italic mb-3 relative">
                      <MessageSquareQuote className="w-3.5 h-3.5 text-slate-400 absolute top-2 right-2" />
                      «{client.dialogue}»
                    </div>

                    {/* Request metadata chips */}
                    <div className="space-y-1 mb-3 text-[11px]">
                      {client.requestedDetails.item && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Что требуется:</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            {client.requestedDetails.item}
                          </span>
                        </div>
                      )}
                      {client.requestedDetails.duration && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Срок:</span>
                          <span>{client.requestedDetails.duration}</span>
                        </div>
                      )}
                      {client.requestedDetails.issue && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Проблема:</span>
                          <span className="text-amber-600 dark:text-amber-400">{client.requestedDetails.issue}</span>
                        </div>
                      )}
                      {client.requestedDetails.budget && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Бюджет / оплата:</span>
                          <span>{client.requestedDetails.budget}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions bar */}
                    {isWaiting ? (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                        <button
                          onClick={() => handleActionClick(client)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-xs transition hover:scale-101 active:scale-99"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {getActionButtonLabel(client.requestType)}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => serveClient(client.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/40 font-bold rounded-xl transition"
                            title="Отметить клиента как успешно обслуженного"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Обслужен ✅
                          </button>
                          <button
                            onClick={() => rejectClient(client.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 font-semibold rounded-xl transition"
                            title="Отказать, если в CRM нет свободных байков или запчастей"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Отказать ❌
                          </button>
                        </div>
                      </div>
                    ) : client.status === 'SERVED' ? (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        <CheckCircle className="w-4 h-4" />
                        Успешно обслужен и внесен в учет
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-semibold text-[11px]">
                        <XCircle className="w-4 h-4" />
                        Запрос отклонен (нет в наличии / отказ)
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
