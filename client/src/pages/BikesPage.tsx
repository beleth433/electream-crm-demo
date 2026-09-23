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
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { getNextSequentialNumber, getStoredPrefix, setStoredPrefix } from '../utils/numbering';

export const BikesPage: React.FC = () => {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [models, setModels] = useState<BikeModel[]>([]);
  const [availableBatteries, setAvailableBatteries] = useState<Battery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Add Bike Modal & Prefix state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [bikePrefix, setBikePrefix] = useState<string>(() => getStoredPrefix('bike', 'EV-'));
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
    purchasePrice: 0,
    salePrice: 0,
  });

  // Edit Bike Modal state
  const [isEditBikeModalOpen, setIsEditBikeModalOpen] = useState(false);
  const [editingBike, setEditingBike] = useState<Bike | null>(null);
  const [editBikeForm, setEditBikeForm] = useState({
    inventoryNumber: '',
    modelId: '',
    status: 'AVAILABLE' as BikeStatus,
    currentLocation: '',
    mileageKm: 0,
    note: '',
    purchasePrice: 0,
    salePrice: 0,
  });

  const handleOpenEditBikeModal = (bike: Bike) => {
    setEditingBike(bike);
    setEditBikeForm({
      inventoryNumber: bike.inventoryNumber,
      modelId: bike.modelId,
      status: bike.status,
      currentLocation: bike.currentLocation,
      mileageKm: bike.mileageKm,
      note: bike.note || '',
      purchasePrice: bike.purchasePrice ?? bike.model?.purchasePrice ?? 0,
      salePrice: bike.salePrice ?? bike.model?.salePrice ?? 0,
    });
    setIsEditBikeModalOpen(true);
  };

  const handleUpdateBike = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBike) return;
    try {
      await api.updateBike(editingBike.id, {
        ...editBikeForm,
        purchasePrice: Number(editBikeForm.purchasePrice),
        salePrice: Number(editBikeForm.salePrice),
        mileageKm: Number(editBikeForm.mileageKm),
      });
      toast.success(`Данные электровелосипеда ${editBikeForm.inventoryNumber} обновлены`);
      setIsEditBikeModalOpen(false);
      setEditingBike(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления байка');
    }
  };

  const calculateNextBikeNumber = (prefixToUse: string, bikeList: Bike[] = bikes) => {
    const existing = bikeList.map((b) => b.inventoryNumber);
    return getNextSequentialNumber(existing, prefixToUse, 3);
  };

  const handlePrefixChange = (newPrefix: string) => {
    setBikePrefix(newPrefix);
    setStoredPrefix('bike', newPrefix);
    const nextNum = calculateNextBikeNumber(newPrefix);
    setNewBikeForm((prev) => ({ ...prev, inventoryNumber: nextNum }));
  };

  const handleModelSelectChange = (modelId: string) => {
    const selected = models.find((m) => m.id === modelId);
    setNewBikeForm((prev) => ({
      ...prev,
      modelId,
      purchasePrice: selected?.purchasePrice ?? prev.purchasePrice ?? 0,
      salePrice: selected?.salePrice ?? prev.salePrice ?? 0,
    }));
  };

  const handleOpenAddModal = () => {
    const nextNum = calculateNextBikeNumber(bikePrefix);
    const initialModel = models.find((m) => m.id === (newBikeForm.modelId || models[0]?.id));
    setNewBikeForm((prev) => ({
      ...prev,
      inventoryNumber: nextNum,
      modelId: prev.modelId || models[0]?.id || '',
      purchasePrice: initialModel?.purchasePrice ?? 0,
      salePrice: initialModel?.salePrice ?? 0,
    }));
    if (models.length === 0) {
      setIsQuickCreateModelOpen(true);
    }
    setIsAddModalOpen(true);
  };

  // Battery Attach Modal
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachTargetBike, setAttachTargetBike] = useState<Bike | null>(null);
  const [attachSelectedBatteryId, setAttachSelectedBatteryId] = useState<string>('');


  // Model Templates Management Modal
  const [isManageModelsOpen, setIsManageModelsOpen] = useState(false);
  const [newModelForm, setNewModelForm] = useState({
    name: '',
    powerWatts: 800,
    wheelSizeInch: 16.0,
    description: '',
    purchasePrice: 40000,
    salePrice: 65000,
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
          setNewBikeForm((prev) => ({
            ...prev,
            modelId: modelsRes[0].id,
            purchasePrice: modelsRes[0].purchasePrice ?? prev.purchasePrice,
            salePrice: modelsRes[0].salePrice ?? prev.salePrice,
          }));
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
        purchasePrice: Number(newBikeForm.purchasePrice),
        salePrice: Number(newBikeForm.salePrice),
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
        purchasePrice: 0,
        salePrice: 0,
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

  const handleDetachBattery = async (bike: Bike) => {
    if (!confirm(`Снять аккумулятор с байка ${bike.inventoryNumber} на склад?`)) {
      return;
    }
    try {
      await api.detachBattery(bike.id);
      toast.success(`АКБ снят с байка ${bike.inventoryNumber} на склад`);
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
        wheelSizeInch: 16.0,
        description: '',
        purchasePrice: 40000,
        salePrice: 65000,
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
            onClick={handleOpenAddModal}
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
              </div>

              {/* Battery Unit Block */}
              {bike.battery ? (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BatteryCharging className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>{bike.battery.serialNumber}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          {bike.battery.voltage}V {bike.battery.capacityAh}Ah
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1 py-0.2 rounded border ${
                            bike.battery.chemistry === 'LiFePO4'
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {bike.battery.chemistry || 'Li-ion'}
                        </span>
                      </div>
                    </div>
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
                <div className="flex justify-between text-slate-500">
                  <span>Закупка (себестоимость):</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {((bike.purchasePrice !== undefined && bike.purchasePrice > 0)
                      ? bike.purchasePrice
                      : bike.model?.purchasePrice || 0
                    ).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Цена в магазине:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {((bike.salePrice !== undefined && bike.salePrice > 0)
                      ? bike.salePrice
                      : bike.model?.salePrice || 0
                    ).toLocaleString('ru-RU')} ₽
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
                <p className="text-[11px] text-slate-400 italic truncate max-w-[160px]" title={bike.note}>
                  {bike.note}
                </p>
              ) : (
                <span className="text-[10px] text-slate-400">ID: {bike.id}</span>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditBikeModal(bike)}
                  className="p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all"
                  title="Редактировать параметры и цены байка"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Изменить</span>
                </button>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                Инвентарный номер *
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400 text-[10px]">Пресеты:</span>
                {['EV-', 'ВЕЛ-', 'ЭВ-'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePrefixChange(p)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                      bikePrefix === p
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
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
                  value={bikePrefix}
                  onChange={(e) => handlePrefixChange(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold font-mono text-center text-xs focus:border-emerald-500 focus:outline-none"
                  title="Префикс инвентарного номера (например, EV- или русский ВЕЛ-)"
                />
              </div>

              <div className="flex-1 relative">
                <input
                  required
                  type="text"
                  placeholder="EV-016"
                  value={newBikeForm.inventoryNumber}
                  onChange={(e) => setNewBikeForm({ ...newBikeForm, inventoryNumber: e.target.value })}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold font-mono text-sm focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = calculateNextBikeNumber(bikePrefix);
                    setNewBikeForm((prev) => ({ ...prev, inventoryNumber: nextNum }));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-500 transition"
                  title="Подобрать следующий свободный номер для этого префикса"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Префикс подбирает следующий номер (русский или английский). Номер можно свободно править вручную.
            </p>
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Мощность (W)</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="Напр. 1200"
                      value={newModelForm.powerWatts || ''}
                      onChange={(e) =>
                        setNewModelForm({
                          ...newModelForm,
                          powerWatts: e.target.value === '' ? ('' as any) : Number(e.target.value),
                        })
                      }
                      className="w-full px-2 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Колеса (")</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="Напр. 16"
                      value={newModelForm.wheelSizeInch || ''}
                      onChange={(e) =>
                        setNewModelForm({
                          ...newModelForm,
                          wheelSizeInch: e.target.value === '' ? ('' as any) : Number(e.target.value),
                        })
                      }
                      className="w-full px-2 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Себестоимость закупки (₽)</label>
                    <input
                      type="number"
                      min="0"
                      value={newModelForm.purchasePrice}
                      onChange={(e) => setNewModelForm({ ...newModelForm, purchasePrice: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Цена продажи в магазине (₽)</label>
                    <input
                      type="number"
                      min="0"
                      value={newModelForm.salePrice}
                      onChange={(e) => setNewModelForm({ ...newModelForm, salePrice: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={(e) => handleCreateModel(e, true)}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition-all"
                  >
                    Сохранить и выбрать
                  </button>
                </div>
              </div>
            ) : models.length === 0 ? (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
                <span>⚠️ Нет шаблонов моделей байков.</span>
                <button
                  type="button"
                  onClick={() => setIsQuickCreateModelOpen(true)}
                  className="font-bold underline text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
                >
                  + Создать шаблон
                </button>
              </div>
            ) : (
              <select
                required
                value={newBikeForm.modelId}
                onChange={(e) => handleModelSelectChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-lg font-medium text-slate-900 dark:text-slate-100"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.powerWatts}W)
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
                  {bat.serialNumber} ({bat.voltage}V {bat.capacityAh}Ah • {bat.chemistry || 'Li-ion'})
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

          <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Себестоимость закупки (₽)
              </label>
              <input
                type="number"
                min="0"
                value={newBikeForm.purchasePrice}
                onChange={(e) => setNewBikeForm({ ...newBikeForm, purchasePrice: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs font-semibold"
              />
              <span className="text-[10px] text-slate-400">Себестоимость для учета COGS</span>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Цена продажи в магазине (₽)
              </label>
              <input
                type="number"
                min="0"
                value={newBikeForm.salePrice}
                onChange={(e) => setNewBikeForm({ ...newBikeForm, salePrice: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400"
              />
              <span className="text-[10px] text-slate-400">Розничная цена в POS-терминале</span>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Мощность мотора (W) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Любая мощность, напр. 1200"
                  value={newModelForm.powerWatts || ''}
                  onChange={(e) =>
                    setNewModelForm({
                      ...newModelForm,
                      powerWatts: e.target.value === '' ? ('' as any) : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Диаметр колес (дюймы)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Напр. 16"
                  value={newModelForm.wheelSizeInch || ''}
                  onChange={(e) =>
                    setNewModelForm({
                      ...newModelForm,
                      wheelSizeInch: e.target.value === '' ? ('' as any) : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-100/50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Себестоимость закупки (₽)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newModelForm.purchasePrice}
                  onChange={(e) => setNewModelForm({ ...newModelForm, purchasePrice: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs font-semibold"
                />
                <span className="text-[10px] text-slate-400">Базовая закупка для модели</span>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Рекомендуемая цена продажи (₽)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newModelForm.salePrice}
                  onChange={(e) => setNewModelForm({ ...newModelForm, salePrice: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                />
                <span className="text-[10px] text-slate-400">Розничная цена для магазина</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
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
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold">
                        ⚡ {m.powerWatts}W
                      </span>
                      {m.wheelSizeInch && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#162720] text-slate-600 dark:text-slate-300 font-medium">
                          ⚙ {m.wheelSizeInch}"
                        </span>
                      )}
                      {m.purchasePrice !== undefined && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                          Закупка: {m.purchasePrice.toLocaleString('ru-RU')} ₽
                        </span>
                      )}
                      {m.salePrice !== undefined && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                          Продажа: {m.salePrice.toLocaleString('ru-RU')} ₽
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

      {/* Modal: Редактировать электровелосипед */}
      <Modal
        isOpen={isEditBikeModalOpen}
        onClose={() => {
          setIsEditBikeModalOpen(false);
          setEditingBike(null);
        }}
        title={`Редактирование байка ${editingBike?.inventoryNumber}`}
        subtitle="Изменение локации, статуса, себестоимости и цены продажи"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateBike} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Инвентарный номер *
            </label>
            <input
              required
              type="text"
              value={editBikeForm.inventoryNumber}
              onChange={(e) => setEditBikeForm({ ...editBikeForm, inventoryNumber: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Статус байка</label>
              <select
                value={editBikeForm.status}
                onChange={(e) => setEditBikeForm({ ...editBikeForm, status: e.target.value as BikeStatus })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="AVAILABLE">AVAILABLE (Свободен)</option>
                <option value="RENTED" disabled>RENTED (В аренде)</option>
                <option value="IN_MAINTENANCE">IN_MAINTENANCE (На СТО)</option>
                <option value="FOR_SALE">FOR_SALE (На продажу в магазин)</option>
                <option value="DECOMMISSIONED">DECOMMISSIONED (Списан)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Пробег (км)</label>
              <input
                type="number"
                min="0"
                value={editBikeForm.mileageKm}
                onChange={(e) => setEditBikeForm({ ...editBikeForm, mileageKm: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Себестоимость закупки (₽)
              </label>
              <input
                type="number"
                min="0"
                value={editBikeForm.purchasePrice}
                onChange={(e) => setEditBikeForm({ ...editBikeForm, purchasePrice: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs font-semibold"
              />
              <span className="text-[10px] text-slate-400">Себестоимость для учета COGS</span>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Цена продажи в магазине (₽)
              </label>
              <input
                type="number"
                min="0"
                value={editBikeForm.salePrice}
                onChange={(e) => setEditBikeForm({ ...editBikeForm, salePrice: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/25 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400"
              />
              <span className="text-[10px] text-slate-400">Розничная цена в POS-терминале</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Текущая локация</label>
            <input
              type="text"
              value={editBikeForm.currentLocation}
              onChange={(e) => setEditBikeForm({ ...editBikeForm, currentLocation: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Примечание</label>
            <input
              type="text"
              value={editBikeForm.note}
              onChange={(e) => setEditBikeForm({ ...editBikeForm, note: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          {/* Battery assignment / detach */}
          {editingBike?.battery ? (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BatteryCharging className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Установлен АКБ: {editingBike.battery.serialNumber}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({editingBike.battery.voltage}V {editingBike.battery.capacityAh}Ah)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {editingBike.battery.modelName || 'Аккумулятор'} • {editingBike.battery.chemistry || 'Li-ion'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (
                    confirm(
                      `Снять аккумулятор ${editingBike.battery?.serialNumber} с байка ${editingBike.inventoryNumber} на склад?`
                    )
                  ) {
                    try {
                      await api.detachBattery(editingBike.id);
                      toast.success(`АКБ снят с байка ${editingBike.inventoryNumber} на склад`);
                      setIsEditBikeModalOpen(false);
                      setEditingBike(null);
                      loadData();
                    } catch (err: any) {
                      toast.error(err.message || 'Ошибка при снятии АКБ');
                    }
                  }
                }}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Снять АКБ на склад</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between text-slate-500">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>На байке не установлен аккумулятор</span>
              </div>
              {editingBike && (
                <button
                  type="button"
                  onClick={() => {
                    const bikeToAttach = editingBike;
                    setIsEditBikeModalOpen(false);
                    setEditingBike(null);
                    handleOpenAttachModal(bikeToAttach);
                  }}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition"
                >
                  + Установить со склада
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditBikeModalOpen(false);
                setEditingBike(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
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
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Выберите свободный АКБ со склада:
            </label>
            {availableBatteries.length === 0 ? (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs">
                ⚠️ На складе нет свободных аккумуляторов. Сначала оприходуйте новый АКБ или снимите батарею с другого байка.
              </div>
            ) : (
              <select
                value={attachSelectedBatteryId}
                onChange={(e) => setAttachSelectedBatteryId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              >
                {availableBatteries.map((bat) => (
                  <option key={bat.id} value={bat.id}>
                    {bat.serialNumber} ({bat.voltage}V {bat.capacityAh}Ah • {bat.chemistry || 'Li-ion'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAttachModalOpen(false);
                setAttachTargetBike(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
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
    </div>
  );
};
