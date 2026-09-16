import React, { useState, useEffect } from 'react';
import { Battery, BatteryStats, BatteryStatus, Bike } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import {
  BatteryCharging,
  Zap,
  Bike as BikeIcon,
  Wrench,
  Activity,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  Layers,
  ArrowRightLeft,
  LogOut,
  LayoutGrid,
  Table as TableIcon,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export const BatteriesPage: React.FC = () => {
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [stats, setStats] = useState<BatteryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters & View
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [voltageFilter, setVoltageFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal: Create Battery
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    serialNumber: '',
    voltage: 60,
    capacityAh: 21,
    connector: 'XT60',
    cycleCount: 0,
    healthPercent: 100,
    location: 'Стеллаж зарядки #1 (База)',
    notes: '',
  });

  // Modal: Edit Battery
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBattery, setEditingBattery] = useState<Battery | null>(null);
  const [editForm, setEditForm] = useState({
    serialNumber: '',
    voltage: 60,
    capacityAh: 21,
    connector: 'XT60',
    cycleCount: 0,
    healthPercent: 100,
    status: 'AVAILABLE' as BatteryStatus,
    location: '',
    notes: '',
  });

  // Modal: Attach to Bike
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [targetBattery, setTargetBattery] = useState<Battery | null>(null);
  const [selectedBikeId, setSelectedBikeId] = useState<string>('');

  // Modal: Quick Swap
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTargetBike, setSwapTargetBike] = useState<Bike | null>(null);
  const [swapNewBatteryId, setSwapNewBatteryId] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [batList, batStats, bikeList] = await Promise.all([
        api.getBatteries(),
        api.getBatteryStats(),
        api.getBikes(),
      ]);
      setBatteries(batList);
      setStats(batStats);
      setBikes(bikeList);
    } catch (err: any) {
      toast.error('Ошибка загрузки батарейного парка: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate unique serial number helper
  const handleGenerateSerial = (volts: number) => {
    const prefix = `BAT-${volts}V-`;
    const existingNums = batteries
      .filter((b) => b.serialNumber.startsWith(prefix))
      .map((b) => {
        const numPart = parseInt(b.serialNumber.replace(prefix, ''), 10);
        return isNaN(numPart) ? 0 : numPart;
      });
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    const nextSerial = `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;
    setCreateForm((prev) => ({ ...prev, serialNumber: nextSerial }));
  };

  // Create battery submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.serialNumber.trim()) {
      toast.error('Укажите серийный номер аккумулятора');
      return;
    }

    try {
      await api.createBattery(createForm);
      toast.success(`Аккумулятор ${createForm.serialNumber} успешно оприходован`);
      setIsCreateModalOpen(false);
      setCreateForm({
        serialNumber: '',
        voltage: 60,
        capacityAh: 21,
        connector: 'XT60',
        cycleCount: 0,
        healthPercent: 100,
        location: 'Стеллаж зарядки #1 (База)',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      toast.error('Ошибка создания АКБ: ' + err.message);
    }
  };

  // Open edit modal
  const handleOpenEdit = (bat: Battery) => {
    setEditingBattery(bat);
    setEditForm({
      serialNumber: bat.serialNumber,
      voltage: bat.voltage,
      capacityAh: bat.capacityAh,
      connector: bat.connector,
      cycleCount: bat.cycleCount,
      healthPercent: bat.healthPercent,
      status: bat.status,
      location: bat.location,
      notes: bat.notes || '',
    });
    setIsEditModalOpen(true);
  };

  // Update battery submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBattery) return;

    try {
      await api.updateBattery(editingBattery.id, editForm);
      toast.success(`Параметры АКБ ${editForm.serialNumber} обновлены`);
      setIsEditModalOpen(false);
      setEditingBattery(null);
      loadData();
    } catch (err: any) {
      toast.error('Ошибка обновления АКБ: ' + err.message);
    }
  };

  // Delete / Decommission battery
  const handleDeleteBattery = async (bat: Battery) => {
    if (bat.installedBikeId) {
      toast.error(`АКБ установлен на байке. Сначала снимите его!`);
      return;
    }
    if (!confirm(`Вы действительно хотите списать/удалить аккумулятор ${bat.serialNumber}?`)) {
      return;
    }

    try {
      await api.deleteBattery(bat.id);
      toast.success(`АКБ ${bat.serialNumber} удален из парка`);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Open attach modal
  const handleOpenAttach = (bat: Battery) => {
    setTargetBattery(bat);
    // Suggest first empty available bike or first bike
    const emptyBike = bikes.find((b) => !b.batteryId && b.status !== 'DECOMMISSIONED' && b.status !== 'SOLD');
    setSelectedBikeId(emptyBike ? emptyBike.id : bikes[0]?.id || '');
    setIsAttachModalOpen(true);
  };

  // Attach submit
  const handleAttachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBattery || !selectedBikeId) return;

    try {
      await api.attachBattery(targetBattery.id, selectedBikeId);
      const chosenBike = bikes.find((b) => b.id === selectedBikeId);
      toast.success(`АКБ ${targetBattery.serialNumber} установлен на байк ${chosenBike?.inventoryNumber}`);
      setIsAttachModalOpen(false);
      setTargetBattery(null);
      loadData();
    } catch (err: any) {
      toast.error('Ошибка установки АКБ: ' + err.message);
    }
  };

  // Detach battery
  const handleDetach = async (bikeId: string, serialNumber: string) => {
    if (!confirm(`Снять АКБ ${serialNumber} с электровелосипеда и вернуть на зарядный стеллаж?`)) {
      return;
    }

    try {
      await api.detachBattery(bikeId);
      toast.success(`АКБ ${serialNumber} снят на базу на зарядку`);
      loadData();
    } catch (err: any) {
      toast.error('Ошибка снятия АКБ: ' + err.message);
    }
  };

  // Open quick swap modal
  const handleOpenSwap = (bike: Bike) => {
    setSwapTargetBike(bike);
    // Look for available batteries matching voltage if possible
    const availableBatteries = batteries.filter((b) => b.status === 'AVAILABLE');
    setSwapNewBatteryId(availableBatteries[0]?.id || '');
    setIsSwapModalOpen(true);
  };

  // Quick swap submit
  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapTargetBike || !swapNewBatteryId) {
      toast.error('Выберите аккумулятор для установки');
      return;
    }

    try {
      await api.swapBattery(swapTargetBike.id, swapNewBatteryId);
      const newBat = batteries.find((b) => b.id === swapNewBatteryId);
      toast.success(
        `АКБ на байке ${swapTargetBike.inventoryNumber} успешно заменен на ${newBat?.serialNumber}`
      );
      setIsSwapModalOpen(false);
      setSwapTargetBike(null);
      loadData();
    } catch (err: any) {
      toast.error('Ошибка замены АКБ: ' + err.message);
    }
  };

  // Send to maintenance or return
  const handleToggleMaintenance = async (bat: Battery) => {
    if (bat.status === 'IN_MAINTENANCE') {
      try {
        await api.updateBattery(bat.id, {
          status: 'AVAILABLE',
          location: 'Стеллаж зарядки #1 (После ТО/балансировки)',
        });
        toast.success(`АКБ ${bat.serialNumber} возвращен с ТО на зарядку`);
        loadData();
      } catch (err: any) {
        toast.error(err.message);
      }
    } else {
      if (bat.installedBikeId) {
        toast.error('Сначала снимите аккумулятор с байка!');
        return;
      }
      try {
        await api.updateBattery(bat.id, {
          status: 'IN_MAINTENANCE',
          location: 'Зона ремонта АКБ СТО (Диагностика/балансировка BMS)',
        });
        toast.success(`АКБ ${bat.serialNumber} отправлен на ТО СТО`);
        loadData();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  // Filtering
  const filteredBatteries = batteries.filter((bat) => {
    if (statusFilter !== 'ALL' && bat.status !== statusFilter) return false;
    if (voltageFilter !== 'ALL' && bat.voltage.toString() !== voltageFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchSerial = bat.serialNumber.toLowerCase().includes(q);
      const matchLocation = bat.location.toLowerCase().includes(q);
      const matchNotes = bat.notes ? bat.notes.toLowerCase().includes(q) : false;
      const matchBike = bat.installedBike
        ? bat.installedBike.inventoryNumber.toLowerCase().includes(q) ||
          (bat.installedBike.modelName && bat.installedBike.modelName.toLowerCase().includes(q))
        : false;
      if (!matchSerial && !matchLocation && !matchNotes && !matchBike) return false;
    }
    return true;
  });

  const getStatusBadge = (status: BatteryStatus, bike?: any) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-900/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Свободен на зарядке
          </span>
        );
      case 'INSTALLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20 shadow-sm shadow-sky-900/20">
            <Zap className="w-3 h-3 text-sky-400" />
            На байке {bike ? bike.inventoryNumber : ''}
          </span>
        );
      case 'ISSUED_SPARE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-sm">
            Доп. АКБ у курьера
          </span>
        );
      case 'IN_MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
            <Wrench className="w-3 h-3 text-amber-400" />
            На ТО / Диагностике
          </span>
        );
      case 'DECOMMISSIONED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm">
            <ShieldAlert className="w-3 h-3 text-red-400" />
            Списан
          </span>
        );
      case 'SOLD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600 shadow-sm">
            Продан
          </span>
        );
      default:
        return null;
    }
  };

  const getVoltageBadgeColor = (voltage: number) => {
    if (voltage >= 72) return 'bg-purple-950/50 text-purple-300 border-purple-800';
    if (voltage >= 60) return 'bg-cyan-950/50 text-cyan-300 border-cyan-800';
    return 'bg-blue-950/50 text-blue-300 border-blue-800';
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-emerald-400 bg-emerald-500';
    if (health >= 75) return 'text-amber-400 bg-amber-500';
    return 'text-rose-400 bg-rose-500';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40">
              <BatteryCharging className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white">Парк аккумуляторов (АКБ)</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {batteries.length} шт
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Независимый учет тяговых батарей, контроль циклов и SoH ячеек, быстрая замена и привязка к байкам
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Сетка карточек"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Таблица"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              handleGenerateSerial(60);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            Оприходовать АКБ
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="contour-card p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Всего в парке</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats.total}</span>
              <span className="text-xs text-slate-400">АКБ</span>
            </div>
          </div>

          <div className="contour-card p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-medium">Свободно (база)</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">{stats.available}</span>
              <span className="text-xs text-emerald-500/80">на зарядке</span>
            </div>
          </div>

          <div className="contour-card p-3 rounded-xl bg-sky-950/20 border border-sky-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-sky-400">
              <span className="text-xs font-medium">На байках</span>
              <BikeIcon className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-sky-400">{stats.installed}</span>
              <span className="text-xs text-sky-500/80">в работе</span>
            </div>
          </div>

          <div className="contour-card p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-xs font-medium">Доп. у курьеров</span>
              <BatteryCharging className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-400">{stats.issuedSpare}</span>
              <span className="text-xs text-purple-400/80">в сумках</span>
            </div>
          </div>

          <div className="contour-card p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-xs font-medium">СТО / Ремонт BMS</span>
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400">{stats.inMaintenance}</span>
              <span className="text-xs text-amber-500/80">на ТО</span>
            </div>
          </div>

          <div className="contour-card p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Средний SoH</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">{stats.avgHealth}%</span>
              <span className="text-xs text-slate-400">здоровье</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filters & Search Bar */}
      <div className="contour-card p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск по номеру BAT-..., байку или локации..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Voltage Filter Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-slate-500 mr-1 hidden sm:inline">Вольтаж:</span>
            {['ALL', '48', '60', '72'].map((v) => (
              <button
                key={v}
                onClick={() => setVoltageFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  voltageFilter === v
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {v === 'ALL' ? 'Все' : `${v}V`}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-slate-800/60 text-xs">
          {[
            { id: 'ALL', label: 'Все АКБ', count: batteries.length },
            { id: 'AVAILABLE', label: 'Свободны на зарядке', count: stats?.available },
            { id: 'INSTALLED', label: 'Установлены на байках', count: stats?.installed },
            { id: 'ISSUED_SPARE', label: 'Доп. у курьеров', count: stats?.issuedSpare },
            { id: 'IN_MAINTENANCE', label: 'В ремонте / ТО', count: stats?.inMaintenance },
            { id: 'DECOMMISSIONED', label: 'Списанные', count: stats?.decommissioned },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-md whitespace-nowrap font-medium transition flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Batteries List / Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
          <span>Загрузка батарейного парка...</span>
        </div>
      ) : filteredBatteries.length === 0 ? (
        <div className="contour-card p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <BatteryCharging className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Аккумуляторы не найдены</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
            По заданным фильтрам нет подходящих АКБ. Попробуйте сбросить фильтры или добавьте новую батарею.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setVoltageFilter('ALL');
            }}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatteries.map((bat) => {
            const healthColor = getHealthColor(bat.healthPercent);
            return (
              <div
                key={bat.id}
                className="contour-card rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition p-4 flex flex-col justify-between group shadow-lg shadow-black/40"
              >
                <div>
                  {/* Top Bar: Voltage, Serial, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${getVoltageBadgeColor(
                          bat.voltage
                        )}`}
                      >
                        {bat.voltage}V {bat.capacityAh}Ah
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {bat.connector}
                      </span>
                    </div>
                    {getStatusBadge(bat.status, bat.installedBike)}
                  </div>

                  {/* Serial Number */}
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold font-mono text-white tracking-wide flex items-center gap-2">
                        {bat.serialNumber}
                      </h3>
                    </div>
                  </div>

                  {/* Health SoH & Cycles */}
                  <div className="mt-3 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        Здоровье ячеек (SoH):
                      </span>
                      <span className={`font-semibold font-mono ${healthColor.split(' ')[0]}`}>
                        {bat.healthPercent}%
                      </span>
                    </div>
                    {/* Health Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${healthColor.split(' ')[1]}`}
                        style={{ width: `${Math.min(100, Math.max(5, bat.healthPercent))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Циклов перезаряда:</span>
                      <span className="font-mono text-slate-300 font-medium">{bat.cycleCount} ц.</span>
                    </div>
                  </div>

                  {/* Current Placement Details */}
                  <div className="mt-3 text-xs space-y-1.5">
                    {bat.installedBike ? (
                      <div className="p-2 rounded-lg bg-sky-950/20 border border-sky-800/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BikeIcon className="w-4 h-4 text-sky-400" />
                          <div>
                            <span className="text-slate-300 font-medium">Установлен на байк: </span>
                            <span className="font-bold text-sky-300 font-mono">
                              {bat.installedBike.inventoryNumber}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {bat.installedBike.modelName || 'Электробайк'}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 flex items-center gap-2 text-slate-400">
                        <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{bat.location}</span>
                      </div>
                    )}

                    {bat.notes && (
                      <p className="text-[11px] text-slate-400 italic px-1 line-clamp-2">"{bat.notes}"</p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {bat.status === 'AVAILABLE' && (
                      <button
                        onClick={() => handleOpenAttach(bat)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition shadow-md shadow-emerald-950/30"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Установить на байк
                      </button>
                    )}

                    {bat.status === 'INSTALLED' && bat.installedBikeId && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const bike = bikes.find((b) => b.id === bat.installedBikeId);
                            if (bike) handleOpenSwap(bike);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-medium transition"
                          title="Заменить АКБ на другой в 1 клик"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          Сменить
                        </button>
                        <button
                          onClick={() => handleDetach(bat.installedBikeId!, bat.serialNumber)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                          title="Снять АКБ на зарядный стеллаж"
                        >
                          <LogOut className="w-3 h-3 text-slate-400" />
                          Снять
                        </button>
                      </div>
                    )}

                    {bat.status === 'IN_MAINTENANCE' && (
                      <button
                        onClick={() => handleToggleMaintenance(bat)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        Вернуть с ТО
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(bat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Редактировать параметры"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!bat.installedBikeId && bat.status !== 'DECOMMISSIONED' && (
                      <button
                        onClick={() => handleToggleMaintenance(bat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                        title={bat.status === 'IN_MAINTENANCE' ? 'Вернуть с ТО' : 'Отправить на ТО / балансировку'}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!bat.installedBikeId && (
                      <button
                        onClick={() => handleDeleteBattery(bat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                        title="Списать / удалить АКБ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="contour-card rounded-xl bg-slate-900/80 border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Серийный номер</th>
                <th className="px-4 py-3">Характеристики</th>
                <th className="px-4 py-3">Здоровье (SoH) / Циклы</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Текущее размещение</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBatteries.map((bat) => {
                const healthColor = getHealthColor(bat.healthPercent);
                return (
                  <tr key={bat.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-white whitespace-nowrap">
                      {bat.serialNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border ${getVoltageBadgeColor(
                            bat.voltage
                          )}`}
                        >
                          {bat.voltage}V {bat.capacityAh}Ah
                        </span>
                        <span className="text-xs text-slate-400 font-mono">({bat.connector})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-semibold text-xs ${healthColor.split(' ')[0]}`}>
                          {bat.healthPercent}%
                        </span>
                        <span className="text-slate-500 text-xs">• {bat.cycleCount} ц.</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(bat.status, bat.installedBike)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {bat.installedBike ? (
                        <span className="text-sky-300 font-medium font-mono">
                          Байк {bat.installedBike.inventoryNumber}
                        </span>
                      ) : (
                        bat.location
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {bat.status === 'AVAILABLE' && (
                          <button
                            onClick={() => handleOpenAttach(bat)}
                            className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-xs transition"
                          >
                            Установить
                          </button>
                        )}
                        {bat.status === 'INSTALLED' && bat.installedBikeId && (
                          <button
                            onClick={() => handleDetach(bat.installedBikeId!, bat.serialNumber)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                          >
                            Снять
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(bat)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Редактировать"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!bat.installedBikeId && (
                          <button
                            onClick={() => handleDeleteBattery(bat)}
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: Оприходовать новый АКБ */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Оприходование нового аккумулятора (АКБ)"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Серийный номер *</label>
                <button
                  type="button"
                  onClick={() => handleGenerateSerial(createForm.voltage)}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Сгенерировать
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="BAT-60V-023"
                value={createForm.serialNumber}
                onChange={(e) => setCreateForm({ ...createForm, serialNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Вольтаж (V) *</label>
              <select
                value={createForm.voltage}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCreateForm({ ...createForm, voltage: v });
                  handleGenerateSerial(v);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value={48}>48V (Wenbox U3 / Minako V8)</option>
                <option value={60}>60V (Minako Monster / Monster Pro)</option>
                <option value={72}>72V (Monster Max / Спецсборка)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Емкость (Ah) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={createForm.capacityAh}
                onChange={(e) => setCreateForm({ ...createForm, capacityAh: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Разъем подключения</label>
              <select
                value={createForm.connector}
                onChange={(e) => setCreateForm({ ...createForm, connector: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="XT60">XT60 (Стандарт)</option>
                <option value="XT90">XT90 (Усиленный анти-искра)</option>
                <option value="Anderson">Anderson Powerpole</option>
                <option value="QS8">QS8 (Высокотоковый 72V)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Здоровье SoH (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={createForm.healthPercent}
                onChange={(e) => setCreateForm({ ...createForm, healthPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Начальные циклы заряда</label>
              <input
                type="number"
                min="0"
                value={createForm.cycleCount}
                onChange={(e) => setCreateForm({ ...createForm, cycleCount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Место хранения / стеллаж</label>
            <input
              type="text"
              value={createForm.location}
              onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
              placeholder="Стеллаж зарядки #1, полка 2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Заметки / производитель ячеек</label>
            <textarea
              rows={2}
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
              placeholder="Ячейки Samsung 35E, BMS Daly 40A с термоконтролем..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-emerald-950/40"
            >
              Оприходовать в парк
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Установить АКБ на байк */}
      <Modal
        isOpen={isAttachModalOpen}
        onClose={() => {
          setIsAttachModalOpen(false);
          setTargetBattery(null);
        }}
        title={`Установка АКБ ${targetBattery?.serialNumber} на байк`}
      >
        <form onSubmit={handleAttachSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Параметры устанавливаемой батареи:
            </div>
            <p className="text-slate-300">
              {targetBattery?.serialNumber} ({targetBattery?.voltage}V {targetBattery?.capacityAh}Ah • SoH{' '}
              {targetBattery?.healthPercent}% • {targetBattery?.connector})
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Выберите электровелосипед из парка:
            </label>
            <select
              value={selectedBikeId}
              onChange={(e) => setSelectedBikeId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              {bikes
                .filter((b) => b.status !== 'DECOMMISSIONED' && b.status !== 'SOLD')
                .map((b) => {
                  const currentBat = batteries.find((bat) => bat.id === b.batteryId);
                  return (
                    <option key={b.id} value={b.id}>
                      {b.inventoryNumber} — {b.model?.name || 'Байк'} [{b.status}]{' '}
                      {currentBat ? `(Текущий АКБ: ${currentBat.serialNumber})` : '⚠️ [БЕЗ АКБ]'}
                    </option>
                  );
                })}
            </select>
          </div>

          {selectedBikeId && (() => {
            const chosenBike = bikes.find((b) => b.id === selectedBikeId);
            const currentBat = batteries.find((bat) => bat.id === chosenBike?.batteryId);
            if (currentBat) {
              return (
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Внимание: </span>
                    На байке <b>{chosenBike?.inventoryNumber}</b> уже установлен аккумулятор{' '}
                    <b>{currentBat.serialNumber}</b>. При подтверждении старый аккумулятор будет автоматически снят
                    и переведен на зарядный стеллаж базы со статусом «Свободен».
                  </div>
                </div>
              );
            }
            return (
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Байк свободен для установки аккумулятора без замены.</span>
              </div>
            );
          })()}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAttachModalOpen(false);
                setTargetBattery(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-emerald-950/40"
            >
              Установить АКБ
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Быстрая замена АКБ на байке (Своп) */}
      <Modal
        isOpen={isSwapModalOpen}
        onClose={() => {
          setIsSwapModalOpen(false);
          setSwapTargetBike(null);
        }}
        title={`Быстрая замена аккумулятора на байке ${swapTargetBike?.inventoryNumber}`}
      >
        <form onSubmit={handleSwapSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
            <div className="text-slate-400">Текущий электровелосипед:</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <BikeIcon className="w-4 h-4 text-sky-400" />
              {swapTargetBike?.inventoryNumber} — {swapTargetBike?.model?.name}
            </div>
            {swapTargetBike?.batteryId && (() => {
              const currentBat = batteries.find((b) => b.id === swapTargetBike.batteryId);
              return (
                <div className="text-amber-400 mt-1">
                  Текущий АКБ:{' '}
                  <b>
                    {currentBat?.serialNumber} ({currentBat?.voltage}V {currentBat?.capacityAh}Ah • SoH{' '}
                    {currentBat?.healthPercent}%)
                  </b>{' '}
                  будет снят на базу.
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Выберите новый заряженный АКБ со склада:
            </label>
            <select
              value={swapNewBatteryId}
              onChange={(e) => setSwapNewBatteryId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              {batteries
                .filter((b) => b.status === 'AVAILABLE')
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.serialNumber} [{b.voltage}V {b.capacityAh}Ah, SoH: {b.healthPercent}%, {b.connector}] —{' '}
                    {b.location}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsSwapModalOpen(false);
                setSwapTargetBike(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-sky-950/40"
            >
              Заменить в 1 клик
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Редактирование АКБ */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBattery(null);
        }}
        title={`Редактирование АКБ ${editingBattery?.serialNumber}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Серийный номер *</label>
              <input
                type="text"
                required
                value={editForm.serialNumber}
                onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Статус</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as BatteryStatus })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="AVAILABLE">Свободен на зарядке</option>
                <option value="INSTALLED">Установлен на байк</option>
                <option value="ISSUED_SPARE">Доп. АКБ у курьера</option>
                <option value="IN_MAINTENANCE">На ТО / Ремонте СТО</option>
                <option value="DECOMMISSIONED">Списан</option>
                <option value="SOLD">Продан</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Здоровье SoH (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editForm.healthPercent}
                onChange={(e) => setEditForm({ ...editForm, healthPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Циклов заряда</label>
              <input
                type="number"
                min="0"
                value={editForm.cycleCount}
                onChange={(e) => setEditForm({ ...editForm, cycleCount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Текущая локация</label>
            <input
              type="text"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Заметки / история ремонтов</label>
            <textarea
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingBattery(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-emerald-950/40"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
