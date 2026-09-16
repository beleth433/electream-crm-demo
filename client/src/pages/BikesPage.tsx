import React, { useState, useEffect } from 'react';
import { Bike, BikeModel, BikeStatus, Battery } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Bike as BikeIcon,
  Search,
  Plus,
  Zap,
  BatteryCharging,
  Snowflake,
  MapPin,
  Gauge,
  Edit,
  Tag,
  QrCode,
  Trash2,
  SlidersHorizontal,
  Layers,
  Check,
  X,
  ArrowRightLeft,
  LogOut,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export const BikesPage: React.FC = () => {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [models, setModels] = useState<BikeModel[]>([]);
  const [availableBatteries, setAvailableBatteries] = useState<Battery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Add Bike Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuickCreateModelOpen, setIsQuickCreateModelOpen] = useState(false);
  const [newBikeForm, setNewBikeForm] = useState({
    inventoryNumber: '',
    modelId: '',
    batteryId: '',
    frameNumber: '',
    motorNumber: '',
    currentLocation: 'Центральная база (м. Дмитровская)',
    mileageKm: 0,
    note: '',
  });

  // Battery Attach Modal
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachTargetBike, setAttachTargetBike] = useState<Bike | null>(null);
  const [attachSelectedBatteryId, setAttachSelectedBatteryId] = useState<string>('');

  // Battery Swap Modal
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTargetBike, setSwapTargetBike] = useState<Bike | null>(null);
  const [swapNewBatteryId, setSwapNewBatteryId] = useState<string>('');

  // Model Templates Management Modal
  const [isManageModelsOpen, setIsManageModelsOpen] = useState(false);
  const [newModelForm, setNewModelForm] = useState({
    name: '',
    powerWatts: 800,
    batteryCapacityAh: 21.0,
    wheelSizeInch: 16.0,
    winterVersion: false,
    description: '',
  });

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      api.getBikes({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search,
      }),
      api.getBikeModels(),
      api.getBatteries({ status: 'AVAILABLE' }),
    ])
      .then(([bikesRes, modelsRes, batteriesRes]) => {
        setBikes(bikesRes);
        setModels(modelsRes);
        setAvailableBatteries(batteriesRes);
        if (modelsRes.length > 0 && !newBikeForm.modelId) {
          setNewBikeForm((prev) => ({ ...prev, modelId: modelsRes[0].id }));
        }
      })
      .catch((err) => toast.error('Ошибка загрузки техники: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreateBike = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBike({
        ...newBikeForm,
        batteryId: newBikeForm.batteryId ? newBikeForm.batteryId : undefined,
      });
      toast.success(`Байк ${newBikeForm.inventoryNumber} успешно добавлен в парк!`);
      setIsAddModalOpen(false);
      setNewBikeForm({
        inventoryNumber: '',
        modelId: models[0]?.id || '',
        batteryId: '',
        frameNumber: '',
        motorNumber: '',
        currentLocation: 'Центральная база (м. Дмитровская)',
        mileageKm: 0,
        note: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка добавления байка');
    }
  };

  const handleOpenAttachModal = (bike: Bike) => {
    setAttachTargetBike(bike);
    setAttachSelectedBatteryId(availableBatteries[0]?.id || '');
    setIsAttachModalOpen(true);
  };

  const handleAttachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachTargetBike || !attachSelectedBatteryId) {
      toast.error('Выберите аккумулятор для установки');
      return;
    }
    try {
      await api.attachBattery(attachSelectedBatteryId, attachTargetBike.id);
      const bat = availableBatteries.find((b) => b.id === attachSelectedBatteryId);
      toast.success(`АКБ ${bat?.serialNumber || ''} установлен на байк ${attachTargetBike.inventoryNumber}`);
      setIsAttachModalOpen(false);
      setAttachTargetBike(null);
      loadData();
    } catch (err: any) {
      toast.error('Ошибка установки АКБ: ' + err.message);
    }
  };

  const handleOpenSwapModal = (bike: Bike) => {
    setSwapTargetBike(bike);
    setSwapNewBatteryId(availableBatteries[0]?.id || '');
    setIsSwapModalOpen(true);
  };

  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapTargetBike || !swapNewBatteryId) {
      toast.error('Выберите аккумулятор со склада');
      return;
    }
    try {
      await api.swapBattery(swapTargetBike.id, swapNewBatteryId);
      const bat = availableBatteries.find((b) => b.id === swapNewBatteryId);
      toast.success(
        `АКБ на байке ${swapTargetBike.inventoryNumber} заменен на ${bat?.serialNumber || ''}`
      );
      setIsSwapModalOpen(false);
      setSwapTargetBike(null);
      loadData();
    } catch (err: any) {
      toast.error('Ошибка замены АКБ: ' + err.message);
    }
  };

  const handleDetachBattery = async (bike: Bike) => {
    if (!confirm(`Снять аккумулятор с байка ${bike.inventoryNumber} на зарядный стеллаж?`)) {
      return;
    }
    try {
      await api.detachBattery(bike.id);
      toast.success(`АКБ снят с байка ${bike.inventoryNumber} на зарядку`);
      loadData();
    } catch (err: any) {
      toast.error('Ошибка снятия АКБ: ' + err.message);
    }
  };

  const handleCreateModel = async (e: React.FormEvent, isQuick = false) => {
    e.preventDefault();
    try {
      const created = await api.createBikeModel(newModelForm);
      toast.success(`Шаблон модели "${created.name}" успешно создан!`);
      const updatedModels = await api.getBikeModels();
      setModels(updatedModels);
      if (isQuick) {
        setNewBikeForm((prev) => ({ ...prev, modelId: created.id }));
        setIsQuickCreateModelOpen(false);
      }
      setNewModelForm({
        name: '',
        powerWatts: 800,
        batteryCapacityAh: 21.0,
        wheelSizeInch: 16.0,
        winterVersion: false,
        description: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания шаблона модели');
    }
  };

  const handleDeleteModel = async (model: BikeModel) => {
    if ((model.bikesCount ?? 0) > 0) {
      toast.error(
        `Невозможно удалить шаблон "${model.name}": в парке зарегистрировано ${model.bikesCount} байков этой модели!`
      );
      return;
    }
    if (window.confirm(`Вы уверены, что хотите удалить шаблон модели "${model.name}"?`)) {
      try {
        await api.deleteBikeModel(model.id);
        toast.success(`Шаблон модели "${model.name}" удален`);
        const updatedModels = await api.getBikeModels();
        setModels(updatedModels);
        if (newBikeForm.modelId === model.id && updatedModels.length > 0) {
          setNewBikeForm((prev) => ({ ...prev, modelId: updatedModels[0].id }));
        }
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления шаблона');
      }
    }
  };

  const handleDeleteBike = async (bike: Bike) => {
    if (bike.status === 'RENTED' || bike.activeRental) {
      toast.error(`Невозможно удалить байк ${bike.inventoryNumber}: он находится в активной аренде!`);
      return;
    }
    if (
      window.confirm(
        `Вы действительно хотите удалить электровелосипед ${bike.inventoryNumber} (${bike.model?.name || ''}) из парка?`
      )
    ) {
      try {
        await api.deleteBike(bike.id);
        toast.success(`Байк ${bike.inventoryNumber} успешно списан и удален из парка`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления байка');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Парк электровелосипедов
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Реестр техники, инвентарные номера, серийные номера рамы и мотор-колеса
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsManageModelsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-[#0c1511] text-slate-700 dark:text-emerald-400 hover:bg-slate-200 dark:hover:bg-[#12221b] border border-slate-200 dark:border-emerald-500/25 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
            Шаблоны моделей ({models.length})
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Добавить байк в парк
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 contour-card">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
          {[
            { id: 'ALL', label: 'Все байки' },
            { id: 'AVAILABLE', label: 'Свободные' },
            { id: 'RENTED', label: 'В аренде' },
            { id: 'IN_MAINTENANCE', label: 'На ремонте' },
            { id: 'FOR_SALE', label: 'На продаже' },
            { id: 'DECOMMISSIONED', label: 'Списанные' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720] border border-transparent dark:border-emerald-500/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="relative w-full sm:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Инвентарный №, рама, мотор..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </form>
      </div>

      {/* Grid of Bikes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bikes.map((bike) => (
          <div
            key={bike.id}
            className="p-5 contour-card flex flex-col justify-between"
          >
            <div>
              {/* Card top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                    <BikeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {bike.inventoryNumber}
                    </span>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {bike.model?.name}
                    </p>
                  </div>
                </div>
                <StatusBadge type="bike" status={bike.status} />
              </div>

              {/* Specs tags */}
              <div className="flex items-center gap-2 mt-4 text-[11px]">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200/50">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {bike.model?.powerWatts}W
                </span>
                {bike.model?.wheelSizeInch && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    {bike.model?.wheelSizeInch}"
                  </span>
                )}
                {bike.model?.winterVersion && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/50">
                    <Snowflake className="w-3.5 h-3.5 text-blue-500" />
                    Зима
                  </span>
                )}
              </div>

              {/* Battery Unit Block */}
              {bike.battery ? (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{bike.battery.serialNumber}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                          {bike.battery.voltage}V {bike.battery.capacityAh}Ah
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80">
                        SoH: {bike.battery.healthPercent}% • {bike.battery.cycleCount} ц. • {bike.battery.connector}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenSwapModal(bike)}
                      title="Быстрая замена АКБ на заряженный"
                      className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDetachBattery(bike)}
                      title="Снять АКБ на зарядку"
                      className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="font-bold">Без аккумулятора</span>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500/80">Не готов к выдаче</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenAttachModal(bike)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
                  >
                    + Установить
                  </button>
                </div>
              )}

              {/* Serial numbers & location */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>№ рамы:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {bike.frameNumber || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>№ мотор-колеса:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {bike.motorNumber || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Пробег:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {bike.mileageKm} км
                  </span>
                </div>
                <div className="flex items-start gap-1 text-[11px] text-slate-400 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="truncate">{bike.currentLocation}</span>
                </div>
              </div>

              {/* Active rental card if rented */}
              {bike.activeRental && (
                <div className="mt-3 p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-xs">
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase">
                    Текущий арендатор
                  </span>
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    {bike.activeRental.clientName}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Договор {bike.activeRental.rentalNumber} • до{' '}
                    {new Date(bike.activeRental.expiresAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              {bike.note ? (
                <p className="text-[11px] text-slate-400 italic truncate max-w-[200px]" title={bike.note}>
                  {bike.note}
                </p>
              ) : (
                <span className="text-[10px] text-slate-400">ID: {bike.id}</span>
              )}

              <button
                onClick={() => handleDeleteBike(bike)}
                title={bike.status === 'RENTED' ? 'Нельзя удалить: байк в аренде' : 'Удалить байк из парка'}
                disabled={bike.status === 'RENTED'}
                className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all ${
                  bike.status === 'RENTED'
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add New Bike */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Добавить электровелосипед в парк"
        subtitle="Регистрация нового транспортного средства"
        maxWidth="md"
      >
        <form onSubmit={handleCreateBike} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">Инвентарный номер *</label>
            <input
              required
              type="text"
              placeholder="EV-016"
              value={newBikeForm.inventoryNumber}
              onChange={(e) => setNewBikeForm({ ...newBikeForm, inventoryNumber: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-500">Модель электровелосипеда *</label>
              <button
                type="button"
                onClick={() => setIsQuickCreateModelOpen(!isQuickCreateModelOpen)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                {isQuickCreateModelOpen ? '✕ Выбрать из существующих' : '+ Создать новый шаблон'}
              </button>
            </div>

            {isQuickCreateModelOpen ? (
              <div className="p-3.5 rounded-xl contour-card mb-3 space-y-2.5 bg-emerald-50/20 dark:bg-emerald-950/20">
                <p className="font-bold text-[11px] text-slate-900 dark:text-emerald-400">
                  Создание нового шаблона модели
                </p>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Марка и название модели *</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Kugoo Kirin V4 Max"
                    value={newModelForm.name}
                    onChange={(e) => setNewModelForm({ ...newModelForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Мощность (W)</label>
                    <input
                      type="number"
                      value={newModelForm.powerWatts}
                      onChange={(e) => setNewModelForm({ ...newModelForm, powerWatts: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">АКБ (Ah)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newModelForm.batteryCapacityAh}
                      onChange={(e) =>
                        setNewModelForm({ ...newModelForm, batteryCapacityAh: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Колеса (")</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newModelForm.wheelSizeInch}
                      onChange={(e) =>
                        setNewModelForm({ ...newModelForm, wheelSizeInch: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={newModelForm.winterVersion}
                      onChange={(e) => setNewModelForm({ ...newModelForm, winterVersion: e.target.checked })}
                      className="rounded text-emerald-500"
                    />
                    <span>Зимняя резина / подготовка</span>
                  </label>
                  <button
                    type="button"
                    onClick={(e) => handleCreateModel(e, true)}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition-all"
                  >
                    Сохранить и выбрать
                  </button>
                </div>
              </div>
            ) : (
              <select
                required
                value={newBikeForm.modelId}
                onChange={(e) => setNewBikeForm({ ...newBikeForm, modelId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-lg font-medium text-slate-900 dark:text-slate-100"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.powerWatts}W, {m.batteryCapacityAh}Ah) {m.winterVersion ? '❄' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-500">Тяговый аккумулятор (АКБ)</label>
              <span className="text-[10px] text-slate-400">
                Свободно на складе: {availableBatteries.length} шт
              </span>
            </div>
            <select
              value={newBikeForm.batteryId}
              onChange={(e) => setNewBikeForm({ ...newBikeForm, batteryId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-lg font-medium text-slate-900 dark:text-slate-100"
            >
              <option value="">-- Без аккумулятора (пустая рама на складе / в резерве) --</option>
              {availableBatteries.map((bat) => (
                <option key={bat.id} value={bat.id}>
                  {bat.serialNumber} [{bat.voltage}V {bat.capacityAh}Ah, SoH: {bat.healthPercent}%, {bat.connector}] — {bat.location}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Серийный № рамы</label>
              <input
                type="text"
                placeholder="FRM-..."
                value={newBikeForm.frameNumber}
                onChange={(e) => setNewBikeForm({ ...newBikeForm, frameNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Серийный № мотора</label>
              <input
                type="text"
                placeholder="MTR-..."
                value={newBikeForm.motorNumber}
                onChange={(e) => setNewBikeForm({ ...newBikeForm, motorNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Начальный пробег (км)</label>
              <input
                type="number"
                min="0"
                value={newBikeForm.mileageKm}
                onChange={(e) => setNewBikeForm({ ...newBikeForm, mileageKm: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Текущая локация</label>
              <input
                type="text"
                value={newBikeForm.currentLocation}
                onChange={(e) => setNewBikeForm({ ...newBikeForm, currentLocation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Примечания / Особенности</label>
            <input
              type="text"
              placeholder="Новая поставка, заменена резина..."
              value={newBikeForm.note}
              onChange={(e) => setNewBikeForm({ ...newBikeForm, note: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-sm"
            >
              Добавить в парк
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manage Bike Model Templates */}
      <Modal
        isOpen={isManageModelsOpen}
        onClose={() => setIsManageModelsOpen(false)}
        title="Шаблоны моделей электровелосипедов"
        subtitle="Управление спецификациями моделей, мощностью и емкостью АКБ"
        maxWidth="2xl"
      >
        <div className="space-y-6 text-xs">
          {/* Create New Model Form */}
          <form
            onSubmit={(e) => handleCreateModel(e, false)}
            className="p-4 contour-card space-y-3 bg-slate-50/50 dark:bg-[#08100c]"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-emerald-500/15 pb-2">
              <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                Новый шаблон модели
              </span>
              <span className="text-[10px] text-slate-400">Шаблон можно повторно использовать для добавления байков</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Марка и название модели *</label>
                <input
                  required
                  type="text"
                  placeholder="Minako Monster 2026 Pro"
                  value={newModelForm.name}
                  onChange={(e) => setNewModelForm({ ...newModelForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Описание / Особенности</label>
                <input
                  type="text"
                  placeholder="Усиленный багажник, гидравлические тормоза"
                  value={newModelForm.description}
                  onChange={(e) => setNewModelForm({ ...newModelForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Мощность мотора (W) *</label>
                <input
                  required
                  type="number"
                  min="240"
                  step="50"
                  value={newModelForm.powerWatts}
                  onChange={(e) => setNewModelForm({ ...newModelForm, powerWatts: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Емкость батареи (Ah) *</label>
                <input
                  required
                  type="number"
                  min="5"
                  step="0.5"
                  value={newModelForm.batteryCapacityAh}
                  onChange={(e) => setNewModelForm({ ...newModelForm, batteryCapacityAh: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Диаметр колес (дюймы)</label>
                <input
                  type="number"
                  min="10"
                  max="29"
                  step="0.5"
                  value={newModelForm.wheelSizeInch}
                  onChange={(e) => setNewModelForm({ ...newModelForm, wheelSizeInch: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={newModelForm.winterVersion}
                  onChange={(e) => setNewModelForm({ ...newModelForm, winterVersion: e.target.checked })}
                  className="rounded text-emerald-500 w-4 h-4"
                />
                <span className="font-medium">Зимняя версия (шипованная резина, термочехол АКБ)</span>
              </label>

              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all self-end sm:self-auto"
              >
                Создать шаблон модели
              </button>
            </div>
          </form>

          {/* List of Models */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-emerald-400/80">
              Действующие шаблоны моделей ({models.length})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
              {models.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 contour-card flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {m.name}
                        </span>
                        {m.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{m.description}</p>
                        )}
                      </div>
                      {m.winterVersion && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                          ❄ Зима
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold">
                        ⚡ {m.powerWatts}W
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                        🔋 {m.batteryCapacityAh}Ah
                      </span>
                      {m.wheelSizeInch && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#162720] text-slate-600 dark:text-slate-300 font-medium">
                          ⚙ {m.wheelSizeInch}"
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-emerald-500/15 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      В парке: <strong className="text-slate-800 dark:text-white">{m.bikesCount ?? 0} шт.</strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteModel(m)}
                      disabled={(m.bikesCount ?? 0) > 0}
                      title={(m.bikesCount ?? 0) > 0 ? 'Нельзя удалить: модель используется в парке' : 'Удалить шаблон модели'}
                      className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all ${
                        (m.bikesCount ?? 0) > 0
                          ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                          : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Установить АКБ на байк */}
      <Modal
        isOpen={isAttachModalOpen}
        onClose={() => {
          setIsAttachModalOpen(false);
          setAttachTargetBike(null);
        }}
        title={`Установка аккумулятора на байк ${attachTargetBike?.inventoryNumber}`}
        subtitle="Привязка тяговой батареи со склада"
        maxWidth="md"
      >
        <form onSubmit={handleAttachSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-400">Выбранный электровелосипед:</span>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <BikeIcon className="w-4 h-4 text-sky-400" />
              {attachTargetBike?.inventoryNumber} — {attachTargetBike?.model?.name}
            </div>
            <p className="text-slate-400 text-[11px]">
              Локация: {attachTargetBike?.currentLocation}
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Выберите заряженный АКБ со склада:
            </label>
            {availableBatteries.length === 0 ? (
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs">
                ⚠️ На складе нет свободных заряженных аккумуляторов. Сначала оприходуйте новый АКБ или снимите батарею с другого байка.
              </div>
            ) : (
              <select
                value={attachSelectedBatteryId}
                onChange={(e) => setAttachSelectedBatteryId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                {availableBatteries.map((bat) => (
                  <option key={bat.id} value={bat.id}>
                    {bat.serialNumber} [{bat.voltage}V {bat.capacityAh}Ah, SoH: {bat.healthPercent}%, {bat.connector}] — {bat.location}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAttachModalOpen(false);
                setAttachTargetBike(null);
              }}
              className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={availableBatteries.length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm"
            >
              Установить АКБ
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Быстрая замена АКБ (Своп) */}
      <Modal
        isOpen={isSwapModalOpen}
        onClose={() => {
          setIsSwapModalOpen(false);
          setSwapTargetBike(null);
        }}
        title={`Быстрая замена аккумулятора на байке ${swapTargetBike?.inventoryNumber}`}
        subtitle="Замена на свежий заряженный аккумулятор в 1 клик"
        maxWidth="md"
      >
        <form onSubmit={handleSwapSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-slate-400">Байк и текущий аккумулятор:</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <BikeIcon className="w-4 h-4 text-sky-400" />
              {swapTargetBike?.inventoryNumber} — {swapTargetBike?.model?.name}
            </div>
            {swapTargetBike?.battery ? (
              <div className="text-amber-400 text-xs mt-1">
                Текущий АКБ: <b>{swapTargetBike.battery.serialNumber}</b> ({swapTargetBike.battery.voltage}V {swapTargetBike.battery.capacityAh}Ah) будет возвращен на зарядный стеллаж базы.
              </div>
            ) : (
              <div className="text-slate-400 text-xs mt-1">Байк в данный момент без батареи.</div>
            )}
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Выберите новый заряженный АКБ со склада:
            </label>
            {availableBatteries.length === 0 ? (
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs">
                ⚠️ Нет свободных заряженных аккумуляторов на складе.
              </div>
            ) : (
              <select
                value={swapNewBatteryId}
                onChange={(e) => setSwapNewBatteryId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                {availableBatteries.map((bat) => (
                  <option key={bat.id} value={bat.id}>
                    {bat.serialNumber} [{bat.voltage}V {bat.capacityAh}Ah, SoH: {bat.healthPercent}%, {bat.connector}] — {bat.location}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsSwapModalOpen(false);
                setSwapTargetBike(null);
              }}
              className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={availableBatteries.length === 0}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm"
            >
              Заменить в 1 клик
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
