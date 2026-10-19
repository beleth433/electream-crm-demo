import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../components/Modal';
import { Client, Bike, Tariff, Rental, Battery, BatteryModel, BikeModel, TariffBuyoutBatteryItem, Outfit } from '../types';
import { api } from '../services/api';
import {
  UserCheck,
  Bike as BikeIcon,
  CreditCard,
  Search,
  Plus,
  Shield,
  BatteryCharging,
  Zap,
  Check,
  AlertCircle,
  AlertTriangle,
  Snowflake,
  UploadCloud,
  Sparkles,
  Trash2,
  Calendar,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { getNextSequentialNumber, getStoredPrefix, setStoredPrefix } from '../utils/numbering';
import { COURIER_SERVICES } from '../constants/courierServices';

interface RentalWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRental: Rental) => void;
  initialClient?: { name: string; phone: string; company: string } | null;
  initialRentalType?: 'STANDARD' | 'RENT_TO_OWN';
}

export const RentalWizardModal: React.FC<RentalWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialClient,
  initialRentalType,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useMemo(() => {
    try {
      const saved = localStorage.getItem('crm_auth_user') || localStorage.getItem('crm_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  // Data lists
  const [clients, setClients] = useState<Client[]>([]);
  const [availableBikes, setAvailableBikes] = useState<Bike[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [allBatteries, setAllBatteries] = useState<Battery[]>([]);
  const [batteryModels, setBatteryModels] = useState<BatteryModel[]>([]);
  const [bikeModels, setBikeModels] = useState<BikeModel[]>([]);
  const [availableOutfits, setAvailableOutfits] = useState<Outfit[]>([]);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<string[]>([]);

  // Wizard state
  // Step 1: Client selection or creation
  const [phoneQuery, setPhoneQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    fullName: '',
    phone: '',
    telegram: '',
    passportSerial: '',
    passportNumber: '',
    citizenship: 'РФ',
    migrationCard: '',
    patentNumber: '',
    courierService: 'Яндекс Еда',
  });

  const [clientExtraDetails, setClientExtraDetails] = useState({
    courierService: 'Яндекс Еда',
    passportSerial: '',
    passportNumber: '',
    citizenship: 'РФ',
    patentNumber: '',
    telegram: '',
  });

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientExtraDetails({
      courierService: client.courierService || 'Яндекс Еда',
      passportSerial: client.passportSerial || '',
      passportNumber: client.passportNumber || '',
      citizenship: client.citizenship || 'РФ',
      patentNumber: client.patentNumber || '',
      telegram: client.telegram || '',
    });
  };

  // Step 2: Bike and Batteries selection
  const [selectedBikeId, setSelectedBikeId] = useState<string>('');
  const [selectedBatteryIds, setSelectedBatteryIds] = useState<string[]>([]);

  // Step 3: Tariff, deposit, payment method, contract prefix
  const [allRentals, setAllRentals] = useState<Rental[]>([]);
  const [rentalPrefix, setRentalPrefix] = useState<string>(() => getStoredPrefix('rental', 'ДОГ-'));
  const [rentalNumber, setRentalNumber] = useState<string>('');
  const [selectedTariffId, setSelectedTariffId] = useState<string>('');
  const [customDeposit, setCustomDeposit] = useState<number>(3000);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SBP' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');

  // Inline Tariff Creation state
  const [isCreatingTariff, setIsCreatingTariff] = useState(false);
  const [newTariffForm, setNewTariffForm] = useState({
    name: '',
    type: 'STANDARD' as 'STANDARD' | 'RENT_TO_OWN',
    bikeModelId: '',
    durationDays: 7,
    price: 6000,
    depositRequired: 5000,
    totalBuyoutPrice: 60000,
    paymentIntervalDays: 7,
    installmentPayment: 6000,
    includedBatteries: [] as TariffBuyoutBatteryItem[],
  });

  // Rent-to-own customization fields for this specific contract
  const [buyoutTotalPrice, setBuyoutTotalPrice] = useState<number>(60000);
  const [buyoutDurationDays, setBuyoutDurationDays] = useState<number>(180);
  const [buyoutPaymentIntervalDays, setBuyoutPaymentIntervalDays] = useState<number>(7);
  const [buyoutInstallmentPayment, setBuyoutInstallmentPayment] = useState<number>(6000);
  const [buyoutFirstPayment, setBuyoutFirstPayment] = useState<number>(6000);

  const calculateNextRentalNumber = (prefixToUse: string, rentalList: Rental[] = allRentals) => {
    const existing = rentalList.map((r) => r.rentalNumber);
    return getNextSequentialNumber(existing, prefixToUse, 3);
  };

  const handleRentalPrefixChange = (newPrefix: string) => {
    setRentalPrefix(newPrefix);
    setStoredPrefix('rental', newPrefix);
    const nextNum = calculateNextRentalNumber(newPrefix);
    setRentalNumber(nextNum);
  };

  // Load initial options when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedClient(null);
      setSelectedBikeId('');
      setSelectedBatteryIds([]);
      if (initialClient) {
        setIsCreatingClient(true);
        setNewClientForm({
          fullName: initialClient.name,
          phone: initialClient.phone,
          telegram: '',
          passportSerial: '',
          passportNumber: '',
          citizenship: 'РФ',
          migrationCard: '',
          patentNumber: '',
          courierService: initialClient.company || 'Яндекс Еда',
        });
      } else {
        setIsCreatingClient(false);
      }
      setIsCreatingTariff(false);
      setSelectedTariffId('');

      Promise.all([
        api.getClients(),
        api.getBikes({ status: 'AVAILABLE' }),
        api.getRentalTariffs(),
        api.getBatteries(),
        api.getRentals(),
        api.getBatteryModels(),
        api.getBikeModels(),
        api.getAvailableOutfits().catch(() => []),
      ])
        .then(([clientsRes, bikesRes, tariffsRes, batteriesRes, rentalsRes, batteryModelsRes, bikeModelsRes, outfitsRes]) => {
          setClients(clientsRes);
          setAvailableBikes(bikesRes);
          setTariffs(tariffsRes);
          setAllBatteries(batteriesRes);
          setAllRentals(rentalsRes);
          setBatteryModels(batteryModelsRes);
          setBikeModels(bikeModelsRes);
          setAvailableOutfits(outfitsRes || []);

          let activePrefix = rentalPrefix;
          if (initialRentalType === 'RENT_TO_OWN' && (rentalPrefix === 'ДОГ-' || !rentalPrefix)) {
            activePrefix = 'ВЫК-';
            setRentalPrefix('ВЫК-');
          } else if (initialRentalType === 'STANDARD' && rentalPrefix === 'ВЫК-') {
            activePrefix = 'ДОГ-';
            setRentalPrefix('ДОГ-');
          }

          const nextNum = getNextSequentialNumber(
            rentalsRes.map((r) => r.rentalNumber),
            activePrefix,
            3
          );
          setRentalNumber(nextNum);

          let matchingTariff = tariffsRes[0];
          if (initialRentalType) {
            const found = tariffsRes.find((t) => t.type === initialRentalType);
            if (found) matchingTariff = found;
          }

          if (matchingTariff) {
            setSelectedTariffId(matchingTariff.id);
            setCustomDeposit(matchingTariff.depositRequired);
            if (matchingTariff.type === 'RENT_TO_OWN') {
              const total = matchingTariff.totalBuyoutPrice || matchingTariff.price || 60000;
              const interval = matchingTariff.paymentIntervalDays || 7;
              const dur = matchingTariff.durationDays || 180;
              const periods = Math.max(1, Math.round(dur / interval));
              const inst = matchingTariff.installmentPayment || Math.ceil((total / periods) / 10) * 10 || matchingTariff.price || 6000;
              setBuyoutTotalPrice(total);
              setBuyoutPaymentIntervalDays(interval);
              setBuyoutDurationDays(dur);
              setBuyoutInstallmentPayment(inst);
              setBuyoutFirstPayment(inst);
            }
          }
        })
        .catch((err) => toast.error('Ошибка загрузки данных: ' + err.message));
    }
  }, [isOpen, initialRentalType]);

  // Handle client phone search
  const filteredClients = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(phoneQuery.toLowerCase()) ||
      c.phone.includes(phoneQuery) ||
      (c.telegram && c.telegram.toLowerCase().includes(phoneQuery.toLowerCase()))
  );

  const handleCreateNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const created = await api.createClient(newClientForm as any);
      toast.success(`Курьер ${created.fullName} успешно зарегистрирован!`);
      setSelectedClient(created);
      setIsCreatingClient(false);
      // refresh client list
      const refreshed = await api.getClients();
      setClients(refreshed);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка регистрации курьера');
    } finally {
      setIsLoading(false);
    }
  };

  const syncBuyoutWithBikeAndBatteries = (
    bike?: Bike,
    batteryIdsToUse?: string[],
    tariffToUse?: Tariff
  ) => {
    const curTariff = tariffToUse || tariffs.find((t) => t.id === selectedTariffId);
    if (curTariff?.type !== 'RENT_TO_OWN') return;

    const curBike = bike || availableBikes.find((b) => b.id === selectedBikeId);
    const bikePrice = curBike?.model?.baseBuyoutPrice || curBike?.model?.salePrice || curBike?.salePrice || 0;
    const targetBatteryIds = batteryIdsToUse || selectedBatteryIds;
    const bats = allBatteries.filter((b) => targetBatteryIds.includes(b.id));
    const batsTotal = bats.reduce((sum, b) => sum + (b.salePrice || 25000), 0);
    const calculatedTotal = bikePrice + batsTotal;

    const total = curTariff.totalBuyoutPrice ? curTariff.totalBuyoutPrice : (calculatedTotal > 0 ? calculatedTotal : 60000);
    const dur = curTariff.durationDays || buyoutDurationDays || 90;
    const interval = curTariff.paymentIntervalDays || buyoutPaymentIntervalDays || 7;
    const periods = Math.max(1, Math.round(dur / interval));
    const inst = curTariff.installmentPayment || Math.ceil((total / periods) / 10) * 10;
    setBuyoutTotalPrice(total);
    setBuyoutDurationDays(dur);
    setBuyoutPaymentIntervalDays(interval);
    setBuyoutInstallmentPayment(inst);
    setBuyoutFirstPayment(inst);
  };

  const handleTariffChange = (tariffId: string, currentBike?: Bike, batteryIdsToUse?: string[]) => {
    setSelectedTariffId(tariffId);
    const trf = tariffs.find((t) => t.id === tariffId);
    const activeBike = currentBike || availableBikes.find((b) => b.id === selectedBikeId);
    const activeBatteryIds = batteryIdsToUse || selectedBatteryIds;
    if (trf) {
      setCustomDeposit(trf.depositRequired);
      if (trf.type === 'RENT_TO_OWN') {
        const bikePrice = activeBike?.model?.baseBuyoutPrice || activeBike?.model?.salePrice || activeBike?.salePrice || 0;
        const bats = allBatteries.filter((b) => activeBatteryIds.includes(b.id));
        const batsTotal = bats.reduce((sum, b) => sum + (b.salePrice || 25000), 0);
        const calculatedTotal = bikePrice + batsTotal;

        const total = trf.totalBuyoutPrice ? trf.totalBuyoutPrice : (calculatedTotal > 0 ? calculatedTotal : (trf.price || 60000));
        const interval = trf.paymentIntervalDays || 7;
        const dur = trf.durationDays || 90;
        const periods = Math.max(1, Math.round(dur / interval));
        const inst = trf.installmentPayment || Math.ceil((total / periods) / 10) * 10 || trf.price || 6000;
        setBuyoutTotalPrice(total);
        setBuyoutPaymentIntervalDays(interval);
        setBuyoutDurationDays(dur);
        setBuyoutInstallmentPayment(inst);
        setBuyoutFirstPayment(inst);
      }
    }
  };

  const handleCalculateContractInstallment = () => {
    const dur = buyoutDurationDays || selectedTariff?.durationDays || 90;
    const interval = buyoutPaymentIntervalDays || 7;
    const periods = Math.max(1, Math.round(dur / interval));
    const inst = Math.ceil((buyoutTotalPrice / periods) / 10) * 10;
    setBuyoutInstallmentPayment(inst);
    setBuyoutFirstPayment(inst);
    toast.success(`Рассчитано: ${periods} платежей по ${inst.toLocaleString('ru-RU')} ₽`);
  };

  const recalculateBuyoutFromItemsInline = (
    bikeModelId: string,
    batteries: TariffBuyoutBatteryItem[],
    overrides?: { durationDays?: number; paymentIntervalDays?: number; type?: 'STANDARD' | 'RENT_TO_OWN' }
  ) => {
    const selectedModel = bikeModels.find((m) => m.id === bikeModelId) || selectedBike?.model;
    const bikePrice = selectedModel ? (selectedModel.baseBuyoutPrice || selectedModel.salePrice || 60000) : 0;
    const batteriesTotal = (batteries || []).reduce(
      (sum, b) => sum + (Number(b.quantity) || 0) * (Number(b.price) || 0),
      0
    );
    const total = bikePrice + batteriesTotal;
    const dur = overrides?.durationDays ?? newTariffForm.durationDays ?? 90;
    const interval = overrides?.paymentIntervalDays ?? newTariffForm.paymentIntervalDays ?? 7;
    const periods = Math.max(1, Math.round(dur / interval));
    const inst = Math.ceil((total / periods) / 10) * 10;

    setNewTariffForm((prev) => ({
      ...prev,
      type: overrides?.type ?? prev.type,
      bikeModelId,
      includedBatteries: batteries,
      durationDays: dur,
      paymentIntervalDays: interval,
      totalBuyoutPrice: total > 0 ? total : (prev.totalBuyoutPrice || 60000),
      installmentPayment: total > 0 ? inst : (prev.installmentPayment || 6000),
      price: total > 0 ? inst : (prev.price || 6000),
    }));
  };

  const handleAddBuyoutBatteryInline = () => {
    const firstModel = batteryModels[0];
    const newBat: TariffBuyoutBatteryItem = {
      batteryModelId: firstModel ? firstModel.id : '',
      quantity: 1,
      price: firstModel ? (firstModel.salePrice || 25000) : 25000,
    };
    const updated = [...(newTariffForm.includedBatteries || []), newBat];
    recalculateBuyoutFromItemsInline(newTariffForm.bikeModelId, updated);
  };

  const handleUpdateBuyoutBatteryInline = (
    index: number,
    updates: Partial<TariffBuyoutBatteryItem>
  ) => {
    const list = [...(newTariffForm.includedBatteries || [])];
    const cur = list[index];
    if (!cur) return;
    const updatedItem = { ...cur, ...updates };
    if (updates.batteryModelId && updates.batteryModelId !== cur.batteryModelId) {
      const found = batteryModels.find((m) => m.id === updates.batteryModelId);
      if (found) {
        updatedItem.price = found.salePrice || 25000;
      }
    }
    list[index] = updatedItem;
    recalculateBuyoutFromItemsInline(newTariffForm.bikeModelId, list);
  };

  const handleRemoveBuyoutBatteryInline = (index: number) => {
    const updated = (newTariffForm.includedBatteries || []).filter((_, idx) => idx !== index);
    recalculateBuyoutFromItemsInline(newTariffForm.bikeModelId, updated);
  };

  const handleCalculateTariffInstallment = () => {
    const total = Number(newTariffForm.totalBuyoutPrice) || 0;
    const dur = Number(newTariffForm.durationDays) || 90;
    const interval = Number(newTariffForm.paymentIntervalDays) || 7;
    const periods = Math.max(1, Math.round(dur / interval));
    const inst = Math.ceil((total / periods) / 10) * 10;
    setNewTariffForm((prev) => ({
      ...prev,
      installmentPayment: inst,
      price: inst,
    }));
    toast.success(`Рассчитано: ${periods} платежей по ${inst.toLocaleString('ru-RU')} ₽`);
  };

  const handleAutoPopulateBuyoutFromSelection = () => {
    const batCounts: Record<string, number> = {};
    selectedBatteries.forEach((b) => {
      const mId = b.modelId || '';
      batCounts[mId] = (batCounts[mId] || 0) + 1;
    });

    const items: TariffBuyoutBatteryItem[] = Object.entries(batCounts).map(([mId, qty]) => {
      const bm = batteryModels.find((m) => m.id === mId);
      return {
        batteryModelId: mId,
        quantity: qty,
        price: bm?.salePrice || 25000,
      };
    });

    const bModelId = selectedBike?.modelId || newTariffForm.bikeModelId;
    recalculateBuyoutFromItemsInline(bModelId, items, { type: 'RENT_TO_OWN' });
    toast.success('Параметры выкупа заполнены из выбранного байка и аккумуляторов');
  };

  const handleOpenCreateTariffInline = () => {
    setIsCreatingTariff(true);
    const bikeModel = selectedBike?.model;
    const bModelId = selectedBike?.modelId || '';

    const batCounts: Record<string, number> = {};
    selectedBatteries.forEach((b) => {
      const mId = b.modelId || '';
      batCounts[mId] = (batCounts[mId] || 0) + 1;
    });
    const items: TariffBuyoutBatteryItem[] = Object.entries(batCounts).map(([mId, qty]) => {
      const bm = batteryModels.find((m) => m.id === mId);
      return {
        batteryModelId: mId,
        quantity: qty,
        price: bm?.salePrice || 25000,
      };
    });

    const bikePrice = bikeModel ? (bikeModel.baseBuyoutPrice || bikeModel.salePrice || 60000) : 60000;
    const batsTotal = items.reduce((sum, it) => sum + it.quantity * it.price, 0);
    const total = bikePrice + batsTotal;
    const dur = 90;
    const interval = 7;
    const periods = Math.max(1, Math.round(dur / interval));
    const inst = Math.ceil((total / periods) / 10) * 10;

    setNewTariffForm({
      name: bikeModel?.name ? `${bikeModel.name} Выкуп ${dur}д` : '',
      type: 'RENT_TO_OWN',
      bikeModelId: bModelId,
      durationDays: dur,
      price: inst,
      depositRequired: 0,
      totalBuyoutPrice: total,
      paymentIntervalDays: interval,
      installmentPayment: inst,
      includedBatteries: items,
    });
  };

  const handleCreateTariffInline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const payload = {
        ...newTariffForm,
        bikeModelId: newTariffForm.bikeModelId ? newTariffForm.bikeModelId : (selectedBike?.modelId || null),
        includedBatteries: newTariffForm.type === 'RENT_TO_OWN' ? newTariffForm.includedBatteries : [],
      };
      const created = await api.createRentalTariff(payload);
      setTariffs((prev) => [...prev, created]);
      setSelectedTariffId(created.id);
      setCustomDeposit(created.depositRequired);
      if (created.type === 'RENT_TO_OWN') {
        const total = created.totalBuyoutPrice || created.price || 60000;
        const interval = created.paymentIntervalDays || 7;
        const dur = created.durationDays || 90;
        const periods = Math.max(1, Math.round(dur / interval));
        const inst = created.installmentPayment || Math.ceil((total / periods) / 10) * 10 || created.price || 6000;
        setBuyoutTotalPrice(total);
        setBuyoutPaymentIntervalDays(interval);
        setBuyoutDurationDays(dur);
        setBuyoutInstallmentPayment(inst);
        setBuyoutFirstPayment(inst);
      }
      setIsCreatingTariff(false);
      setNewTariffForm({
        name: '',
        type: 'STANDARD',
        bikeModelId: '',
        durationDays: 7,
        price: 6000,
        depositRequired: 0,
        totalBuyoutPrice: 60000,
        paymentIntervalDays: 7,
        installmentPayment: 6000,
        includedBatteries: [],
      });
      toast.success(`Шаблон тарифа "${created.name}" создан и выбран!`);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания шаблона');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBike = (bike: Bike) => {
    setSelectedBikeId(bike.id);
    const newBatteryIds = bike.batteryId ? [bike.batteryId] : [];
    setSelectedBatteryIds(newBatteryIds);

    // Auto-select or suggest matching tariff for this bike's model
    const modelTariff = tariffs.find((t) => t.isActive && t.bikeModelId === bike.modelId);
    if (modelTariff) {
      handleTariffChange(modelTariff.id, bike, newBatteryIds);
      toast.info(`Выбран тариф "${modelTariff.name}" для модели ${bike.model?.name || ''}`);
    } else {
      syncBuyoutWithBikeAndBatteries(bike, newBatteryIds);
    }
  };

  const toggleBatterySelection = (batteryId: string) => {
    setSelectedBatteryIds((prev) => {
      const next = prev.includes(batteryId) ? prev.filter((id) => id !== batteryId) : [...prev, batteryId];
      syncBuyoutWithBikeAndBatteries(undefined, next);
      return next;
    });
  };

  const toggleOutfit = (outfitId: string) => {
    setSelectedOutfitIds((prev) =>
      prev.includes(outfitId) ? prev.filter((id) => id !== outfitId) : [...prev, outfitId]
    );
  };

  const selectedBike = availableBikes.find((b) => b.id === selectedBikeId);
  const relevantBatteries = allBatteries.filter(
    (b) =>
      b.status === 'AVAILABLE' ||
      (selectedBike && (b.installedBikeId === selectedBike.id || b.id === selectedBike.batteryId))
  );
  const selectedBatteries = allBatteries.filter((b) => selectedBatteryIds.includes(b.id));

  const bikeBuyoutPrice = selectedBike?.model?.baseBuyoutPrice || selectedBike?.model?.salePrice || selectedBike?.salePrice || 0;
  const batteriesBuyoutPrice = selectedBatteries.reduce((sum, b) => sum + (b.salePrice || 25000), 0);
  const packageBuyoutPrice = bikeBuyoutPrice + batteriesBuyoutPrice;

  const selectedTariff = tariffs.find((t) => t.id === selectedTariffId);
  const isRentToOwn = selectedTariff?.type === 'RENT_TO_OWN';
  const baseTariffPrice = isRentToOwn ? buyoutFirstPayment : (selectedTariff?.price || 0);
  const loyaltyTier = selectedClient?.loyaltyTier;
  const rentalDiscountPercent = loyaltyTier?.discountRentalPercent || 0;
  const rentalDiscountAmount = Math.round(baseTariffPrice * (rentalDiscountPercent / 100));
  const discountedTariffPrice = Math.max(0, baseTariffPrice - rentalDiscountAmount);
  const totalDue = discountedTariffPrice + Number(customDeposit || 0);

  const getDaysAgoDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const formatDisplayDate = (dInput: string | Date) => {
    const d = typeof dInput === 'string' ? new Date(dInput) : dInput;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const parsedStartDate = new Date(`${startDate}T12:00:00`);
  const effectiveDurationDays = isRentToOwn ? Number(buyoutDurationDays || 30) : Number(selectedTariff?.durationDays || 7);
  const paymentInterval = isRentToOwn ? Number(buyoutPaymentIntervalDays || 7) : effectiveDurationDays;

  const calculatedExpiresAt = new Date(parsedStartDate.getTime() + effectiveDurationDays * 86400000);
  const calculatedNextPaymentDue = new Date(parsedStartDate.getTime() + paymentInterval * 86400000);

  const todayRef = new Date();
  todayRef.setHours(12, 0, 0, 0);
  const daysAgoDiff = Math.max(0, Math.round((todayRef.getTime() - parsedStartDate.getTime()) / 86400000));
  const calculatedNextDueIsPast = calculatedNextPaymentDue.getTime() < todayRef.getTime();

  const handleSubmitCheckout = async () => {
    if (!selectedClient) {
      toast.error('Пожалуйста, выберите курьера');
      setStep(1);
      return;
    }
    if (!selectedBikeId) {
      toast.error('Пожалуйста, выберите электровелосипед');
      setStep(2);
      return;
    }
    if (!selectedTariffId) {
      toast.error('Пожалуйста, выберите тариф');
      setStep(3);
      return;
    }

    try {
      setIsLoading(true);
      const newRental = await api.createRental({
        clientId: selectedClient.id,
        bikeId: selectedBikeId,
        tariffId: selectedTariffId,
        managerId: currentUser?.id,
        outfitIds: selectedOutfitIds,
        batteryIds: selectedBatteryIds,
        paymentMethod,
        rentalNumber: rentalNumber.trim() ? rentalNumber.trim() : undefined,
        customDeposit: Number(customDeposit),
        startDate: startDate ? new Date(`${startDate}T12:00:00`).toISOString() : undefined,
        durationDays: isRentToOwn ? Number(buyoutDurationDays) : undefined,
        totalBuyoutPrice: isRentToOwn ? Number(buyoutTotalPrice) : undefined,
        paymentIntervalDays: isRentToOwn ? Number(buyoutPaymentIntervalDays) : undefined,
        installmentPayment: isRentToOwn ? Number(buyoutInstallmentPayment) : undefined,
        firstPaymentAmount: isRentToOwn ? Number(discountedTariffPrice) : undefined,
        notes,
        courierService: clientExtraDetails.courierService || selectedClient.courierService || undefined,
        passportSerial: clientExtraDetails.passportSerial || selectedClient.passportSerial || undefined,
        passportNumber: clientExtraDetails.passportNumber || selectedClient.passportNumber || undefined,
        citizenship: clientExtraDetails.citizenship || selectedClient.citizenship || undefined,
        patentNumber: clientExtraDetails.patentNumber || selectedClient.patentNumber || undefined,
        telegram: clientExtraDetails.telegram || selectedClient.telegram || undefined,
      });

      toast.success(`Договор аренды ${newRental.rentalNumber} успешно оформлен!`);
      onSuccess(newRental);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка оформления аренды');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Оформление аренды электровелосипеда"
      subtitle="Пошаговый мастер выдачи техники и экипировки"
      maxWidth="4xl"
    >
      {/* Visual Stepper */}
      <div className="flex items-center justify-between mb-6 px-4">
        {[
          { num: 1, label: 'Выбор курьера', icon: UserCheck },
          { num: 2, label: 'Техника и экипировка', icon: BikeIcon },
          { num: 3, label: 'Тариф и расчет', icon: CreditCard },
        ].map((s, idx) => {
          const Icon = s.icon;
          const isCompleted = step > s.num;
          const isCurrent = step === s.num;

          return (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-sky-600 text-white ring-4 ring-sky-100 dark:ring-sky-950'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isCurrent
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div
                  className={`grow h-0.5 mx-3 ${
                    step > idx + 1
                      ? 'bg-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* STEP 1: Courier Selection */}
      {step === 1 && (
        <div className="space-y-4">
          {!isCreatingClient ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="relative grow">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Быстрый поиск курьера по имени, телефону или Telegram..."
                    value={phoneQuery}
                    onChange={(e) => setPhoneQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Новый курьер
                </button>
              </div>

              {/* Courier Selection List */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredClients.map((client) => {
                  const isSelected = selectedClient?.id === client.id;
                  const isBlacklisted = client.status === 'BLACKLIST';
                  const isProblem = client.status === 'PROBLEM';

                  return (
                    <div
                      key={client.id}
                      onClick={() => {
                        if (isBlacklisted) {
                          toast.error(`ВНИМАНИЕ! Курьер в черном списке: ${client.blackListReason}`);
                          return;
                        }
                        handleSelectClient(client);
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-400/20'
                          : isBlacklisted
                          ? 'border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 opacity-70 cursor-not-allowed'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {client.fullName}
                          </span>
                          {isBlacklisted && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold">
                              BLACKLIST
                            </span>
                          )}
                          {isProblem && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold">
                              ПРОБЛЕМНЫЙ
                            </span>
                          )}
                          {client.status === 'VIP' && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-bold">
                              VIP
                            </span>
                          )}
                          {client.loyaltyTier && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 text-[9px] font-extrabold uppercase">
                              {client.loyaltyTier.name} {client.loyaltyTier.discountRentalPercent > 0 && `(-${client.loyaltyTier.discountRentalPercent}%)`}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {client.phone} {client.telegram ? `• ${client.telegram}` : ''} •{' '}
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {client.courierService || (client.clientType === 'RETAIL' ? 'Розничный клиент' : 'Служба не указана')}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Гражданство: {client.citizenship} | Паспорт: {client.passportSerial || ''} {client.passportNumber || ''}
                          {client.patentNumber ? ` | Патент: ${client.patentNumber}` : ''}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-sky-600 bg-sky-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedClient && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-800 dark:text-emerald-200 font-semibold">
                          Выбран клиент: {selectedClient.fullName}
                        </span>
                        {selectedClient.loyaltyTier && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            {selectedClient.loyaltyTier.name} (-{rentalDiscountPercent}%)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {selectedClient.phone} ({clientExtraDetails.courierService || selectedClient.courierService || 'Клиент базы'})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!clientExtraDetails.passportNumber && !selectedClient.passportNumber) {
                          toast.error('Пожалуйста, укажите номер паспорта для оформления договора');
                          return;
                        }
                        setStep(2);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Далее: Техника →
                    </button>
                  </div>

                  {(!selectedClient.passportNumber || !selectedClient.courierService) && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Дополните данные для договора аренды (клиент будет сохранен как курьер):</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Служба доставки *</label>
                          <select
                            value={clientExtraDetails.courierService}
                            onChange={(e) => setClientExtraDetails({ ...clientExtraDetails, courierService: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          >
                            {COURIER_SERVICES.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Серия паспорта</label>
                          <input
                            type="text"
                            value={clientExtraDetails.passportSerial}
                            onChange={(e) => setClientExtraDetails({ ...clientExtraDetails, passportSerial: e.target.value })}
                            placeholder="4510"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Номер паспорта *</label>
                          <input
                            type="text"
                            value={clientExtraDetails.passportNumber}
                            onChange={(e) => setClientExtraDetails({ ...clientExtraDetails, passportNumber: e.target.value })}
                            placeholder="123456"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Гражданство</label>
                          <input
                            type="text"
                            value={clientExtraDetails.citizenship}
                            onChange={(e) => setClientExtraDetails({ ...clientExtraDetails, citizenship: e.target.value })}
                            placeholder="РФ"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* New Courier Inline Form */
            <form onSubmit={handleCreateNewClient} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Регистрация нового курьера (онбординг)
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(false)}
                  className="text-xs text-sky-600 hover:underline"
                >
                  ← Назад к поиску
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="block text-slate-500 mb-1">ФИО полностью *</label>
                  <input
                    required
                    type="text"
                    value={newClientForm.fullName}
                    onChange={(e) => setNewClientForm({ ...newClientForm, fullName: e.target.value })}
                    placeholder="Иванов Иван Иванович"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Телефон *</label>
                  <input
                    required
                    type="text"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Telegram username</label>
                  <input
                    type="text"
                    value={newClientForm.telegram}
                    onChange={(e) => setNewClientForm({ ...newClientForm, telegram: e.target.value })}
                    placeholder="@username"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Гражданство *</label>
                  <select
                    value={newClientForm.citizenship}
                    onChange={(e) => setNewClientForm({ ...newClientForm, citizenship: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="РФ">Российская Федерация (РФ)</option>
                    <option value="Узбекистан">Узбекистан</option>
                    <option value="Кыргызстан">Кыргызстан (ЕАЭС)</option>
                    <option value="Таджикистан">Таджикистан</option>
                    <option value="Беларусь">Беларусь (ЕАЭС)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Служба доставки</label>
                  <select
                    value={newClientForm.courierService}
                    onChange={(e) => setNewClientForm({ ...newClientForm, courierService: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    {COURIER_SERVICES.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Серия паспорта</label>
                  <input
                    type="text"
                    value={newClientForm.passportSerial}
                    onChange={(e) => setNewClientForm({ ...newClientForm, passportSerial: e.target.value })}
                    placeholder="4518 / FA"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Номер паспорта</label>
                  <input
                    type="text"
                    value={newClientForm.passportNumber}
                    onChange={(e) => setNewClientForm({ ...newClientForm, passportNumber: e.target.value })}
                    placeholder="123456"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                {newClientForm.citizenship !== 'РФ' && (
                  <>
                    <div>
                      <label className="block text-amber-600 dark:text-amber-400 font-semibold mb-1">
                        Миграционная карта *
                      </label>
                      <input
                        required
                        type="text"
                        value={newClientForm.migrationCard}
                        onChange={(e) => setNewClientForm({ ...newClientForm, migrationCard: e.target.value })}
                        placeholder="МК 77-00-12345"
                        className="w-full px-3 py-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-amber-600 dark:text-amber-400 font-semibold mb-1">
                        Патент / ЕАЭС *
                      </label>
                      <input
                        required
                        type="text"
                        value={newClientForm.patentNumber}
                        onChange={(e) => setNewClientForm({ ...newClientForm, patentNumber: e.target.value })}
                        placeholder="ПАТ-77-123456"
                        className="w-full px-3 py-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-lg text-xs"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold"
                >
                  {isLoading ? 'Сохранение...' : 'Зарегистрировать курьера'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* STEP 2: Bike and Outfit Selection */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              Выберите электровелосипед (только свободные на складе) *
            </label>
            {availableBikes.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>На складе нет свободных электровелосипедов (все в аренде или на ТО).</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {availableBikes.map((bike) => {
                  const isSelected = selectedBikeId === bike.id;
                  return (
                    <div
                      key={bike.id}
                      onClick={() => handleSelectBike(bike)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-2 ring-sky-400/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-sky-700 dark:text-sky-400">
                          {bike.inventoryNumber}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {bike.model?.name}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-0.5">
                          <Zap className="w-3 h-3 text-amber-500" />
                          {bike.model?.powerWatts}W
                        </span>
                        <span>Пробег: {bike.mileageKm} км</span>
                      </div>
                      {bike.battery ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium mt-1">
                          <BatteryCharging className="w-3.5 h-3.5 shrink-0" />
                          <span>АКБ: {bike.battery.serialNumber} ({bike.battery.voltage}V {bike.battery.capacityAh}Ah)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>⚠️ Без АКБ (рама пустая)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Battery selection row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-emerald-500" />
                <span>Выдаваемые аккумуляторы (АКБ):</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedBatteries.length > 0
                  ? `Выбрано: ${selectedBatteries.length} шт.`
                  : 'АКБ не выбран'}
              </span>
            </div>

            {!selectedBikeId ? (
              <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center">
                Сначала выберите электровелосипед выше
              </div>
            ) : relevantBatteries.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>На складе нет свободных аккумуляторов и на выбранном байке не установлен АКБ.</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedBike?.battery
                    ? 'Аккумулятор с велосипеда предвыбран автоматически. Вы можете также кликнуть дополнительный АКБ со склада для выдачи 2-го аккумулятора.'
                    : 'На выбранном велосипеде нет аккумулятора. Выберите один или несколько аккумуляторов со склада:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {relevantBatteries.map((bat) => {
                    const isSelected = selectedBatteryIds.includes(bat.id);
                    const isBikeBat = selectedBike?.batteryId === bat.id || selectedBike?.id === bat.installedBikeId;
                    return (
                      <div
                        key={bat.id}
                        onClick={() => toggleBatterySelection(bat.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-400/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200 break-words" title={bat.serialNumber}>
                            {bat.serialNumber}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isBikeBat && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                На байке
                              </span>
                            )}
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
                          <span>
                            {bat.voltage}V • {bat.capacityAh}Ah
                          </span>
                          {bat.chemistry && (
                            <span className="font-mono text-[9px] px-1 py-0.2 bg-slate-100 dark:bg-slate-700/60 rounded">
                              {bat.chemistry}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Outfits selection checkboxes */}
          {availableOutfits.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Экипировка и аксессуары (опционально)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {availableOutfits.map((outfit) => {
                  const isChecked = selectedOutfitIds.includes(outfit.id);
                  return (
                    <div
                      key={outfit.id}
                      onClick={() => toggleOutfit(outfit.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101c16] hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate font-medium text-slate-900 dark:text-white">{outfit.name}</div>
                        <div className="text-[10px] text-slate-400">
                          Инв. №: {outfit.inventoryNumber || '—'} • Залог: {outfit.depositValue.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0 pointer-events-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 min-h-[44px] border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              ← Назад
            </button>
            <button
              type="button"
              disabled={!selectedBikeId}
              onClick={() => setStep(3)}
              className="px-5 py-2.5 min-h-[44px] bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <span className="hidden sm:inline">Далее: Тариф и оплата →</span>
              <span className="sm:hidden">Далее →</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Tariff, Deposit and Checkout */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Tariffs selection or inline creation */}
          {tariffs.length === 0 || isCreatingTariff ? (
            <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200">
                    {tariffs.length === 0 ? 'Нет созданных шаблонов аренды' : 'Создание нового шаблона тарифа'}
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    {tariffs.length === 0
                      ? 'Создайте шаблон сейчас, и он сразу применится к этой выдаче'
                      : 'Заполните параметры тарифа для сохранения в CRM'}
                  </p>
                </div>
                {tariffs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingTariff(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                  >
                    Отмена
                  </button>
                )}
              </div>

              <form onSubmit={handleCreateTariffInline} className="space-y-3 pt-1">
                {/* Row 1: Name and Bike Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col justify-between">
                    <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                      Название тарифа *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Например: U2 Выкуп 90д"
                      value={newTariffForm.name}
                      onChange={(e) => setNewTariffForm({ ...newTariffForm, name: e.target.value })}
                      className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-amber-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-col justify-between">
                    <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                      Привязка к модели байка
                    </label>
                    <select
                      value={newTariffForm.bikeModelId}
                      onChange={(e) => {
                        const mId = e.target.value;
                        if (newTariffForm.type === 'RENT_TO_OWN') {
                          recalculateBuyoutFromItemsInline(mId, newTariffForm.includedBatteries);
                        } else {
                          setNewTariffForm((prev) => ({ ...prev, bikeModelId: mId }));
                        }
                      }}
                      className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-amber-500/20 rounded-xl font-medium text-slate-900 dark:text-white"
                    >
                      <option value="">Все модели (универсальный тариф)</option>
                      {bikeModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.powerWatts}W)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Type and Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex flex-col justify-between">
                    <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                      Тип аренды *
                    </label>
                    <select
                      value={newTariffForm.type}
                      onChange={(e) => {
                        const newType = e.target.value as 'STANDARD' | 'RENT_TO_OWN';
                        if (newType === 'RENT_TO_OWN') {
                          recalculateBuyoutFromItemsInline(newTariffForm.bikeModelId, newTariffForm.includedBatteries || [], {
                            type: 'RENT_TO_OWN',
                            durationDays: newTariffForm.durationDays && newTariffForm.durationDays > 30 ? newTariffForm.durationDays : 90,
                          });
                        } else {
                          setNewTariffForm((prev) => ({
                            ...prev,
                            type: 'STANDARD',
                            durationDays: prev.durationDays === 90 || prev.durationDays === 180 ? 7 : (prev.durationDays || 7),
                            price: prev.price || 6000,
                          }));
                        }
                      }}
                      className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-amber-500/20 rounded-xl font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="STANDARD">Обычная аренда (STANDARD)</option>
                      <option value="RENT_TO_OWN">Аренда с правом выкупа (RENT_TO_OWN)</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-between">
                    <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                      {newTariffForm.type === 'RENT_TO_OWN' ? 'Общий срок выкупа (дней) *' : 'Срок аренды (дней) *'}
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      step="any"
                      value={newTariffForm.durationDays}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNewTariffForm((prev) => {
                          const interval = prev.paymentIntervalDays || 7;
                          const periods = Math.max(1, Math.round(val / interval));
                          const inst = Math.ceil(((prev.totalBuyoutPrice || 0) / periods) / 10) * 10;
                          return {
                            ...prev,
                            durationDays: val,
                            installmentPayment: prev.type === 'RENT_TO_OWN' ? inst : prev.installmentPayment,
                            price: prev.type === 'RENT_TO_OWN' ? inst : prev.price,
                          };
                        });
                      }}
                      className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-amber-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* If STANDARD */}
                {newTariffForm.type === 'STANDARD' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex flex-col justify-between">
                      <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                        Стоимость аренды (₽) *
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="any"
                        value={newTariffForm.price}
                        onChange={(e) =>
                          setNewTariffForm({ ...newTariffForm, price: Number(e.target.value) })
                        }
                        className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-emerald-600"
                      />
                    </div>
                    <div className="flex flex-col justify-between">
                      <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                        Обязательный залог (₽) *
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="any"
                        value={newTariffForm.depositRequired}
                        onChange={(e) =>
                          setNewTariffForm({ ...newTariffForm, depositRequired: Number(e.target.value) })
                        }
                        className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                ) : (
                  /* If RENT_TO_OWN: full purple box identical to RentalsPage */
                  <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                        Параметры выкупа (рассрочки)
                      </span>
                      <div className="flex items-center gap-2">
                        {(selectedBike || selectedBatteries.length > 0) && (
                          <button
                            type="button"
                            onClick={handleAutoPopulateBuyoutFromSelection}
                            className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-purple-900/60 hover:bg-purple-100 text-purple-700 dark:text-purple-200 border border-purple-300 dark:border-purple-700 rounded-lg text-[10px] font-bold transition shadow-sm"
                            title="Заполнить комплект из выбранного на предыдущих шагах байка и АКБ"
                          >
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            Из выбранного байка и АКБ
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleCalculateTariffInstallment}
                          className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                          title="Автоматически рассчитать платёж исходя из общей суммы и интервала"
                        >
                          <Sparkles className="w-3 h-3" />
                          Рассчитать платёж
                        </button>
                      </div>
                    </div>

                    {/* Batteries list */}
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#0c1611] border border-purple-200 dark:border-purple-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-purple-300 text-xs flex items-center gap-1">
                            🔋 Аккумуляторы в выкупе
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            ({newTariffForm.includedBatteries.length} поз.)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddBuyoutBatteryInline}
                          className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                        >
                          <Plus className="w-3 h-3" />
                          Добавить АКБ
                        </button>
                      </div>

                      {newTariffForm.includedBatteries.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-2 px-3 text-center bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-dashed border-purple-200 dark:border-purple-800/30">
                          Велосипед идет в выкуп без аккумуляторов. Нажмите <strong>«+ Добавить АКБ»</strong>, если в выкуп входят батареи.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-400 px-1">
                            <span className="col-span-6">Модель аккумулятора</span>
                            <span className="col-span-2 text-center">Кол-во</span>
                            <span className="col-span-2 text-right">Цена за шт.</span>
                            <span className="col-span-2 text-right">Итого</span>
                          </div>
                          {newTariffForm.includedBatteries.map((item, idx) => {
                            const rowTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
                            return (
                              <div
                                key={idx}
                                className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-50 dark:bg-[#101d17] border border-purple-100 dark:border-purple-900/40 text-xs"
                              >
                                <div className="col-span-6">
                                  <select
                                    value={item.batteryModelId}
                                    onChange={(e) =>
                                      handleUpdateBuyoutBatteryInline(idx, { batteryModelId: e.target.value })
                                    }
                                    className="w-full px-2 py-1.5 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-purple-800/40 rounded-lg text-[11px] font-semibold"
                                  >
                                    <option value="">-- Выберите модель АКБ --</option>
                                    {batteryModels.map((bm) => (
                                      <option key={bm.id} value={bm.id}>
                                        {bm.name} ({bm.voltage}V {bm.capacityAh}Ah) — {(bm.salePrice || 25000).toLocaleString('ru-RU')} ₽
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    title="Количество"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleUpdateBuyoutBatteryInline(idx, { quantity: Math.max(1, Number(e.target.value)) })
                                    }
                                    className="w-full px-2 py-1.5 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-purple-800/40 rounded-lg text-[11px] font-bold text-center"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    title="Цена за шт. (₽)"
                                    value={item.price}
                                    onChange={(e) =>
                                      handleUpdateBuyoutBatteryInline(idx, { price: Number(e.target.value) })
                                    }
                                    className="w-full px-2 py-1.5 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-purple-800/40 rounded-lg text-[11px] font-bold text-emerald-600 dark:text-emerald-400 text-right"
                                  />
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-1.5">
                                  <span className="font-extrabold text-[11px] text-purple-700 dark:text-purple-300">
                                    {rowTotal.toLocaleString('ru-RU')} ₽
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBuyoutBatteryInline(idx)}
                                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                                    title="Удалить АКБ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Real-time Breakdown bar */}
                      {(() => {
                        const curModel = bikeModels.find((m) => m.id === newTariffForm.bikeModelId) || selectedBike?.model;
                        const bPrice = curModel ? (curModel.baseBuyoutPrice || curModel.salePrice || 60000) : 0;
                        const batsTotal = (newTariffForm.includedBatteries || []).reduce(
                          (sum, b) => sum + (Number(b.quantity) || 0) * (Number(b.price) || 0),
                          0
                        );
                        const totalCalculated = bPrice + batsTotal;
                        return (
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] pt-1.5 border-t border-purple-100 dark:border-purple-800/30">
                            <span className="text-slate-600 dark:text-slate-400">
                              Авто-расчёт: {curModel ? curModel.name : 'Байк'} ({bPrice.toLocaleString('ru-RU')} ₽)
                              {batsTotal > 0 && ` + АКБ (${batsTotal.toLocaleString('ru-RU')} ₽)`}
                              {' = '}
                              <strong className="font-black text-purple-700 dark:text-purple-300">
                                {totalCalculated.toLocaleString('ru-RU')} ₽
                              </strong>
                            </span>
                            {newTariffForm.totalBuyoutPrice !== totalCalculated && totalCalculated > 0 && (
                              <button
                                type="button"
                                onClick={() => recalculateBuyoutFromItemsInline(newTariffForm.bikeModelId, newTariffForm.includedBatteries)}
                                className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold"
                              >
                                ↻ Применить расчет ({totalCalculated.toLocaleString('ru-RU')} ₽)
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Row: Total Buyout Price & Payment Interval */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="flex flex-col justify-between">
                        <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem] flex items-center justify-between">
                          <span>Полная выкупная цена (₽) *</span>
                          <span className="text-[10px] text-slate-400 font-normal">можно изменить</span>
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          step="any"
                          value={newTariffForm.totalBuyoutPrice}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const dur = newTariffForm.durationDays || 90;
                            const interval = newTariffForm.paymentIntervalDays || 7;
                            const periods = Math.max(1, Math.round(dur / interval));
                            const inst = Math.ceil((val / periods) / 10) * 10;
                            setNewTariffForm({
                              ...newTariffForm,
                              totalBuyoutPrice: val,
                              installmentPayment: inst,
                              price: inst,
                            });
                          }}
                          className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-black text-purple-700 dark:text-purple-300"
                        />
                      </div>

                      <div className="flex flex-col justify-between">
                        <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                          Интервал платежей (дней) *
                        </label>
                        <input
                          required
                          type="number"
                          min="1"
                          step="any"
                          value={newTariffForm.paymentIntervalDays}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value));
                            const dur = newTariffForm.durationDays || 90;
                            const periods = Math.max(1, Math.round(dur / val));
                            const inst = Math.ceil(((newTariffForm.totalBuyoutPrice || 0) / periods) / 10) * 10;
                            setNewTariffForm({
                              ...newTariffForm,
                              paymentIntervalDays: val,
                              installmentPayment: inst,
                              price: inst,
                            });
                          }}
                          className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Row: Regular Payment & Required Deposit */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex flex-col justify-between">
                        <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                          Регулярный платёж за интервал (₽) *
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          step="any"
                          value={newTariffForm.installmentPayment}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const total = Number(newTariffForm.totalBuyoutPrice) || 0;
                            const interval = Number(newTariffForm.paymentIntervalDays) || 7;
                            if (val >= 500 && total > 0) {
                              const periods = Math.max(1, Math.ceil(total / val));
                              const newDur = Math.min(3650, periods * interval);
                              setNewTariffForm({
                                ...newTariffForm,
                                installmentPayment: val,
                                price: val,
                                durationDays: newDur,
                              });
                            } else {
                              setNewTariffForm({
                                ...newTariffForm,
                                installmentPayment: val,
                                price: val,
                              });
                            }
                          }}
                          onBlur={() => {
                            const val = Number(newTariffForm.installmentPayment) || 0;
                            const total = Number(newTariffForm.totalBuyoutPrice) || 0;
                            const interval = Number(newTariffForm.paymentIntervalDays) || 7;
                            if (val > 0 && total > 0) {
                              const periods = Math.max(1, Math.ceil(total / val));
                              const newDur = Math.min(3650, periods * interval);
                              setNewTariffForm((prev) => ({
                                ...prev,
                                durationDays: newDur,
                              }));
                            }
                          }}
                          className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-black text-emerald-600 dark:text-emerald-400"
                        />
                      </div>

                      <div className="flex flex-col justify-between">
                        <label className="block text-slate-600 dark:text-slate-300 mb-1 font-semibold text-xs min-h-[1.25rem]">
                          Обязательный залог (₽) *
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          step="any"
                          value={newTariffForm.depositRequired}
                          onChange={(e) =>
                            setNewTariffForm({ ...newTariffForm, depositRequired: Number(e.target.value) })
                          }
                          className="w-full h-10 px-3 py-2 bg-white dark:bg-[#0c1611] border border-purple-300 dark:border-purple-800 rounded-xl font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Dynamic Buyout Schedule Summary */}
                    {(() => {
                      const total = Number(newTariffForm.totalBuyoutPrice) || 0;
                      const interval = Number(newTariffForm.paymentIntervalDays) || 7;
                      const inst = Number(newTariffForm.installmentPayment) || 0;
                      const dur = Number(newTariffForm.durationDays) || 90;
                      const periods = inst > 0 && total > 0
                        ? Math.max(1, Math.ceil(total / inst))
                        : Math.max(1, Math.round(dur / interval));
                      const alignedDays = periods * interval;
                      const regularCount = Math.max(0, periods - 1);
                      const regularTotal = regularCount * inst;
                      const finalPayment = Math.max(0, total - regularTotal);
                      const isDurationMismatched = dur !== alignedDays;

                      return (
                        <div className="p-3 rounded-xl bg-purple-100/60 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/40 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 text-[11px]">
                              📊 График выплат: {periods} {periods === 1 ? 'платёж' : periods < 5 ? 'платежа' : 'платежей'} каждые {interval} дн. (срок {alignedDays} дн.)
                            </span>
                            {isDurationMismatched && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewTariffForm((prev) => ({ ...prev, durationDays: alignedDays }));
                                  toast.success(`Срок синхронизирован: ${alignedDays} дн. (${periods} плат.)`);
                                }}
                                className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold transition shadow-sm"
                                title="Установить срок тарифа равным рассчитанному сроку погашения"
                              >
                                ↻ Синхронизировать срок ({alignedDays} дн.)
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1.5 border-t border-purple-200/70 dark:border-purple-800/40">
                            <div>
                              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                                {regularCount > 0 ? `Платежи 1–${regularCount}:` : 'Платёж:'}
                              </span>
                              <strong className="text-slate-800 dark:text-slate-100 font-bold">
                                {inst.toLocaleString('ru-RU')} ₽ / {interval} дн.
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Финальный платёж:</span>
                              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {finalPayment.toLocaleString('ru-RU')} ₽ (закрывает выкуп)
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Итоговая сумма:</span>
                              <strong className="text-purple-700 dark:text-purple-300 font-black">
                                {total.toLocaleString('ru-RU')} ₽ ровно
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/30">
                  {tariffs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingTariff(false)}
                      className="px-3.5 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
                    >
                      Отмена
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Сохранить и выбрать тариф
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-500 font-semibold">Выберите шаблон тарифа:</label>
                  <button
                    type="button"
                    onClick={handleOpenCreateTariffInline}
                    className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Новый шаблон
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                {[...tariffs]
                  .sort((a, b) => {
                    const aMatches = selectedBike && a.bikeModelId === selectedBike.modelId ? 2 : (!a.bikeModelId ? 1 : 0);
                    const bMatches = selectedBike && b.bikeModelId === selectedBike.modelId ? 2 : (!b.bikeModelId ? 1 : 0);
                    return bMatches - aMatches;
                  })
                  .map((tariff) => {
                    const isSelected = selectedTariffId === tariff.id;
                    const isModelMatch = Boolean(selectedBike && tariff.bikeModelId === selectedBike.modelId);
                    return (
                      <div
                        key={tariff.id}
                        onClick={() => handleTariffChange(tariff.id)}
                        className={`p-3 rounded-xl border text-center cursor-pointer transition-all flex flex-col justify-between min-h-[145px] ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-2 ring-sky-400/20 shadow-sm'
                            : isModelMatch
                            ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 hover:border-emerald-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 break-words leading-snug" title={tariff.name}>
                            {tariff.name}
                          </p>
                          <p className="text-sm font-black text-slate-900 dark:text-white mt-1.5">
                            {tariff.price.toLocaleString('ru-RU')} ₽
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {tariff.durationDays} {tariff.durationDays === 1 ? 'день' : 'дней'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                          {tariff.type === 'RENT_TO_OWN' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold shrink-0">
                              Выкуп
                            </span>
                          )}
                          {tariff.bikeModelId ? (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold break-words max-w-full ${
                                isModelMatch
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              }`}
                              title={tariff.bikeModel?.name || 'Модель'}
                            >
                              🚲 {tariff.bikeModel?.name || 'Модель'}
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Все модели
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
              

          {/* Rent-To-Own Contract Settings Block */}
          {selectedTariff?.type === 'RENT_TO_OWN' && (
            <div className="p-3.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-purple-900 dark:text-purple-200">
                    Параметры договора выкупа (рассрочки)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 font-extrabold">
                    {selectedTariff.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCalculateContractInstallment}
                  className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                  title="Рассчитать размер взноса исходя из суммы выкупа и срока"
                >
                  <Sparkles className="w-3 h-3" />
                  Рассчитать взнос
                </button>
              </div>

              {/* Breakdown of buyout package (Bike + Batteries) */}
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-purple-200 dark:border-purple-800/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <span>Состав выкупа (техника и батареи):</span>
                  {packageBuyoutPrice > 0 && buyoutTotalPrice !== packageBuyoutPrice && (
                    <button
                      type="button"
                      onClick={() => {
                        setBuyoutTotalPrice(packageBuyoutPrice);
                        const dur = selectedTariff?.durationDays || 180;
                        const interval = buyoutPaymentIntervalDays || 7;
                        const periods = Math.max(1, Math.round(dur / interval));
                        const inst = Math.ceil(packageBuyoutPrice / periods);
                        setBuyoutInstallmentPayment(inst);
                        setBuyoutFirstPayment(inst);
                        toast.success(`Установлена расчётная сумма выкупа: ${packageBuyoutPrice.toLocaleString('ru-RU')} ₽`);
                      }}
                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold"
                      title="Сбросить стоимость к сумме комплекта"
                    >
                      ↻ Применить расчёт ({packageBuyoutPrice.toLocaleString('ru-RU')} ₽)
                    </button>
                  )}
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between py-0.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      🚲 {selectedBike?.model?.name || selectedBike?.inventoryNumber || 'Велосипед'}:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {bikeBuyoutPrice > 0 ? `${bikeBuyoutPrice.toLocaleString('ru-RU')} ₽` : '0 ₽ (не указана)'}
                    </span>
                  </div>

                  {selectedBatteries.length > 0 ? (
                    selectedBatteries.map((b, idx) => (
                      <div key={b.id || idx} className="flex items-center justify-between py-0.5 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          🔋 {b.modelName || b.serialNumber || `АКБ #${idx + 1}`}:
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {(b.salePrice || 25000).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-slate-400 italic py-0.5">
                      Без аккумуляторов (чистый велосипед)
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 font-bold text-purple-700 dark:text-purple-300">
                    <span>Сумма по комплекту:</span>
                    <span>{packageBuyoutPrice.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col justify-between">
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-[11px] min-h-[1.25rem] flex items-center justify-between">
                    <span>Полная стоимость выкупа (₽) *</span>
                    {(selectedBike?.model?.baseBuyoutPrice || selectedBike?.model?.salePrice) && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                        Базовая по модели: {(selectedBike.model.baseBuyoutPrice || selectedBike.model.salePrice || 0).toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={buyoutTotalPrice}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const dur = buyoutDurationDays || 180;
                      const interval = buyoutPaymentIntervalDays || 7;
                      const periods = Math.max(1, Math.round(dur / interval));
                      const inst = Math.ceil((val / periods) / 10) * 10;
                      setBuyoutTotalPrice(val);
                      setBuyoutInstallmentPayment(inst);
                      setBuyoutFirstPayment(inst);
                    }}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg font-black text-purple-700 dark:text-purple-300"
                  />
                </div>

                <div className="flex flex-col justify-between">
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-[11px] min-h-[1.25rem]">
                    Общий срок договора (дней) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={buyoutDurationDays}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      const interval = buyoutPaymentIntervalDays || 7;
                      const periods = Math.max(1, Math.round(val / interval));
                      const inst = Math.ceil((buyoutTotalPrice / periods) / 10) * 10;
                      setBuyoutDurationDays(val);
                      setBuyoutInstallmentPayment(inst);
                      setBuyoutFirstPayment(inst);
                    }}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col justify-between">
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-[11px] min-h-[1.25rem]">
                    Периодичность выплат (дней) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={buyoutPaymentIntervalDays}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      const dur = buyoutDurationDays || 180;
                      const periods = Math.max(1, Math.round(dur / val));
                      const inst = Math.ceil((buyoutTotalPrice / periods) / 10) * 10;
                      setBuyoutPaymentIntervalDays(val);
                      setBuyoutInstallmentPayment(inst);
                      setBuyoutFirstPayment(inst);
                    }}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg font-bold"
                  />
                </div>

                <div className="flex flex-col justify-between">
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-[11px] min-h-[1.25rem]">
                    Регулярный платёж за период (₽) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={buyoutInstallmentPayment}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const total = Number(buyoutTotalPrice) || 0;
                      const interval = Number(buyoutPaymentIntervalDays) || 7;
                      if (val >= 500 && total > 0) {
                        const periods = Math.max(1, Math.ceil(total / val));
                        const newDur = Math.min(3650, periods * interval);
                        setBuyoutInstallmentPayment(val);
                        setBuyoutFirstPayment(val);
                        setBuyoutDurationDays(newDur);
                      } else {
                        setBuyoutInstallmentPayment(val);
                        setBuyoutFirstPayment(val);
                      }
                    }}
                    onBlur={() => {
                      const val = Number(buyoutInstallmentPayment) || 0;
                      const total = Number(buyoutTotalPrice) || 0;
                      const interval = Number(buyoutPaymentIntervalDays) || 7;
                      if (val > 0 && total > 0) {
                        const periods = Math.max(1, Math.ceil(total / val));
                        const newDur = Math.min(3650, periods * interval);
                        setBuyoutDurationDays(newDur);
                      }
                    }}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg font-black text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-[11px] flex items-center justify-between">
                  <span>Первый взнос при выдаче (₽) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    по умолчанию равен регулярному платежу
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={buyoutFirstPayment}
                  onChange={(e) => setBuyoutFirstPayment(Number(e.target.value))}
                  className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg font-black text-emerald-600 dark:text-emerald-400 text-xs"
                />
              </div>

              {/* Dynamic Buyout Schedule Summary in Wizard */}
              {(() => {
                const total = Number(buyoutTotalPrice) || 0;
                const dur = Number(buyoutDurationDays) || 91;
                const interval = Number(buyoutPaymentIntervalDays) || 7;
                const inst = Number(buyoutInstallmentPayment) || 0;
                const first = Math.max(0, Number(buyoutFirstPayment) || 0);

                // Остаток к погашению регулярными платежами в будущем
                const remainingToPay = Math.max(0, total - first);

                // Сколько регулярных платежей предстоит сделать
                const futurePeriods = inst > 0 && remainingToPay > 0
                  ? Math.max(1, Math.ceil(remainingToPay / inst))
                  : (remainingToPay === 0 ? 0 : Math.max(1, Math.round(dur / interval)));

                // Рассчитанный общий срок договора:
                // Если первый взнос внесен сегодня и покрывает целый период (напр. 8 550 ₽),
                // общий срок = 1 период (сегодня) + futurePeriods * interval.
                // Если первый взнос 0 ₽, то все futurePeriods идут каждые interval дней.
                const alignedDays = (first > 0 && first >= inst)
                  ? (futurePeriods * interval + interval)
                  : Math.max(interval, futurePeriods * interval);

                const regularCount = Math.max(0, futurePeriods - 1);
                const regularTotal = regularCount * inst;
                const finalPayment = Math.max(0, remainingToPay - regularTotal);
                const isDurationMismatched = dur !== alignedDays && alignedDays > 0;

                return (
                  <div className="p-3.5 rounded-xl bg-purple-100/60 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/40 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 text-[11px]">
                        📊 Расчет графика:{' '}
                        {first > 0 ? (
                          <span>
                            Взнос сегодня <strong className="text-emerald-700 dark:text-emerald-300">{first.toLocaleString('ru-RU')} ₽</strong> + {futurePeriods} будущ. {futurePeriods === 1 ? 'платёж' : futurePeriods < 5 ? 'платежа' : 'платежей'} каждые {interval} дн.
                          </span>
                        ) : (
                          <span>
                            Без взноса (0 ₽ сегодня) → {futurePeriods} {futurePeriods === 1 ? 'платёж' : futurePeriods < 5 ? 'платежа' : 'платежей'} каждые {interval} дн.
                          </span>
                        )}
                        {' '}(срок {alignedDays} дн.)
                      </span>
                      {isDurationMismatched && (
                        <button
                          type="button"
                          onClick={() => {
                            setBuyoutDurationDays(alignedDays);
                            toast.success(`Срок синхронизирован: ${alignedDays} дн. (${futurePeriods} плат.)`);
                          }}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                          title="Установить срок договора равным рассчитанному сроку погашения"
                        >
                          ↻ Синхронизировать срок ({alignedDays} дн.)
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1.5 border-t border-purple-200/70 dark:border-purple-800/40">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Взнос сегодня:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                          {first.toLocaleString('ru-RU')} ₽
                        </strong>
                        <span className="text-[9px] text-slate-400 block">
                          {first === 0 ? 'Без предоплаты' : first === inst ? 'Платёж № 1' : 'Первонач. взнос'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Остаток долга:</span>
                        <strong className="text-purple-700 dark:text-purple-300 font-extrabold">
                          {remainingToPay.toLocaleString('ru-RU')} ₽
                        </strong>
                        <span className="text-[9px] text-slate-400 block">
                          {futurePeriods} {futurePeriods === 1 ? 'платеж' : futurePeriods < 5 ? 'платежа' : 'платежей'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                          {futurePeriods > 1 ? `Платежи 1–${regularCount}:` : 'Будущий платёж:'}
                        </span>
                        <strong className="text-slate-800 dark:text-slate-100 font-bold">
                          {inst.toLocaleString('ru-RU')} ₽ / {interval} дн.
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Финальный платёж:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {finalPayment.toLocaleString('ru-RU')} ₽
                        </strong>
                        <span className="text-[9px] text-slate-400 block">закроет выкуп</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Start Date / Backdated calculation */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                <Calendar className="w-4 h-4 text-sky-500" />
                Дата начала расчета аренды
              </label>
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                <span className="text-slate-400 text-[10px] mr-0.5">Быстро:</span>
                {[
                  { label: 'Сегодня', days: 0 },
                  { label: 'Вчера', days: 1 },
                  { label: '2 дня назад', days: 2 },
                  { label: '3 дня назад', days: 3 },
                ].map(({ label, days }) => {
                  const targetDate = getDaysAgoDate(days);
                  const isSelected = startDate === targetDate;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setStartDate(targetDate)}
                      className={`px-2 py-1 min-h-[30px] rounded-lg text-[11px] font-semibold transition ${
                        isSelected
                          ? 'bg-sky-600 text-white font-bold shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-base sm:text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                {daysAgoDiff > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    Задним числом (-{daysAgoDiff} дн.)
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    С сегодняшнего дня
                  </span>
                )}
              </div>
            </div>

            {daysAgoDiff > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg p-2 flex items-start gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Договор будет открыт от <strong>{formatDisplayDate(startDate)}</strong>. График платежей и дата окончания аренды рассчитаются с момента фактической выдачи.
                </span>
              </p>
            )}
          </div>

          {/* Contract / Rental Number with Prefix */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs">
                Номер договора аренды *
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400 text-[10px]">Пресеты:</span>
                {['ДОГ-', 'RNT-', 'АР-'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleRentalPrefixChange(p)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                      rentalPrefix === p
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
                  value={rentalPrefix}
                  onChange={(e) => handleRentalPrefixChange(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold font-mono text-center text-xs focus:border-sky-500 focus:outline-none"
                  title="Префикс договора аренды (например, ДОГ- или RNT-)"
                />
              </div>

              <div className="flex-1 relative">
                <input
                  required
                  type="text"
                  placeholder="ДОГ-001"
                  value={rentalNumber}
                  onChange={(e) => setRentalNumber(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100 font-bold text-xs focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = calculateNextRentalNumber(rentalPrefix);
                    setRentalNumber(nextNum);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-sky-500 transition"
                  title="Подобрать следующий свободный номер для этого префикса"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Префикс подбирает следующий номер договора по порядку. Можно свободно править вручную.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 mb-1">
                Обеспечительный залог (депозит), ₽
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={customDeposit}
                onChange={(e) => setCustomDeposit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Способ внесения оплаты</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <option value="CASH">Наличные в кассу</option>
                <option value="SBP">СБП (Система быстрых платежей / QR)</option>
                <option value="CARD">Банковская карта (терминал)</option>
                <option value="BANK_TRANSFER">Безналичный расчет (по счету)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 text-xs mb-1">
              Примечание к выдаче / Особые отметки
            </label>
            <input
              type="text"
              placeholder="Например: выдан второй комплект ключей, термочехол АКБ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          {/* Checkout Summary Box */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <span className="text-slate-400">Договор:</span>
              <span className="font-mono font-bold text-sky-400">{rentalNumber || 'Авто'}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <span className="text-slate-400">Курьер:</span>
              <span className="font-bold">{selectedClient?.fullName}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <span className="text-slate-400">Байк:</span>
              <span className="font-bold text-sky-400">
                {selectedBike?.inventoryNumber} ({selectedBike?.model?.name})
              </span>
            </div>
            <div className="flex justify-between items-start pb-2 border-b border-slate-700">
              <span className="text-slate-400">АКБ ({selectedBatteries.length} шт.):</span>
              <div className="text-right">
                {selectedBatteries.length > 0 ? (
                  selectedBatteries.map((b) => (
                    <div key={b.id} className="font-semibold text-emerald-400">
                      {b.serialNumber} ({b.voltage}V {b.capacityAh}Ah)
                    </div>
                  ))
                ) : (
                  <span className="text-amber-400 font-semibold">Без аккумулятора</span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <span className="text-slate-400">Дата начала расчета:</span>
              <span className="font-semibold text-sky-300">
                {formatDisplayDate(startDate)}
                {daysAgoDiff > 0 && (
                  <span className="ml-1 text-[10px] text-amber-400 font-normal">(-{daysAgoDiff} дн.)</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <span className="text-slate-400">Срок аренды:</span>
              <span className="font-semibold text-slate-200">
                до {formatDisplayDate(calculatedExpiresAt)} ({effectiveDurationDays} дн.)
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <span className="text-slate-400">Очередной платёж:</span>
              <span className={`font-semibold ${calculatedNextDueIsPast ? 'text-amber-400' : 'text-slate-200'}`}>
                {formatDisplayDate(calculatedNextPaymentDue)}
                {calculatedNextDueIsPast && (
                  <span className="ml-1 text-[10px] text-amber-400 font-bold">⚠️ уже наступил</span>
                )}
              </span>
            </div>
            {isRentToOwn ? (
              <>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Тип договора:</span>
                  <span className="font-bold text-purple-400">Аренда с выкупом</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Полная выкупная цена:</span>
                  <span className="font-bold text-purple-300">{buyoutTotalPrice.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>График платежей:</span>
                  <span>каждые {buyoutPaymentIntervalDays} дн. по {buyoutInstallmentPayment.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Первый взнос при выдаче:</span>
                  <span className={rentalDiscountAmount > 0 ? 'line-through text-slate-400' : 'font-bold'}>
                    {baseTariffPrice.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                {rentalDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      Скидка лояльности ({loyaltyTier?.name} {rentalDiscountPercent}%):
                    </span>
                    <span>-{rentalDiscountAmount.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                {rentalDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-slate-200 font-bold">
                    <span>Первый взнос со скидкой:</span>
                    <span>{discountedTariffPrice.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Стоимость тарифа:</span>
                  <span className={rentalDiscountAmount > 0 ? 'line-through text-slate-400' : ''}>
                    {baseTariffPrice.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                {rentalDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      Скидка лояльности ({loyaltyTier?.name} {rentalDiscountPercent}%):
                    </span>
                    <span>-{rentalDiscountAmount.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                {rentalDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-slate-200 font-bold">
                    <span>Тариф с учетом скидки:</span>
                    <span>{discountedTariffPrice.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between items-center text-slate-300">
              <span>Залог (возвратный):</span>
              <span>{Number(customDeposit || 0).toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm font-extrabold text-emerald-400">
              <span>ИТОГО К ОПЛАТЕ:</span>
              <span>{totalDue.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 min-h-[44px] border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              ← Назад
            </button>
            <button
              type="button"
              disabled={isLoading || !selectedTariffId}
              onClick={handleSubmitCheckout}
              className="px-5 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 shrink-0" />
              {isLoading ? (
                'Оформление...'
              ) : (
                <>
                  <span className="hidden sm:inline">Оформить и сгенерировать акт</span>
                  <span className="sm:hidden">Оформить договор</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )}
    </Modal>
  );
};
