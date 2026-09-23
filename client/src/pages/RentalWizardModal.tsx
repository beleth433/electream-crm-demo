import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { Client, Bike, Tariff, Outfit, Rental, Battery } from '../types';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { getNextSequentialNumber, getStoredPrefix, setStoredPrefix } from '../utils/numbering';

interface RentalWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRental: Rental) => void;
}

export const RentalWizardModal: React.FC<RentalWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Data lists
  const [clients, setClients] = useState<Client[]>([]);
  const [availableBikes, setAvailableBikes] = useState<Bike[]>([]);
  const [availableOutfits, setAvailableOutfits] = useState<Outfit[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [allBatteries, setAllBatteries] = useState<Battery[]>([]);

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

  // Step 2: Bike, Batteries and Outfit selection
  const [selectedBikeId, setSelectedBikeId] = useState<string>('');
  const [selectedBatteryIds, setSelectedBatteryIds] = useState<string[]>([]);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<string[]>([]);

  // Step 3: Tariff, deposit, payment method, contract prefix
  const [allRentals, setAllRentals] = useState<Rental[]>([]);
  const [rentalPrefix, setRentalPrefix] = useState<string>(() => getStoredPrefix('rental', 'ДОГ-'));
  const [rentalNumber, setRentalNumber] = useState<string>('');
  const [selectedTariffId, setSelectedTariffId] = useState<string>('');
  const [customDeposit, setCustomDeposit] = useState<number>(3000);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SBP' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');

  // Inline Tariff Creation state
  const [isCreatingTariff, setIsCreatingTariff] = useState(false);
  const [newTariffForm, setNewTariffForm] = useState({
    name: '',
    type: 'STANDARD' as 'STANDARD' | 'RENT_TO_OWN',
    durationDays: 7,
    price: 6000,
    depositRequired: 5000,
  });

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
      setSelectedOutfitIds([]);
      setPhoneQuery('');
      setIsCreatingClient(false);
      setIsCreatingTariff(false);
      setSelectedTariffId('');

      Promise.all([
        api.getClients(),
        api.getBikes({ status: 'AVAILABLE' }),
        api.getAvailableOutfits(),
        api.getRentalTariffs(),
        api.getBatteries(),
        api.getRentals(),
      ])
        .then(([clientsRes, bikesRes, outfitsRes, tariffsRes, batteriesRes, rentalsRes]) => {
          setClients(clientsRes);
          setAvailableBikes(bikesRes);
          setAvailableOutfits(outfitsRes);
          setTariffs(tariffsRes);
          setAllBatteries(batteriesRes);
          setAllRentals(rentalsRes);

          const nextNum = getNextSequentialNumber(
            rentalsRes.map((r) => r.rentalNumber),
            rentalPrefix,
            3
          );
          setRentalNumber(nextNum);

          if (tariffsRes.length > 0) {
            setSelectedTariffId(tariffsRes[0].id);
            setCustomDeposit(tariffsRes[0].depositRequired);
          }
        })
        .catch((err) => toast.error('Ошибка загрузки данных: ' + err.message));
    }
  }, [isOpen]);

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

  const handleTariffChange = (tariffId: string) => {
    setSelectedTariffId(tariffId);
    const trf = tariffs.find((t) => t.id === tariffId);
    if (trf) {
      setCustomDeposit(trf.depositRequired);
    }
  };

  const handleCreateTariffInline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const created = await api.createRentalTariff(newTariffForm);
      setTariffs((prev) => [...prev, created]);
      setSelectedTariffId(created.id);
      setCustomDeposit(created.depositRequired);
      setIsCreatingTariff(false);
      setNewTariffForm({
        name: '',
        type: 'STANDARD',
        durationDays: 7,
        price: 6000,
        depositRequired: 5000,
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
    if (bike.batteryId) {
      setSelectedBatteryIds([bike.batteryId]);
    } else {
      setSelectedBatteryIds([]);
    }
  };

  const toggleBatterySelection = (batteryId: string) => {
    setSelectedBatteryIds((prev) =>
      prev.includes(batteryId) ? prev.filter((id) => id !== batteryId) : [...prev, batteryId]
    );
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

  const selectedTariff = tariffs.find((t) => t.id === selectedTariffId);
  const baseTariffPrice = selectedTariff?.price || 0;
  const loyaltyTier = selectedClient?.loyaltyTier;
  const rentalDiscountPercent = loyaltyTier?.discountRentalPercent || 0;
  const rentalDiscountAmount = Math.round(baseTariffPrice * (rentalDiscountPercent / 100));
  const discountedTariffPrice = Math.max(0, baseTariffPrice - rentalDiscountAmount);
  const totalDue = discountedTariffPrice + Number(customDeposit || 0);

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
        outfitIds: selectedOutfitIds,
        batteryIds: selectedBatteryIds,
        paymentMethod,
        rentalNumber: rentalNumber.trim() ? rentalNumber.trim() : undefined,
        customDeposit: Number(customDeposit),
        notes,
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
      maxWidth="2xl"
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
                        setSelectedClient(client);
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
                      {selectedClient.phone} ({selectedClient.courierService || 'Клиент базы'})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    Далее: Техника →
                  </button>
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
                    <option value="Яндекс Еда">Яндекс Еда / Маркет</option>
                    <option value="Самокат">Самокат</option>
                    <option value="Купер">Купер (СберМаркет)</option>
                    <option value="Достависта">Достависта / СДЭК</option>
                    <option value="Частный курьер">Частный курьер</option>
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
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
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
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              Дополнительная экипировка и аксессуары со склада:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {availableOutfits.map((outfit) => {
                const isChecked = selectedOutfitIds.includes(outfit.id);
                return (
                  <label
                    key={outfit.id}
                    onClick={() => toggleOutfit(outfit.id)}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      isChecked
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {outfit.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Инв: {outfit.inventoryNumber || '—'} • Залог: {outfit.depositValue} ₽
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isChecked
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl"
            >
              ← Назад
            </button>
            <button
              type="button"
              disabled={!selectedBikeId}
              onClick={() => setStep(3)}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Далее: Тариф и оплата →
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
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Отмена
                  </button>
                )}
              </div>

              <form onSubmit={handleCreateTariffInline} className="space-y-3 pt-1">
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">Название тарифа *</label>
                  <input
                    required
                    type="text"
                    placeholder="Например: Недельный рабочий, Месячный..."
                    value={newTariffForm.name}
                    onChange={(e) => setNewTariffForm({ ...newTariffForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1 text-[11px]">Тип аренды *</label>
                    <select
                      value={newTariffForm.type}
                      onChange={(e) =>
                        setNewTariffForm({
                          ...newTariffForm,
                          type: e.target.value as 'STANDARD' | 'RENT_TO_OWN',
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="STANDARD">Обычная аренда</option>
                      <option value="RENT_TO_OWN">Аренда с правом выкупа</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 text-[11px]">Срок аренды (дней) *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={newTariffForm.durationDays}
                      onChange={(e) =>
                        setNewTariffForm({ ...newTariffForm, durationDays: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1 text-[11px]">Стоимость аренды (₽) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="100"
                      value={newTariffForm.price}
                      onChange={(e) =>
                        setNewTariffForm({ ...newTariffForm, price: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 text-[11px]">Залог (₽) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="500"
                      value={newTariffForm.depositRequired}
                      onChange={(e) =>
                        setNewTariffForm({ ...newTariffForm, depositRequired: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-sm"
                  >
                    Сохранить и выбрать тариф
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-500 font-semibold">Выберите шаблон тарифа:</label>
                <button
                  type="button"
                  onClick={() => setIsCreatingTariff(true)}
                  className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3 h-3" /> Новый шаблон
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {tariffs.map((tariff) => {
                  const isSelected = selectedTariffId === tariff.id;
                  return (
                    <div
                      key={tariff.id}
                      onClick={() => handleTariffChange(tariff.id)}
                      className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-2 ring-sky-400/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {tariff.name}
                      </p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                        {tariff.price.toLocaleString('ru-RU')} ₽
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {tariff.durationDays} {tariff.durationDays === 1 ? 'день' : 'дней'}
                      </p>
                      {tariff.type === 'RENT_TO_OWN' && (
                        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                          Выкуп
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                step="500"
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
            <div className="flex justify-between items-center text-slate-300">
              <span>Залог (возвратный):</span>
              <span>{Number(customDeposit || 0).toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm font-extrabold text-emerald-400">
              <span>ИТОГО К ОПЛАТЕ:</span>
              <span>{totalDue.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl"
            >
              ← Назад
            </button>
            <button
              type="button"
              disabled={isLoading || !selectedTariffId}
              onClick={handleSubmitCheckout}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isLoading ? 'Оформление...' : 'Оформить и сгенерировать акт'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
