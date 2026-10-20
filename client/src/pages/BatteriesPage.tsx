import React, { useState, useEffect } from 'react';
import { Battery, BatteryModel, BatteryStats, BatteryStatus, Bike, BatteryChemistry } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import {
  BatteryCharging,
  Zap,
  Bike as BikeIcon,
  Wrench,
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
  Package,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { getNextSequentialNumber, getStoredPrefix, setStoredPrefix } from '../utils/numbering';
import { QuickSendToRepairModal } from '../components/QuickSendToRepairModal';
import { getBikeStatusLabel } from '../utils/statusLabels';

export const BatteriesPage: React.FC = () => {
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [batteryModels, setBatteryModels] = useState<BatteryModel[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [stats, setStats] = useState<BatteryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters & View
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [voltageFilter, setVoltageFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal: Manage Battery Models (Templates)
  const [isManageModelsOpen, setIsManageModelsOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [newModelForm, setNewModelForm] = useState<{
    name: string;
    voltage: number;
    capacityAh: number;
    chemistry: BatteryChemistry;
    description: string;
    purchasePrice: number;
    salePrice: number;
  }>({
    name: '',
    voltage: 60,
    capacityAh: 21,
    chemistry: 'Li-ion',
    description: '',
    purchasePrice: 15000,
    salePrice: 25000,
  });

  // Modal: Create Battery & Prefix state
  const [sendToRepairBattery, setSendToRepairBattery] = useState<Battery | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [batteryPrefix, setBatteryPrefix] = useState<string>(() => getStoredPrefix('battery', 'BAT-'));
  const [createForm, setCreateForm] = useState({
    modelId: '',
    serialNumber: '',
    purchasePrice: 15000,
    salePrice: 25000,
    notes: '',
  });

  const calculateNextBatteryNumber = (prefixToUse: string, batteryList: Battery[] = batteries) => {
    const existing = batteryList.map((b) => b.serialNumber);
    return getNextSequentialNumber(existing, prefixToUse, 3);
  };

  const handlePrefixChange = (newPrefix: string) => {
    setBatteryPrefix(newPrefix);
    setStoredPrefix('battery', newPrefix);
    const nextNum = calculateNextBatteryNumber(newPrefix);
    setCreateForm((prev) => ({ ...prev, serialNumber: nextNum }));
  };

  const handleModelSelectChange = (modelId: string) => {
    const selected = batteryModels.find((m) => m.id === modelId);
    setCreateForm((prev) => ({
      ...prev,
      modelId,
      purchasePrice: selected?.purchasePrice !== undefined ? selected.purchasePrice : prev.purchasePrice,
      salePrice: selected?.salePrice !== undefined ? selected.salePrice : prev.salePrice,
    }));
  };

  const handleOpenCreateModal = async () => {
    try {
      const latestAll = await api.getBatteries();
      setBatteries(latestAll);
      const nextNum = calculateNextBatteryNumber(batteryPrefix, latestAll);
      const selectedId = createForm.modelId || batteryModels[0]?.id || '';
      const selectedModel = batteryModels.find((m) => m.id === selectedId) || batteryModels[0];
      setCreateForm((prev) => ({
        ...prev,
        modelId: selectedId,
        serialNumber: nextNum,
        purchasePrice: selectedModel?.purchasePrice !== undefined ? selectedModel.purchasePrice : 15000,
        salePrice: selectedModel?.salePrice !== undefined ? selectedModel.salePrice : 25000,
      }));
    } catch {
      const nextNum = calculateNextBatteryNumber(batteryPrefix, batteries);
      const selectedId = createForm.modelId || batteryModels[0]?.id || '';
      const selectedModel = batteryModels.find((m) => m.id === selectedId) || batteryModels[0];
      setCreateForm((prev) => ({
        ...prev,
        modelId: selectedId,
        serialNumber: nextNum,
        purchasePrice: selectedModel?.purchasePrice !== undefined ? selectedModel.purchasePrice : 15000,
        salePrice: selectedModel?.salePrice !== undefined ? selectedModel.salePrice : 25000,
      }));
    }
    setIsCreateModalOpen(true);
  };

  const handleRecalculateBatteryNumber = async () => {
    try {
      const latestAll = await api.getBatteries();
      setBatteries(latestAll);
      const nextNum = calculateNextBatteryNumber(batteryPrefix, latestAll);
      setCreateForm((prev) => ({ ...prev, serialNumber: nextNum }));
      toast.success(`Подобран следующий номер АКБ: ${nextNum}`);
    } catch {
      const nextNum = calculateNextBatteryNumber(batteryPrefix, batteries);
      setCreateForm((prev) => ({ ...prev, serialNumber: nextNum }));
    }
  };

  // Modal: Edit Battery
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBattery, setEditingBattery] = useState<Battery | null>(null);
  const [editForm, setEditForm] = useState({
    modelId: '',
    serialNumber: '',
    voltage: 60,
    capacityAh: 21,
    chemistry: 'Li-ion' as BatteryChemistry,
    status: 'AVAILABLE' as BatteryStatus,
    purchasePrice: 15000,
    salePrice: 25000,
    notes: '',
  });

  // Modal: Attach to Bike
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [targetBattery, setTargetBattery] = useState<Battery | null>(null);
  const [selectedBikeId, setSelectedBikeId] = useState<string>('');

  // Modal: Swap Battery
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTargetBattery, setSwapTargetBattery] = useState<Battery | null>(null);
  const [swapSelectedNewBatteryId, setSwapSelectedNewBatteryId] = useState<string>('');
  const [swapSendOldToCharging, setSwapSendOldToCharging] = useState(false);
  const [swapSearch, setSwapSearch] = useState('');


  const loadData = async () => {
    setIsLoading(true);
    try {
      const [batList, batModels, batStats, bikeList] = await Promise.all([
        api.getBatteries(),
        api.getBatteryModels(),
        api.getBatteryStats(),
        api.getBikes(),
      ]);
      setBatteries(batList);
      setBatteryModels(batModels);
      setStats(batStats);
      setBikes(bikeList);
      if (batModels.length > 0) {
        setCreateForm((prev) => ({ ...prev, modelId: prev.modelId || batModels[0].id }));
      }
    } catch (err: any) {
      toast.error('Ошибка загрузки батарейного парка: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartEditModel = (model: BatteryModel) => {
    setEditingModelId(model.id);
    setNewModelForm({
      name: model.name || '',
      voltage: model.voltage ?? 60,
      capacityAh: model.capacityAh ?? 21,
      chemistry: model.chemistry || 'Li-ion',
      description: model.description || '',
      purchasePrice: model.purchasePrice ?? 15000,
      salePrice: model.salePrice ?? 25000,
    });
  };

  const handleCancelEditModel = () => {
    setEditingModelId(null);
    setNewModelForm({
      name: '',
      voltage: 60,
      capacityAh: 21,
      chemistry: 'Li-ion',
      description: '',
      purchasePrice: 15000,
      salePrice: 25000,
    });
  };

  // Create or Update battery model submit
  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelForm.name.trim()) {
      toast.error('Укажите название модели АКБ');
      return;
    }
    try {
      if (editingModelId) {
        const updated = await api.updateBatteryModel(editingModelId, {
          name: newModelForm.name.trim(),
          voltage: Number(newModelForm.voltage) || 0,
          capacityAh: Number(newModelForm.capacityAh) || 0,
          chemistry: newModelForm.chemistry,
          description: newModelForm.description || '',
          purchasePrice: Number(newModelForm.purchasePrice) || 0,
          salePrice: Number(newModelForm.salePrice) || 0,
        });
        toast.success(`Шаблон модели АКБ "${updated.name}" успешно обновлен!`);
        setEditingModelId(null);
      } else {
        const created = await api.createBatteryModel({
          name: newModelForm.name.trim(),
          voltage: Number(newModelForm.voltage) || 0,
          capacityAh: Number(newModelForm.capacityAh) || 0,
          chemistry: newModelForm.chemistry,
          description: newModelForm.description || '',
          purchasePrice: Number(newModelForm.purchasePrice) || 0,
          salePrice: Number(newModelForm.salePrice) || 0,
        });
        toast.success(`Шаблон модели АКБ "${created.name}" создан!`);
        setCreateForm((prev) => ({ ...prev, modelId: created.id }));
      }
      const updatedModels = await api.getBatteryModels();
      setBatteryModels(updatedModels);
      loadData();
      setNewModelForm({
        name: '',
        voltage: 60,
        capacityAh: 21,
        chemistry: 'Li-ion',
        description: '',
        purchasePrice: 15000,
        salePrice: 25000,
      });
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения шаблона АКБ');
    }
  };

  // Delete battery model
  const handleDeleteModel = async (model: BatteryModel) => {
    if ((model.batteriesCount ?? 0) > 0) {
      toast.error(`Невозможно удалить шаблон "${model.name}": к нему привязано ${model.batteriesCount} АКБ`);
      return;
    }
    if (!confirm(`Вы действительно хотите удалить шаблон модели "${model.name}"?`)) {
      return;
    }
    try {
      await api.deleteBatteryModel(model.id);
      toast.success(`Шаблон "${model.name}" удален`);
      const updated = await api.getBatteryModels();
      setBatteryModels(updated);
      if (createForm.modelId === model.id && updated.length > 0) {
        setCreateForm((prev) => ({ ...prev, modelId: updated[0].id }));
      }
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления шаблона АКБ');
    }
  };

  // Create battery submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedModel = batteryModels.find((m) => m.id === createForm.modelId);
      await api.createBattery({
        modelId: createForm.modelId,
        serialNumber: createForm.serialNumber,
        voltage: selectedModel?.voltage || 60,
        capacityAh: selectedModel?.capacityAh || 21,
        purchasePrice: Number(createForm.purchasePrice) || 0,
        salePrice: Number(createForm.salePrice) || 0,
        notes: createForm.notes,
      });
      toast.success(`АКБ ${createForm.serialNumber} успешно оприходован`);
      const nextNum = calculateNextBatteryNumber(
        batteryPrefix,
        batteries.concat([{ serialNumber: createForm.serialNumber } as Battery])
      );
      setIsCreateModalOpen(false);
      setCreateForm((prev) => ({
        ...prev,
        serialNumber: nextNum,
        notes: '',
      }));
      loadData();
    } catch (err: any) {
      toast.error('Ошибка создания АКБ: ' + err.message);
    }
  };

  // Open edit modal
  const handleOpenEdit = (bat: Battery) => {
    const batModel = batteryModels.find((m) => m.id === bat.modelId);
    setEditingBattery(bat);
    setEditForm({
      modelId: bat.modelId || '',
      serialNumber: bat.serialNumber,
      voltage: bat.voltage,
      capacityAh: bat.capacityAh,
      chemistry: bat.chemistry || 'Li-ion',
      status: bat.status,
      purchasePrice: bat.purchasePrice !== undefined ? bat.purchasePrice : (batModel?.purchasePrice ?? 15000),
      salePrice: bat.salePrice !== undefined ? bat.salePrice : (batModel?.salePrice ?? 25000),
      notes: bat.notes || '',
    });
    setIsEditModalOpen(true);
  };

  // Update battery submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBattery) return;

    try {
      await api.updateBattery(editingBattery.id, {
        ...editForm,
        purchasePrice: Number(editForm.purchasePrice) || 0,
        salePrice: Number(editForm.salePrice) || 0,
      });
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
    if (!confirm(`Снять АКБ ${serialNumber} с электровелосипеда на склад?`)) {
      return;
    }

    try {
      await api.detachBattery(bikeId);
      toast.success(`АКБ ${serialNumber} снят на склад`);
      loadData();
    } catch (err: any) {
      toast.error('Ошибка снятия АКБ: ' + err.message);
    }
  };

  // Return spare battery from rental to warehouse
  const handleReturnSpare = async (bat: Battery) => {
    if (!confirm(`Вернуть дополнительный АКБ ${bat.serialNumber} на склад и отвязать от курьера?`)) {
      return;
    }
    try {
      await api.detachBattery({ batteryId: bat.id });
      toast.success(`АКБ ${bat.serialNumber} успешно возвращен на склад`);
      loadData();
    } catch (err: any) {
      toast.error('Ошибка возврата АКБ: ' + err.message);
    }
  };

  // Open Swap Modal
  const handleOpenSwap = (bat: Battery) => {
    setSwapTargetBattery(bat);
    setSwapSendOldToCharging(true);
    setSwapSearch('');
    const candidates = batteries.filter(
      (b) => b.status === 'AVAILABLE' && b.id !== bat.id && b.voltage === bat.voltage
    );
    setSwapSelectedNewBatteryId(candidates[0]?.id || '');
    setIsSwapModalOpen(true);
  };

  // Submit Battery Swap
  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapTargetBattery || !swapSelectedNewBatteryId) {
      toast.error('Выберите новый аккумулятор со склада');
      return;
    }
    try {
      await api.swapBattery({
        oldBatteryId: swapTargetBattery.id,
        newBatteryId: swapSelectedNewBatteryId,
        sendOldToCharging: swapSendOldToCharging,
      });
      const newBat = batteries.find((b) => b.id === swapSelectedNewBatteryId);
      toast.success(
        `Замена АКБ выполнена: ${swapTargetBattery.serialNumber} ➔ ${newBat?.serialNumber || ''}`
      );
      setIsSwapModalOpen(false);
      setSwapTargetBattery(null);
      loadData();
    } catch (err: any) {
      toast.error('Ошибка замены АКБ: ' + err.message);
    }
  };

  // Send to maintenance or show info
  const handleToggleMaintenance = (bat: Battery) => {
    if (bat.status === 'IN_MAINTENANCE') {
      toast.info(
        `АКБ ${bat.serialNumber} находится в мастерской СТО. Завершение обслуживания производится в разделе «Мастерская СТО».`
      );
      return;
    }
    if (bat.installedBikeId) {
      toast.error('Сначала снимите аккумулятор с байка!');
      return;
    }
    setSendToRepairBattery(bat);
  };

  // Available unique voltages
  const availableVoltages = Array.from(new Set(batteries.map((b) => b.voltage.toString()))).sort(
    (a, b) => Number(a) - Number(b)
  );

  // Filtering
  const filteredBatteries = batteries.filter((bat) => {
    if (statusFilter !== 'ALL' && bat.status !== statusFilter) return false;
    if (voltageFilter !== 'ALL' && bat.voltage.toString() !== voltageFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchSerial = bat.serialNumber.toLowerCase().includes(q);
      const matchModel = bat.modelName ? bat.modelName.toLowerCase().includes(q) : false;
      const matchChem = (bat.chemistry || 'li-ion').toLowerCase().includes(q);
      const matchNotes = bat.notes ? bat.notes.toLowerCase().includes(q) : false;
      const matchBike = bat.installedBike
        ? bat.installedBike.inventoryNumber.toLowerCase().includes(q) ||
          (bat.installedBike.modelName && bat.installedBike.modelName.toLowerCase().includes(q))
        : false;
      const matchIssuedBike = bat.issuedBike
        ? bat.issuedBike.inventoryNumber.toLowerCase().includes(q) ||
          (bat.issuedBike.modelName && bat.issuedBike.modelName.toLowerCase().includes(q))
        : false;
      const matchRental = bat.currentRental
        ? bat.currentRental.clientName.toLowerCase().includes(q) ||
          bat.currentRental.rentalNumber.toLowerCase().includes(q)
        : false;
      if (!matchSerial && !matchModel && !matchChem && !matchNotes && !matchBike && !matchIssuedBike && !matchRental) return false;
    }
    return true;
  });

  const getStatusBadge = (status: BatteryStatus, bike?: any, bat?: Battery) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Свободен на складе
          </span>
        );
      case 'INSTALLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20">
            <Zap className="w-3 h-3 text-sky-500" />
            На байке {bike ? bike.inventoryNumber : ''}
            {bat?.currentRental && ' (в аренде)'}
          </span>
        );
      case 'ISSUED_SPARE': {
        const bikeNum = bat?.issuedBike?.inventoryNumber || bat?.currentRental?.bikeInventoryNumber;
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20">
            Доп. АКБ у курьера{bikeNum ? ` (к ${bikeNum})` : ''}
          </span>
        );
      }
      case 'IN_MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <Wrench className="w-3 h-3 text-amber-500" />
            На ТО / Ремонте
          </span>
        );
      case 'DECOMMISSIONED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
            <ShieldAlert className="w-3 h-3 text-rose-500" />
            Списан
          </span>
        );
      case 'SOLD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Продан
          </span>
        );
      default:
        return null;
    }
  };

  const getVoltageBadgeColor = (voltage: number) => {
    if (voltage >= 72) {
      return 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
    if (voltage >= 60) {
      return 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
    }
    return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-sm">
              <BatteryCharging className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Парк аккумуляторов (АКБ)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {batteries.length} шт
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Учет тяговых батарей, шаблоны моделей, быстрая замена и привязка к электровелосипедам
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Сетка карточек"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Таблица"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsManageModelsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg text-sm transition"
          >
            <Layers className="w-4 h-4 text-emerald-500" />
            Шаблоны АКБ ({batteryModels.length})
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Оприходовать АКБ
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="contour-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Всего в парке</span>
              <Layers className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</span>
              <span className="text-xs text-slate-500">АКБ</span>
            </div>
          </div>

          <div className="contour-card p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-medium">Свободно (база)</span>
              <Zap className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.available}
              </span>
              <span className="text-xs text-emerald-600/80 dark:text-emerald-500/80">на складе</span>
            </div>
          </div>

          <div className="contour-card p-4 bg-sky-50/40 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
              <span className="text-xs font-medium">На байках</span>
              <BikeIcon className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.installed}</span>
              <span className="text-xs text-sky-600/80 dark:text-sky-500/80">в работе</span>
            </div>
          </div>

          <div className="contour-card p-4 bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
              <span className="text-xs font-medium">Доп. у курьеров</span>
              <BatteryCharging className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.issuedSpare}
              </span>
              <span className="text-xs text-purple-600/80 dark:text-purple-400/80">в сумках</span>
            </div>
          </div>

          <div className="contour-card p-4 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-medium">СТО / Ремонт</span>
              <Wrench className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.inMaintenance}
              </span>
              <span className="text-xs text-amber-600/80 dark:text-amber-500/80">на ТО</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filters & Search Bar */}
      <div className="contour-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по номеру BAT-..., модели или байку..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Voltage Filter Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-slate-500 mr-1 hidden sm:inline">Вольтаж:</span>
            {['ALL', ...availableVoltages].map((v) => (
              <button
                key={v}
                onClick={() => setVoltageFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  voltageFilter === v
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {v === 'ALL' ? 'Все' : `${v}V`}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          {[
            { id: 'ALL', label: 'Все АКБ', count: batteries.length },
            { id: 'AVAILABLE', label: 'Свободны на складе', count: stats?.available },
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
                  ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.id
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
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
        <div className="contour-card p-12 text-center">
          <BatteryCharging className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Аккумуляторы не найдены</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            По заданным фильтрам нет подходящих АКБ. Попробуйте сбросить фильтры или добавьте новую батарею.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setVoltageFilter('ALL');
            }}
            className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatteries.map((bat) => {
            return (
              <div
                key={bat.id}
                className="contour-card p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Voltage badge, Chemistry, Model name & Status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${getVoltageBadgeColor(
                          bat.voltage
                        )}`}
                      >
                        {bat.voltage}V {bat.capacityAh}Ah
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold border ${
                          bat.chemistry === 'LiFePO4'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {bat.chemistry || 'Li-ion'}
                      </span>
                      {bat.modelName && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {bat.modelName}
                        </span>
                      )}
                    </div>
                    {getStatusBadge(bat.status, bat.installedBike, bat)}
                  </div>

                  {/* Serial Number */}
                  <div className="mt-4">
                    <h3 className="text-xl font-black font-mono tracking-wide text-slate-900 dark:text-white">
                      {bat.serialNumber}
                    </h3>
                  </div>

                  {/* Placement Details */}
                  <div className="mt-3 text-xs space-y-1.5">
                    {bat.status === 'ISSUED_SPARE' ? (
                      <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <BikeIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                              У курьера:{' '}
                              <span className="font-bold text-purple-700 dark:text-purple-300">
                                {bat.currentRental?.clientName || 'Курьер'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Доп. АКБ к байку{' '}
                              <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                                {bat.issuedBike?.inventoryNumber || bat.currentRental?.bikeInventoryNumber || '—'}
                              </span>
                              {bat.currentRental?.rentalNumber && (
                                <span className="ml-1 text-[10px] text-slate-400">
                                  ({bat.currentRental.rentalNumber})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : bat.installedBike ? (
                      <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                            <BikeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-slate-800 dark:text-slate-200">
                              Установлен на:{' '}
                              <span className="font-extrabold text-sky-700 dark:text-sky-300 font-mono text-sm">
                                {bat.installedBike.inventoryNumber}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {bat.currentRental ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  В аренде у {bat.currentRental.clientName}
                                </span>
                              ) : (
                                bat.installedBike.modelName || 'Электровелосипед'
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Package className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="truncate font-medium">На складе (свободен)</span>
                      </div>
                    )}

                    {bat.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic px-1 line-clamp-2">
                        "{bat.notes}"
                      </p>
                    )}

                    {/* Prices */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Себестоимость:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                          {bat.purchasePrice ? `${bat.purchasePrice.toLocaleString()} ₽` : '—'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Химия ячеек:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                          {bat.chemistry || 'Li-ion'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {bat.status === 'AVAILABLE' && (
                      <button
                        onClick={() => handleOpenAttach(bat)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Установить на байк
                      </button>
                    )}

                    {/* Quick Swap for installed or spare battery in rental */}
                    {(bat.status === 'INSTALLED' || bat.status === 'ISSUED_SPARE') && (
                      <button
                        onClick={() => handleOpenSwap(bat)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold transition shadow-sm"
                        title="Быстрая замена АКБ у курьера"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-purple-500" />
                        Заменить АКБ
                      </button>
                    )}

                    {/* Spare battery return to warehouse */}
                    {bat.status === 'ISSUED_SPARE' && (
                      <button
                        onClick={() => handleReturnSpare(bat)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
                        title="Сдать доп. АКБ на склад"
                      >
                        <LogOut className="w-3.5 h-3.5 text-slate-500" />
                        Сдать на склад
                      </button>
                    )}

                    {/* Installed battery detach to warehouse */}
                    {bat.status === 'INSTALLED' && bat.installedBikeId && (
                      <button
                        onClick={() => handleDetach(bat.installedBikeId!, bat.serialNumber)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
                        title="Снять АКБ на склад"
                      >
                        <LogOut className="w-3.5 h-3.5 text-slate-500" />
                        Снять на склад
                      </button>
                    )}

                    {bat.status === 'IN_MAINTENANCE' && (
                      <button
                        onClick={() => handleToggleMaintenance(bat)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                        Вернуть с ТО
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(bat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Редактировать параметры"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!bat.installedBikeId && bat.status !== 'DECOMMISSIONED' && (
                      <button
                        onClick={() => handleToggleMaintenance(bat)}
                        className={`p-1.5 px-2 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
                          bat.status === 'IN_MAINTENANCE'
                            ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25'
                            : 'text-amber-600 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-500/20 shadow-sm'
                        }`}
                        title={bat.status === 'IN_MAINTENANCE' ? 'В мастерской СТО' : 'Отправить на ТО в мастерскую СТО'}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>{bat.status === 'IN_MAINTENANCE' ? 'В СТО' : 'На ТО'}</span>
                      </button>
                    )}
                    {!bat.installedBikeId && (
                      <button
                        onClick={() => handleDeleteBattery(bat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
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
        <div className="contour-card overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Серийный номер</th>
                <th className="px-4 py-3">Модель</th>
                <th className="px-4 py-3">Характеристики</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Себестоимость</th>
                <th className="px-4 py-3">Текущее размещение</th>
                <th className="px-4 py-3">Заметки</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBatteries.map((bat) => {
                return (
                  <tr key={bat.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {bat.serialNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {bat.modelName || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border ${getVoltageBadgeColor(
                            bat.voltage
                          )}`}
                        >
                          {bat.voltage}V {bat.capacityAh}Ah
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                            bat.chemistry === 'LiFePO4'
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {bat.chemistry || 'Li-ion'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(bat.status, bat.installedBike, bat)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {bat.purchasePrice ? `${bat.purchasePrice.toLocaleString()} ₽` : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {bat.status === 'ISSUED_SPARE' ? (
                        <div>
                          <div className="text-purple-700 dark:text-purple-300 font-bold">
                            У курьера: {bat.currentRental?.clientName || 'Курьер'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            к байку{' '}
                            <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                              {bat.issuedBike?.inventoryNumber || bat.currentRental?.bikeInventoryNumber || '—'}
                            </span>
                            {bat.currentRental?.rentalNumber && (
                              <span className="ml-1 text-[10px]">({bat.currentRental.rentalNumber})</span>
                            )}
                          </div>
                        </div>
                      ) : bat.installedBike ? (
                        <div>
                          <span className="text-sky-700 dark:text-sky-300 font-bold font-mono">
                            Байк {bat.installedBike.inventoryNumber}
                          </span>
                          {bat.currentRental && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                              у {bat.currentRental.clientName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">На складе</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 italic max-w-xs truncate">
                      {bat.notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {bat.status === 'AVAILABLE' && (
                          <>
                            <button
                              onClick={() => handleOpenAttach(bat)}
                              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded text-xs transition font-semibold"
                            >
                              Установить
                            </button>
                            <button
                              onClick={() => setSendToRepairBattery(bat)}
                              className="px-2 py-1 bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded text-xs transition font-semibold flex items-center gap-1"
                              title="Отправить на ТО в мастерскую СТО"
                            >
                              <Wrench className="w-3 h-3" />
                              На ТО
                            </button>
                          </>
                        )}
                        {/* Quick Swap for installed or spare battery in rental */}
                        {(bat.status === 'INSTALLED' || bat.status === 'ISSUED_SPARE') && (
                          <button
                            onClick={() => handleOpenSwap(bat)}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded text-xs transition font-semibold flex items-center gap-1"
                            title="Быстрая замена АКБ"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-purple-500" />
                            Замена
                          </button>
                        )}
                        {/* Spare battery return to warehouse */}
                        {bat.status === 'ISSUED_SPARE' && (
                          <button
                            onClick={() => handleReturnSpare(bat)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs transition font-semibold"
                            title="Сдать доп. АКБ на склад"
                          >
                            Сдать на склад
                          </button>
                        )}
                        {bat.status === 'INSTALLED' && bat.installedBikeId && (
                          <button
                            onClick={() => handleDetach(bat.installedBikeId!, bat.serialNumber)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs transition font-semibold"
                            title="Снять на склад"
                          >
                            Снять на склад
                          </button>
                        )}
                        {bat.status === 'IN_MAINTENANCE' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            В СТО
                          </span>
                        )}
                        <button
                          onClick={() => handleOpenEdit(bat)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                          title="Редактировать"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!bat.installedBikeId && (
                          <button
                            onClick={() => handleDeleteBattery(bat)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
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
        subtitle="Регистрация тяговой батареи в парке"
      >
        {batteryModels.length === 0 ? (
          <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Сначала создайте шаблон модели АКБ
            </div>
            <p>
              В системе пока нет шаблонов моделей батарей. Чтобы добавить аккумулятор в парк, сначала создайте хотя бы один шаблон модели (название, вольтаж, емкость).
            </p>
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsManageModelsOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition shadow-sm"
            >
              <Layers className="w-4 h-4" />
              Перейти к созданию шаблонов АКБ
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Шаблон модели аккумулятора *
              </label>
              <select
                required
                value={createForm.modelId}
                onChange={(e) => handleModelSelectChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none font-medium"
              >
                {batteryModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.voltage}V {m.capacityAh}Ah • {m.chemistry || 'Li-ion'})
                  </option>
                ))}
              </select>
            </div>

            {/* Model Preview Card */}
            {(() => {
              const selectedModel = batteryModels.find((m) => m.id === createForm.modelId) || batteryModels[0];
              if (!selectedModel) return null;
              return (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-slate-500 font-medium">Характеристики из выбранного шаблона:</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getVoltageBadgeColor(
                        selectedModel.voltage
                      )}`}
                    >
                      {selectedModel.voltage}V
                    </span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {selectedModel.capacityAh} Ah
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold border ${
                        selectedModel.chemistry === 'LiFePO4'
                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {selectedModel.chemistry || 'Li-ion'}
                    </span>
                    {selectedModel.description && (
                      <span className="text-slate-500 text-[11px] truncate">
                        • {selectedModel.description}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                  Серийный номер / Код *
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-400 text-[10px]">Пресеты:</span>
                  {['BAT-', 'АКБ-', 'БАТ-'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePrefixChange(p)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                        batteryPrefix === p
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
                    value={batteryPrefix}
                    onChange={(e) => handlePrefixChange(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold font-mono text-center text-xs focus:border-emerald-500 focus:outline-none"
                    title="Префикс серийного номера (например, BAT- или АКБ-)"
                  />
                </div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    required
                    placeholder="Например: BAT-001 или заводской SN"
                    value={createForm.serialNumber}
                    onChange={(e) => setCreateForm({ ...createForm, serialNumber: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleRecalculateBatteryNumber}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-500 transition"
                    title="Подобрать следующий свободный номер для этого префикса во всем парке АКБ"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Префикс подбирает следующий номер (русский или английский). Также можно стереть и вставить заводской номер с корпуса.
              </p>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col justify-between">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                    Себестоимость закупки (₽)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={createForm.purchasePrice}
                    onChange={(e) => setCreateForm({ ...createForm, purchasePrice: Number(e.target.value) })}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                    placeholder="15000"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1">Себестоимость для финучета и магазина</span>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                    Цена продажи в магазине (₽)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={createForm.salePrice}
                    onChange={(e) => setCreateForm({ ...createForm, salePrice: Number(e.target.value) })}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                    placeholder="25000"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1">Розничная цена при продаже в Магазине</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Заметки / Особенности (необязательно)
              </label>
              <textarea
                rows={2}
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                placeholder="Партия поставки, особенности сборки..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm"
              >
                Оприходовать в парк
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 2: Установить АКБ на байк */}
      <Modal
        isOpen={isAttachModalOpen}
        onClose={() => {
          setIsAttachModalOpen(false);
          setTargetBattery(null);
        }}
        title={`Установка АКБ ${targetBattery?.serialNumber} на байк`}
        subtitle="Привязка батареи к выбранному электровелосипеду"
      >
        <form onSubmit={handleAttachSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
            <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Параметры устанавливаемой батареи:
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-mono">
              {targetBattery?.serialNumber} ({targetBattery?.voltage}V {targetBattery?.capacityAh}Ah{targetBattery?.modelName ? ` • ${targetBattery.modelName}` : ''})
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Выберите электровелосипед из парка:
            </label>
            <select
              value={selectedBikeId}
              onChange={(e) => setSelectedBikeId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
            >
              {bikes
                .filter((b) => b.status !== 'DECOMMISSIONED' && b.status !== 'SOLD')
                .map((b) => {
                  const currentBat = batteries.find((bat) => bat.id === b.batteryId);
                  return (
                    <option key={b.id} value={b.id}>
                      {b.inventoryNumber} — {b.model?.name || 'Байк'} [{getBikeStatusLabel(b.status)}]{' '}
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
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Внимание: </span>
                    На байке <b>{chosenBike?.inventoryNumber}</b> уже установлен аккумулятор{' '}
                    <b>{currentBat.serialNumber}</b>. При подтверждении старый аккумулятор будет автоматически снят
                    и переведен на склад со статусом «Свободен».
                  </div>
                </div>
              );
            }
            return (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Байк свободен для установки аккумулятора.</span>
              </div>
            );
          })()}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAttachModalOpen(false);
                setTargetBattery(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm"
            >
              Установить АКБ
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Быстрая замена АКБ (Swap) */}
      <Modal
        isOpen={isSwapModalOpen}
        onClose={() => {
          setIsSwapModalOpen(false);
          setSwapTargetBattery(null);
        }}
        title={`Замена аккумулятора: ${swapTargetBattery?.serialNumber}`}
        subtitle="Быстрая выдача заряженной батареи со склада взамен текущей"
        maxWidth="2xl"
      >
        <form onSubmit={handleSwapSubmit} className="space-y-4 text-xs">
          {/* Current Battery Context Banner */}
          <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-900 dark:text-purple-200">
                Текущий заменяемый аккумулятор:
              </span>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                {swapTargetBattery?.voltage}V {swapTargetBattery?.capacityAh}Ah • {swapTargetBattery?.chemistry || 'Li-ion'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <div className="font-mono font-extrabold text-slate-900 dark:text-white text-base">
                {swapTargetBattery?.serialNumber}
              </div>
              <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                {swapTargetBattery?.status === 'ISSUED_SPARE' ? (
                  <span>
                    Выдан как доп. АКБ курьеру{' '}
                    <strong>{swapTargetBattery.currentRental?.clientName || 'Курьер'}</strong>
                  </span>
                ) : swapTargetBattery?.installedBike ? (
                  <span>
                    Установлен на байк{' '}
                    <strong className="font-mono">{swapTargetBattery.installedBike.inventoryNumber}</strong>
                    {swapTargetBattery.currentRental?.clientName && (
                      <> (курьер <strong>{swapTargetBattery.currentRental.clientName}</strong>)</>
                    )}
                  </span>
                ) : (
                  'Находится в парке'
                )}
              </div>
            </div>
          </div>

          {/* Destination for old battery */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1611] border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Куда перевести снятый аккумулятор ({swapTargetBattery?.serialNumber})?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                onClick={() => setSwapSendOldToCharging(true)}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                  swapSendOldToCharging
                    ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold ring-1 ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="oldBatDest"
                  checked={swapSendOldToCharging}
                  onChange={() => setSwapSendOldToCharging(true)}
                  className="accent-amber-500"
                />
                <div>
                  <div>⚡ На зарядку / в СТО</div>
                  <div className="text-[10px] text-slate-500 font-normal">Статус «В обслуживании»</div>
                </div>
              </div>

              <div
                onClick={() => setSwapSendOldToCharging(false)}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                  !swapSendOldToCharging
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="oldBatDest"
                  checked={!swapSendOldToCharging}
                  onChange={() => setSwapSendOldToCharging(false)}
                  className="accent-emerald-500"
                />
                <div>
                  <div>📦 На склад как свободный</div>
                  <div className="text-[10px] text-slate-500 font-normal">Статус «Свободен»</div>
                </div>
              </div>
            </div>
          </div>

          {/* New Battery Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200">
                Выберите новый заряженный АКБ со склада:
              </label>
              <span className="text-[11px] text-slate-400">
                Рекомендуется вольтаж: <strong>{swapTargetBattery?.voltage}V</strong>
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск нового АКБ по номеру, модели..."
                value={swapSearch}
                onChange={(e) => setSwapSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            {(() => {
              const available = batteries.filter((b) => b.status === 'AVAILABLE' && b.id !== swapTargetBattery?.id);
              const q = swapSearch.toLowerCase().trim();
              const filtered = available.filter(
                (b) =>
                  !q ||
                  b.serialNumber.toLowerCase().includes(q) ||
                  (b.modelName && b.modelName.toLowerCase().includes(q))
              );

              if (available.length === 0) {
                return (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-center">
                    ⚠️ На складе нет свободных аккумуляторов для замены.
                  </div>
                );
              }

              if (filtered.length === 0) {
                return (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-center">
                    АКБ по запросу не найдены.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {filtered.map((bat) => {
                    const isSelected = swapSelectedNewBatteryId === bat.id;
                    const isVoltMatch = swapTargetBattery && bat.voltage === swapTargetBattery.voltage;
                    return (
                      <div
                        key={bat.id}
                        onClick={() => setSwapSelectedNewBatteryId(bat.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/10 dark:bg-purple-950/30 ring-2 ring-purple-500/30 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101d17] hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getVoltageBadgeColor(
                                bat.voltage
                              )}`}
                            >
                              {bat.voltage}V {bat.capacityAh}Ah
                            </span>
                            {isVoltMatch ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Вольтаж совпадает
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                ⚠️ {bat.voltage}V ≠ {swapTargetBattery?.voltage}V
                              </span>
                            )}
                          </div>
                          <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-1.5">
                            {bat.serialNumber}
                          </div>
                          {bat.modelName && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {bat.modelName}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>{bat.chemistry || 'Li-ion'}</span>
                          <span className="text-emerald-600 font-medium">Свободен на складе</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500">
              {swapSelectedNewBatteryId ? (
                <span>
                  Выбран новый АКБ:{' '}
                  <strong className="font-mono text-purple-600 dark:text-purple-400">
                    {batteries.find((b) => b.id === swapSelectedNewBatteryId)?.serialNumber}
                  </strong>
                </span>
              ) : (
                'Выберите новый АКБ со склада'
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSwapModalOpen(false);
                  setSwapTargetBattery(null);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!swapSelectedNewBatteryId}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition shadow-sm"
              >
                Выполнить замену АКБ
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Редактирование АКБ */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBattery(null);
        }}
        title={`Редактирование АКБ ${editingBattery?.serialNumber}`}
        subtitle="Изменение параметров и статуса батареи"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col justify-between">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                Серийный номер *
              </label>
              <input
                type="text"
                required
                value={editForm.serialNumber}
                onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none font-bold"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                Статус
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as BatteryStatus })}
                className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="AVAILABLE">Свободен на складе</option>
                <option value="INSTALLED">Установлен на байк</option>
                <option value="ISSUED_SPARE">Доп. АКБ у курьера</option>
                <option value="IN_MAINTENANCE">На ТО / Ремонте СТО</option>
                <option value="DECOMMISSIONED">Списан</option>
                <option value="SOLD">Продан</option>
              </select>
            </div>

            <div className="flex flex-col justify-between">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                Тип химии (АКБ)
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg h-10 items-center">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, chemistry: 'Li-ion' })}
                  className={`h-full text-xs font-bold rounded-md transition ${
                    editForm.chemistry === 'Li-ion'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Li-ion
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, chemistry: 'LiFePO4' })}
                  className={`h-full text-xs font-bold rounded-md transition ${
                    editForm.chemistry === 'LiFePO4'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  LiFePO4
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                Вольтаж (V)
              </label>
              <input
                type="number"
                step="any"
                value={editForm.voltage}
                onChange={(e) => setEditForm({ ...editForm, voltage: Number(e.target.value) })}
                className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                Емкость (Ah)
              </label>
              <input
                type="number"
                step="any"
                value={editForm.capacityAh}
                onChange={(e) => setEditForm({ ...editForm, capacityAh: Number(e.target.value) })}
                className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                Себестоимость закупки (₽)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={editForm.purchasePrice}
                onChange={(e) => setEditForm({ ...editForm, purchasePrice: Number(e.target.value) })}
                className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-between sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                Цена продажи в магазине (₽)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={editForm.salePrice}
                onChange={(e) => setEditForm({ ...editForm, salePrice: Number(e.target.value) })}
                className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Заметки / особенности
            </label>
            <textarea
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingBattery(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: Управление шаблонами моделей АКБ */}
      <Modal
        isOpen={isManageModelsOpen}
        onClose={() => {
          setIsManageModelsOpen(false);
          handleCancelEditModel();
        }}
        title="Шаблоны моделей аккумуляторов (АКБ)"
        subtitle="Создание и настройка справочника моделей батарей парка"
      >
        <div className="space-y-6 text-xs">
          {/* Create or Edit Model Form */}
          <form
            onSubmit={handleCreateModel}
            className={`p-4 rounded-xl border space-y-3 transition-all ${
              editingModelId
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/40 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="font-semibold flex items-center justify-between text-sm">
              <span className={`flex items-center gap-1.5 ${
                editingModelId ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-800 dark:text-slate-200'
              }`}>
                {editingModelId ? (
                  <>
                    <Edit2 className="w-4 h-4 text-amber-500" />
                    Редактирование шаблона модели АКБ
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-emerald-500" />
                    Добавить новый шаблон модели АКБ
                  </>
                )}
              </span>
              {editingModelId && (
                <button
                  type="button"
                  onClick={handleCancelEditModel}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors"
                >
                  ✕ Отмена (создать новый)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col justify-between">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                  Название модели *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Monster 60V 21Ah"
                  value={newModelForm.name}
                  onChange={(e) => setNewModelForm({ ...newModelForm, name: e.target.value })}
                  className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-between">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                  Тип химии (АКБ) *
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg h-10 items-center">
                  <button
                    type="button"
                    onClick={() => setNewModelForm({ ...newModelForm, chemistry: 'Li-ion' })}
                    className={`h-full text-xs font-bold rounded-md transition ${
                      newModelForm.chemistry === 'Li-ion'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Li-ion
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewModelForm({ ...newModelForm, chemistry: 'LiFePO4' })}
                    className={`h-full text-xs font-bold rounded-md transition ${
                      newModelForm.chemistry === 'LiFePO4'
                        ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    LiFePO4
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                  Вольтаж (V) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="60"
                  value={newModelForm.voltage || ''}
                  onChange={(e) =>
                    setNewModelForm({
                      ...newModelForm,
                      voltage: e.target.value === '' ? ('' as any) : Number(e.target.value),
                    })
                  }
                  className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-between">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                  Емкость (Ah) *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  placeholder="21"
                  value={newModelForm.capacityAh || ''}
                  onChange={(e) =>
                    setNewModelForm({
                      ...newModelForm,
                      capacityAh: e.target.value === '' ? ('' as any) : Number(e.target.value),
                    })
                  }
                  className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-between">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                  Себестоимость закупки (₽)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="15000"
                  value={newModelForm.purchasePrice || ''}
                  onChange={(e) =>
                    setNewModelForm({
                      ...newModelForm,
                      purchasePrice: e.target.value === '' ? ('' as any) : Number(e.target.value),
                    })
                  }
                  className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-between">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                  Цена продажи в магазине (₽)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="25000"
                  value={newModelForm.salePrice || ''}
                  onChange={(e) =>
                    setNewModelForm({
                      ...newModelForm,
                      salePrice: e.target.value === '' ? ('' as any) : Number(e.target.value),
                    })
                  }
                  className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs min-h-[1.25rem]">
                Описание / особенности (необязательно)
              </label>
              <input
                type="text"
                placeholder="Тяговый Li-ion, для курьерских байков"
                value={newModelForm.description}
                onChange={(e) => setNewModelForm({ ...newModelForm, description: e.target.value })}
                className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              {editingModelId ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEditModel}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold transition shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Сохранить изменения
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition shadow-sm"
                >
                  Создать шаблон
                </button>
              )}
            </div>
          </form>

          {/* List of Models */}
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
              <span>Список созданных шаблонов ({batteryModels.length})</span>
            </div>

            {batteryModels.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Шаблонов моделей пока нет. Добавьте первый шаблон выше!
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {batteryModels.map((model) => {
                  const isCurrent = editingModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      className={`p-3 flex items-center justify-between gap-3 transition ${
                        isCurrent
                          ? 'bg-amber-50/40 dark:bg-amber-950/30 border-l-4 border-l-amber-500'
                          : 'bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">{model.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500 text-slate-950 uppercase">
                              Редактируется
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getVoltageBadgeColor(
                              model.voltage
                            )}`}
                          >
                            {model.voltage}V
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {model.capacityAh} Ah
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                              model.chemistry === 'LiFePO4'
                                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {model.chemistry || 'Li-ion'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            Себест: {model.purchasePrice?.toLocaleString() || '—'} ₽ • Продажа: {model.salePrice?.toLocaleString() || '—'} ₽
                          </span>
                        </div>
                        {model.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{model.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-500 mr-1">
                          {model.batteriesCount ?? 0} АКБ в парке
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEditModel(model)}
                          className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          }`}
                          title="Редактировать параметры шаблона АКБ"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Изменить</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteModel(model)}
                          disabled={(model.batteriesCount ?? 0) > 0}
                          title={(model.batteriesCount ?? 0) > 0 ? 'Нельзя удалить: модель используется АКБ в парке' : 'Удалить шаблон'}
                          className={`p-1.5 rounded-lg transition ${
                            (model.batteriesCount ?? 0) > 0
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Quick Send Battery to Maintenance / СТО */}
      <QuickSendToRepairModal
        isOpen={Boolean(sendToRepairBattery)}
        onClose={() => setSendToRepairBattery(null)}
        onSuccess={loadData}
        target={sendToRepairBattery ? { type: 'BATTERY', item: sendToRepairBattery } : null}
      />
    </div>
  );
};
