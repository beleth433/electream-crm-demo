import { useCrmRefresh } from '../hooks/useCrmRefresh';
import React, { useState, useEffect } from 'react';
import { RepairOrder, Bike, Battery, Client, Part, RepairStatus, RepairFaultType } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Wrench,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Boxes,
  User,
  Shield,
  FileText,
  DollarSign,
  Sparkles,
  Zap,
  Bike as BikeIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { getNextSequentialNumber, getStoredPrefix, setStoredPrefix } from '../utils/numbering';
import { getBikeStatusLabel, getBatteryStatusLabel } from '../utils/statusLabels';

interface RepairsPageProps {
  initialData?: {
    clientName?: string;
    clientPhone?: string;
    description?: string;
    customItemName?: string;
  } | null;
  onClearInitialData?: () => void;
}

export const RepairsPage: React.FC<RepairsPageProps> = ({ initialData, onClearInitialData }) => {
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create Order Modal & Prefix State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [repairPrefix, setRepairPrefix] = useState<string>(() => getStoredPrefix('repair', 'ЗН-'));
  const [createForm, setCreateForm] = useState({
    itemType: 'BIKE' as 'BIKE' | 'BATTERY' | 'EXTERNAL_DEVICE',
    bikeId: '',
    batteryId: '',
    customItemName: '',
    clientType: 'EXTERNAL' as 'EXISTING' | 'EXTERNAL',
    clientId: '',
    clientName: '',
    clientPhone: '',
    orderNumber: '',
    faultType: 'COMPANY_EXPENSE' as RepairFaultType,
    description: '',
    laborCost: 0,
  });

  const calculateNextRepairNumber = (prefixToUse: string, repairList: RepairOrder[] = repairs) => {
    const existing = repairList.map((r) => r.orderNumber);
    return getNextSequentialNumber(existing, prefixToUse, 3);
  };

  const handlePrefixChange = (newPrefix: string) => {
    setRepairPrefix(newPrefix);
    setStoredPrefix('repair', newPrefix);
    const nextNum = calculateNextRepairNumber(newPrefix);
    setCreateForm((prev) => ({ ...prev, orderNumber: nextNum }));
  };

  const handleOpenCreateModal = () => {
    const nextNum = calculateNextRepairNumber(repairPrefix);
    setCreateForm({
      itemType: 'BIKE',
      bikeId: bikes[0]?.id || '',
      batteryId: batteries[0]?.id || '',
      customItemName: '',
      clientType: 'EXTERNAL',
      clientId: '',
      clientName: '',
      clientPhone: '',
      orderNumber: nextNum,
      faultType: 'COMPANY_EXPENSE',
      description: '',
      laborCost: 0,
    });
    setIsCreateModalOpen(true);
  };

  // Complete Order Modal
  const [completingRepair, setCompletingRepair] = useState<RepairOrder | null>(null);
  const [completeLaborCost, setCompleteLaborCost] = useState<number>(0);
  const [selectedPartsUsed, setSelectedPartsUsed] = useState<
    Array<{ partId: string; quantity: number }>
  >([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SBP' | 'BANK_TRANSFER'>('CASH');
  const [mechanicNotes, setMechanicNotes] = useState('');

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      api.getRepairs({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
      api.getBikes(),
      api.getBatteries(),
      api.getClients(),
      api.getParts(),
    ])
      .then(([repairsRes, bikesRes, batteriesRes, clientsRes, partsRes]) => {
        setRepairs(repairsRes);
        setBikes(bikesRes);
        setBatteries(batteriesRes);
        setClients(clientsRes);
        setParts(partsRes);
        if (bikesRes.length > 0 && !createForm.bikeId) {
          setCreateForm((prev) => ({ ...prev, bikeId: bikesRes[0].id }));
        }
        if (batteriesRes.length > 0 && !createForm.batteryId) {
          setCreateForm((prev) => ({ ...prev, batteryId: batteriesRes[0].id }));
        }
      })
      .catch((err) => toast.error('Ошибка загрузки СТО: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useCrmRefresh(loadData);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Handle incoming simulation or walk-in client
  useEffect(() => {
    if (initialData) {
      const nextNum = calculateNextRepairNumber(repairPrefix);
      setCreateForm({
        itemType: 'EXTERNAL_DEVICE',
        bikeId: '',
        batteryId: '',
        customItemName: initialData.customItemName || 'Сторонняя техника клиента',
        clientType: 'EXTERNAL',
        clientId: '',
        clientName: initialData.clientName || '',
        clientPhone: initialData.clientPhone || '',
        orderNumber: nextNum,
        faultType: 'CLIENT_FAULT',
        description: initialData.description || '',
        laborCost: 1000,
      });
      setIsCreateModalOpen(true);
      onClearInitialData?.();
    }
  }, [initialData]);

  const handleCreateRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRepair({
        itemType: createForm.itemType,
        bikeId: createForm.itemType === 'BIKE' ? createForm.bikeId : undefined,
        batteryId: createForm.itemType === 'BATTERY' ? createForm.batteryId : undefined,
        customItemName: createForm.itemType === 'EXTERNAL_DEVICE' ? createForm.customItemName : undefined,
        clientName: createForm.itemType === 'EXTERNAL_DEVICE' ? createForm.clientName : undefined,
        clientPhone: createForm.itemType === 'EXTERNAL_DEVICE' ? createForm.clientPhone : undefined,
        clientId: createForm.itemType === 'EXTERNAL_DEVICE' && createForm.clientId ? createForm.clientId : undefined,
        orderNumber: createForm.orderNumber,
        faultType: createForm.faultType,
        description: createForm.description,
        laborCost: createForm.laborCost,
      });
      toast.success(
        createForm.itemType === 'EXTERNAL_DEVICE'
          ? `Заказ-наряд СТО на технику клиента "${createForm.customItemName || 'клиентский байк'}" успешно создан!`
          : createForm.itemType === 'BATTERY'
          ? 'Заказ-наряд СТО успешно создан! Аккумулятор переведен в статус ТО.'
          : 'Заказ-наряд СТО успешно создан! Байк переведен в статус «В ремонте».'
      );
      const nextNum = getNextSequentialNumber(
        [...repairs.map((r) => r.orderNumber), createForm.orderNumber],
        repairPrefix,
        3
      );
      setIsCreateModalOpen(false);
      setCreateForm({
        itemType: 'BIKE',
        bikeId: bikes[0]?.id || '',
        batteryId: batteries[0]?.id || '',
        customItemName: '',
        clientType: 'EXTERNAL',
        clientId: '',
        clientName: '',
        clientPhone: '',
        orderNumber: nextNum,
        faultType: 'COMPANY_EXPENSE',
        description: '',
        laborCost: 0,
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания заказ-наряда');
    }
  };

  const handleOpenCompleteModal = (order: RepairOrder) => {
    setCompletingRepair(order);
    setCompleteLaborCost(order.laborCost || 800);
    // Initialize parts used from order
    setSelectedPartsUsed(order.parts.map((p) => ({ partId: p.partId, quantity: p.quantity })));
  };

  const addPartToUsage = (partId: string) => {
    if (!partId) return;
    setSelectedPartsUsed((prev) => {
      const existing = prev.find((p) => p.partId === partId);
      if (existing) {
        return prev.map((p) => (p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { partId, quantity: 1 }];
    });
  };

  const removePartFromUsage = (partId: string) => {
    setSelectedPartsUsed((prev) => prev.filter((p) => p.partId !== partId));
  };

  const handleConfirmComplete = async () => {
    if (!completingRepair) return;
    try {
      await api.completeRepair(completingRepair.id, {
        laborCost: Number(completeLaborCost),
        partsUsed: selectedPartsUsed,
        paymentMethod: completingRepair.faultType === 'CLIENT_FAULT' ? paymentMethod : undefined,
        mechanicNotes,
      });
      toast.success(
        `Заказ-наряд ${completingRepair.orderNumber} завершен! Запчасти списаны, объект возвращен в статус «Свободен».`
      );
      setCompletingRepair(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка завершения заказ-наряда');
    }
  };

  // Compute live parts cost in completion modal
  const computedPartsCost = selectedPartsUsed.reduce((sum, item) => {
    const part = parts.find((p) => p.id === item.partId);
    if (!part) return sum;
    const price = completingRepair?.faultType === 'CLIENT_FAULT' ? part.clientPrice : part.purchasePrice;
    return sum + price * item.quantity;
  }, 0);
  const computedTotalCost = Number(completeLaborCost || 0) + computedPartsCost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Мастерская и СТО
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Учет ремонтных работ, списание деталей со склада, разделение ответственности
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Новый заказ-наряд</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'ALL', label: 'Все заказы' },
          { id: 'DIAGNOSTICS', label: 'Диагностика' },
          { id: 'WAITING_PARTS', label: 'Ожидание запчастей' },
          { id: 'IN_PROGRESS', label: 'В работе' },
          { id: 'COMPLETED', label: 'Завершенные' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                : 'bg-white dark:bg-[#0c1511] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-emerald-500/20 hover:bg-slate-50 dark:hover:bg-[#101d17]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {repairs.map((order) => {
          const isCompleted = order.status === 'COMPLETED';
          const isClientFault = order.faultType === 'CLIENT_FAULT';

          return (
            <div
              key={order.id}
              className={`p-5 flex flex-col justify-between transition-all ${
                order.status === 'WAITING_PARTS'
                  ? 'contour-card-amber'
                  : 'contour-card'
              } ${isCompleted ? 'opacity-90' : ''}`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                      {order.orderNumber}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      от {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge type="repair" status={order.status} />
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isClientFault
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                      }`}
                    >
                      {isClientFault ? 'Вина курьера (Оплата)' : 'За счет сервиса (Износ)'}
                    </span>
                  </div>
                </div>

                {/* Item info (Bike, Battery or External Client Device) */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    {order.itemType === 'EXTERNAL_DEVICE' || (!order.bike && !order.battery) ? (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-purple-600 dark:text-purple-400">
                              {order.customItemName || 'Техника клиента'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold rounded">
                              Сторонняя техника
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                            {order.clientName || 'Посетитель СТО'} {order.clientPhone ? `• ${order.clientPhone}` : ''}
                          </p>
                        </div>
                      </>
                    ) : order.itemType === 'BATTERY' || (!order.bike && order.battery) ? (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-amber-600 dark:text-amber-400">
                              {order.battery?.serialNumber || 'АКБ'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold rounded">
                              АКБ
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                            {order.battery?.model?.name || 'Аккумулятор'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                          <BikeIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sky-600 dark:text-sky-400">
                              {order.bike?.inventoryNumber || 'Байк'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-bold rounded">
                              Байк
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                            {order.bike?.model?.name || 'Электровелосипед'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px] shrink-0">
                    Мастер: {order.mechanic?.fullName || 'Мастер СТО'}
                  </span>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Неисправность:
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed whitespace-pre-line">
                    {order.description}
                  </p>
                </div>

                {/* Parts Used */}
                {order.parts && order.parts.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                      <Boxes className="w-3.5 h-3.5" /> Запчасти в заказе:
                    </p>
                    <div className="space-y-1">
                      {order.parts.map((pu, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400"
                        >
                          <span>• {pu.part?.name || 'Деталь'} ({pu.quantity} шт.)</span>
                          <span className="font-semibold">
                            {(pu.priceCharged * pu.quantity).toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Cost and Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Итого затраты:</span>
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {order.totalCost.toLocaleString('ru-RU')} ₽
                  </p>
                </div>

                {!isCompleted ? (
                  <button
                    onClick={() => handleOpenCompleteModal(order)}
                    className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Завершить и списать детали</span>
                    <span className="sm:hidden">Завершить</span>
                  </button>
                ) : (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Завершен{' '}
                    {order.completedAt && new Date(order.completedAt).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Repair Order */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Новый заказ-наряд мастерской СТО"
        subtitle="Регистрация байка на ремонт или плановое ТО"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRepair} className="space-y-3 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                Номер заказ-наряда *
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400 text-[10px]">Пресеты:</span>
                {['ЗН-', 'REP-', 'СТО-'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePrefixChange(p)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                      repairPrefix === p
                        ? 'bg-sky-600 text-white font-bold shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-24 shrink-0">
                <input
                  type="text"
                  placeholder="Префикс"
                  value={repairPrefix}
                  onChange={(e) => handlePrefixChange(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold font-mono text-center text-xs focus:border-sky-500 focus:outline-none"
                  title="Префикс номера наряда (например, ЗН- или REP-)"
                />
              </div>

              <div className="flex-1 relative">
                <input
                  required
                  type="text"
                  placeholder="ЗН-001"
                  value={createForm.orderNumber}
                  onChange={(e) => setCreateForm({ ...createForm, orderNumber: e.target.value })}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100 font-bold text-sm focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = calculateNextRepairNumber(repairPrefix);
                    setCreateForm((prev) => ({ ...prev, orderNumber: nextNum }));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-sky-500 transition"
                  title="Подобрать следующий свободный номер для этого префикса"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Префикс подбирает следующий номер по порядку. Можно свободно править вручную.
            </p>
          </div>

          {/* Object Type: Fleet Bike vs Fleet Battery vs External Client Device */}
          <div>
            <label className="block text-slate-500 mb-1 font-semibold text-xs min-h-[1.25rem]">
              Объект обслуживания *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCreateForm((prev) => ({ ...prev, itemType: 'BIKE', faultType: 'COMPANY_EXPENSE' }))}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                  createForm.itemType === 'BIKE'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-sm ring-1 ring-sky-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <BikeIcon className="w-4 h-4" />
                Байк из парка
              </button>
              <button
                type="button"
                onClick={() => setCreateForm((prev) => ({ ...prev, itemType: 'BATTERY', faultType: 'COMPANY_EXPENSE' }))}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                  createForm.itemType === 'BATTERY'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Zap className="w-4 h-4" />
                АКБ из парка
              </button>
              <button
                type="button"
                onClick={() => setCreateForm((prev) => ({ ...prev, itemType: 'EXTERNAL_DEVICE', faultType: 'CLIENT_FAULT' }))}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                  createForm.itemType === 'EXTERNAL_DEVICE'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-purple-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <User className="w-4 h-4" />
                Сторонняя техника
              </button>
            </div>
          </div>

          {createForm.itemType === 'BIKE' ? (
            <div>
              <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">Электровелосипед парка *</label>
              <select
                required
                value={createForm.bikeId}
                onChange={(e) => setCreateForm({ ...createForm, bikeId: e.target.value })}
                className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-base sm:text-xs"
              >
                {bikes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.inventoryNumber} — {b.model?.name} (Текущий статус: {getBikeStatusLabel(b.status)})
                  </option>
                ))}
              </select>
            </div>
          ) : createForm.itemType === 'BATTERY' ? (
            <div>
              <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">Аккумулятор парка *</label>
              <select
                required
                value={createForm.batteryId}
                onChange={(e) => setCreateForm({ ...createForm, batteryId: e.target.value })}
                className="w-full h-11 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-base sm:text-xs"
              >
                {batteries.map((bat) => (
                  <option key={bat.id} value={bat.id}>
                    {bat.serialNumber} — {bat.model?.name || 'АКБ'} (Текущий статус: {getBatteryStatusLabel(bat.status)})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3 p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Сторонняя техника курьера / посетителя СТО:
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold">
                  Не из баланса парка
                </span>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">
                  Модель / Описание техники клиента *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Например: Minako V8, Kugoo Kirin V1, Сторонний АКБ 60V 21Ah..."
                  value={createForm.customItemName}
                  onChange={(e) => setCreateForm({ ...createForm, customItemName: e.target.value })}
                  className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 rounded-lg font-bold text-xs"
                />
              </div>

              {/* Customer Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-500 text-xs min-h-[1.25rem]">
                    Данные клиента / заказчика
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCreateForm((prev) => ({ ...prev, clientType: 'EXTERNAL' }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        createForm.clientType === 'EXTERNAL'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      Новый клиент
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm((prev) => ({ ...prev, clientType: 'EXISTING' }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        createForm.clientType === 'EXISTING'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      Из базы CRM
                    </button>
                  </div>
                </div>

                {createForm.clientType === 'EXISTING' ? (
                  <div>
                    <select
                      value={createForm.clientId}
                      onChange={(e) => {
                        const sel = clients.find((c) => c.id === e.target.value);
                        setCreateForm((prev) => ({
                          ...prev,
                          clientId: e.target.value,
                          clientName: sel ? sel.fullName : '',
                          clientPhone: sel ? sel.phone : '',
                        }));
                      }}
                      className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 rounded-lg text-xs"
                    >
                      <option value="">-- Выберите клиента из базы --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.phone} • {c.courierService || 'Клиент'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col justify-between">
                      <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">
                        ФИО владельца / курьера
                      </label>
                      <input
                        type="text"
                        placeholder="Иван Иванов"
                        value={createForm.clientName}
                        onChange={(e) => setCreateForm({ ...createForm, clientName: e.target.value })}
                        className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex flex-col justify-between">
                      <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">
                        Телефон для связи
                      </label>
                      <input
                        type="text"
                        placeholder="+7 (999) 000-00-00"
                        value={createForm.clientPhone}
                        onChange={(e) => setCreateForm({ ...createForm, clientPhone: e.target.value })}
                        className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-500 mb-1">Разделение ответственности *</label>
            <select
              value={createForm.faultType}
              onChange={(e) => setCreateForm({ ...createForm, faultType: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
            >
              <option value="COMPANY_EXPENSE">
                Естественный износ / Брак (За счет компании)
              </option>
              <option value="CLIENT_FAULT">
                Вина курьера / ДТП (Оплачивается курьером)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Описание дефекта / работы мастера *</label>
            <textarea
              required
              rows={3}
              placeholder="Опишите неисправность, результаты диагностики..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Стоимость работ (нормо-час / работа), ₽</label>
            <input
              type="number"
              step="any"
              min="0"
              value={createForm.laborCost}
              onChange={(e) => setCreateForm({ ...createForm, laborCost: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm"
            >
              Создать заказ-наряд
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Complete Repair Order */}
      <Modal
        isOpen={!!completingRepair}
        onClose={() => setCompletingRepair(null)}
        title="Завершение ремонта и списание запчастей"
        subtitle={`Заказ-наряд ${completingRepair?.orderNumber} • ${
          completingRepair?.itemType === 'EXTERNAL_DEVICE'
            ? `${completingRepair?.customItemName || 'Техника клиента'} (${completingRepair?.clientName || 'Посетитель СТО'})`
            : completingRepair?.itemType === 'BATTERY' || completingRepair?.battery
            ? `АКБ ${completingRepair?.battery?.serialNumber || ''}`
            : `Байк ${completingRepair?.bike?.inventoryNumber || ''}`
        }`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Add parts selector */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Списать запчасти со склада:
            </label>
            <div className="flex gap-2">
              <select
                id="part-select"
                className="grow px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                {parts.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                    {p.name} ({p.sku}) — на складе: {p.quantity} шт. (
                    {completingRepair?.faultType === 'CLIENT_FAULT' ? p.clientPrice : p.purchasePrice} ₽)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const sel = document.getElementById('part-select') as HTMLSelectElement;
                  if (sel) addPartToUsage(sel.value);
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shrink-0"
              >
                + Добавить деталь
              </button>
            </div>

            {/* Selected parts table */}
            {selectedPartsUsed.length > 0 && (
              <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                {selectedPartsUsed.map((item) => {
                  const part = parts.find((p) => p.id === item.partId);
                  const price =
                    completingRepair?.faultType === 'CLIENT_FAULT'
                      ? part?.clientPrice || 0
                      : part?.purchasePrice || 0;

                  return (
                    <div
                      key={item.partId}
                      className="flex items-center justify-between py-1.5 px-1 text-xs"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                        {part?.name} ({item.quantity} шт.)
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono">{(price * item.quantity).toLocaleString('ru-RU')} ₽</span>
                        <button
                          type="button"
                          onClick={() => removePartFromUsage(item.partId)}
                          className="text-rose-500 hover:underline text-[10px]"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Стоимость работ (₽) *</label>
              <input
                type="number"
                step="any"
                min="0"
                value={completeLaborCost}
                onChange={(e) => setCompleteLaborCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
              />
            </div>

            {completingRepair?.faultType === 'CLIENT_FAULT' && (
              <div>
                <label className="block text-slate-500 mb-1">Способ оплаты клиентом</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  <option value="CASH">Наличные</option>
                  <option value="CARD">Банковская карта</option>
                  <option value="SBP">СБП / QR-код</option>
                  <option value="BANK_TRANSFER">Безналичный расчет</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Отчет мастера по выполненным работам</label>
            <input
              type="text"
              placeholder="Колодки притерты, гидролиния прокачана..."
              value={mechanicNotes}
              onChange={(e) => setMechanicNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          {/* Cost breakdown */}
          <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between font-bold">
            <div>
              <p className="text-slate-400 text-[10px]">Запчасти: {computedPartsCost} ₽ | Работа: {completeLaborCost} ₽</p>
              <p className="text-sm text-emerald-400">ИТОГО: {computedTotalCost.toLocaleString('ru-RU')} ₽</p>
            </div>
            <button
              type="button"
              onClick={handleConfirmComplete}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition-all"
            >
              Списать со склада и закрыть заказ
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
