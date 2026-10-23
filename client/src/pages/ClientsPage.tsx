import { useCrmRefresh } from '../hooks/useCrmRefresh';
import React, { useState, useEffect } from 'react';
import { Client, ClientStatus } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { CrmPageHeader } from '../components/CrmPageHeader';
import { PhoneQrModal } from '../components/PhoneQrModal';
import {
  Users,
  Search,
  Plus,
  Phone,
  QrCode,
  Send,
  FileCheck,
  AlertOctagon,
  ShieldAlert,
  Star,
  CheckCircle,
  Trash2,
  Edit2,
  Eye,
  KeyRound,
  Award,
  ShoppingBag,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { COURIER_SERVICES } from '../constants/courierServices';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [clientTypeFilter, setClientTypeFilter] = useState<'ALL' | 'COURIER' | 'RETAIL'>('ALL');
  const [search, setSearch] = useState('');
  const [profileTab, setProfileTab] = useState<'RENTALS' | 'RETAIL' | 'REPAIRS' | 'LOYALTY'>('RENTALS');

  // Contact / Phone QR Modal
  const [selectedContactModal, setSelectedContactModal] = useState<{
    phone: string;
    clientName: string;
    telegram?: string | null;
    details?: {
      courierService?: string;
      rentalNumber?: string;
      telegram?: string | null;
    };
  } | null>(null);

  // Status Change / Blacklist Modal
  const [statusModalClient, setStatusModalClient] = useState<Client | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<ClientStatus>('NORMAL');
  const [blackListReason, setBlackListReason] = useState('');

  // Client Full Profile Modal
  const [profileClient, setProfileClient] = useState<Client | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const handleOpenProfile = async (client: Client) => {
    setProfileLoading(true);
    setProfileClient(client);
    try {
      const full = await api.getClient(client.id);
      setProfileClient(full);
    } catch (err: any) {
      toast.error('Не удалось загрузить детальные данные клиента: ' + err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Add Courier Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    fullName: '',
    phone: '',
    telegram: '',
    passportSerial: '',
    passportNumber: '',
    registrationAddress: '',
    citizenship: 'РФ',
    migrationCard: '',
    patentNumber: '',
    courierService: 'Яндекс Еда',
    clientType: 'COURIER' as 'COURIER' | 'RETAIL',
  });

  // Edit Courier Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientForm, setEditClientForm] = useState({
    fullName: '',
    phone: '',
    telegram: '',
    passportSerial: '',
    passportNumber: '',
    registrationAddress: '',
    citizenship: 'РФ',
    migrationCard: '',
    patentNumber: '',
    courierService: 'Яндекс Еда',
    clientType: 'COURIER' as 'COURIER' | 'RETAIL',
  });

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setEditClientForm({
      fullName: client.fullName || '',
      phone: client.phone || '',
      telegram: client.telegram || '',
      passportSerial: client.passportSerial || '',
      passportNumber: client.passportNumber || '',
      registrationAddress: client.registrationAddress || '',
      citizenship: client.citizenship || 'РФ',
      migrationCard: client.migrationCard || '',
      patentNumber: client.patentNumber || '',
      courierService: client.courierService || 'Яндекс Еда',
      clientType: client.clientType || 'COURIER',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      await api.updateClient(editingClient.id, editClientForm as any);
      toast.success(`Данные клиента ${editClientForm.fullName} успешно обновлены`);
      setIsEditModalOpen(false);
      setEditingClient(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления данных клиента');
    }
  };

  const loadData = () => {
    setIsLoading(true);
    api
      .getClients({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        courierService: serviceFilter === 'ALL' ? undefined : serviceFilter,
        clientType: clientTypeFilter === 'ALL' ? undefined : clientTypeFilter,
        search,
      })
      .then((data) => setClients(data))
      .catch((err) => toast.error('Ошибка загрузки клиентов: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useCrmRefresh(() => {
    loadData();
    if (profileClient) api.getClient(profileClient.id).then(setProfileClient).catch(() => {});
  });

  useEffect(() => {
    loadData();
  }, [statusFilter, serviceFilter, clientTypeFilter]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createClient(newClientForm as any);
      toast.success(`Курьер ${newClientForm.fullName} успешно зарегистрирован!`);
      setIsAddModalOpen(false);
      setNewClientForm({
        fullName: '',
        phone: '',
        telegram: '',
        passportSerial: '',
        passportNumber: '',
        registrationAddress: '',
        citizenship: 'РФ',
        migrationCard: '',
        patentNumber: '',
        courierService: 'Яндекс Еда',
        clientType: 'COURIER',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка регистрации курьера');
    }
  };

  const handleOpenStatusModal = (client: Client) => {
    setStatusModalClient(client);
    setSelectedNewStatus(client.status);
    setBlackListReason(client.blackListReason || '');
  };

  const handleConfirmStatusChange = async () => {
    if (!statusModalClient) return;
    try {
      await api.updateClientStatus(statusModalClient.id, selectedNewStatus, blackListReason);
      toast.success(`Статус курьера ${statusModalClient.fullName} обновлен`);
      setStatusModalClient(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления статуса');
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (client.activeRental) {
      toast.error(`Невозможно удалить курьера ${client.fullName}: у него есть активный договор аренды!`);
      return;
    }
    if (
      window.confirm(
        `Вы действительно хотите удалить курьера "${client.fullName}" (${client.phone}) из базы CRM?`
      )
    ) {
      try {
        await api.deleteClient(client.id);
        toast.success(`Курьер ${client.fullName} успешно удален`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления курьера');
      }
    }
  };


  return (
    <div className="crm-page">
      {/* Header */}
      <CrmPageHeader title="База клиентов" icon={<Users className="h-5 w-5" />}
        description="Курьеры доставки, розничные покупатели магазина и клиенты мастерской СТО"
        action={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Добавить клиента
        </button>
        }
      />

      {/* Filters */}
      <div className="contour-card min-w-0 space-y-4 p-4">
        <div className="space-y-3">
          {/* Client Type Filter */}
          <div role="group" aria-label="Тип клиента" className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'Все клиенты' },
              { id: 'COURIER', label: 'Курьеры доставки' },
              { id: 'RETAIL', label: 'Покупатели магазина / СТО' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setClientTypeFilter(tab.id as any)}
                aria-pressed={clientTypeFilter === tab.id}
                className={`crm-filter-tab ${
                  clientTypeFilter === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-[#101d17] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#162720]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div role="group" aria-label="Статус клиента" className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-emerald-500/15">
          {[
            { id: 'ALL', label: 'Все статусы' },
            { id: 'NORMAL', label: 'Надежные' },
            { id: 'VIP', label: 'VIP' },
            { id: 'PROBLEM', label: 'Проблемные' },
            { id: 'BLACKLIST', label: 'Черный список' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              aria-pressed={statusFilter === tab.id}
              className={`crm-filter-tab ${
                statusFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#162720] dark:border-emerald-500/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="min-w-0">
          <span className="crm-field-label">Служба доставки</span>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="input-field"
            title="Фильтр по службе доставки"
          >
            <option value="ALL">Все службы доставки</option>
            {COURIER_SERVICES.map((s: any) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          </label>

          <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="min-w-0">
            <label htmlFor="client-search" className="crm-field-label">Поиск</label>
            <div className="relative">
            <Search className="pointer-events-none w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="client-search"
              type="text"
              placeholder="ФИО, телефон, Telegram, патент..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
            </div>
          </form>
        </div>
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block contour-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th className="p-3.5 font-semibold whitespace-nowrap">Клиент</th>
                <th className="p-3.5 font-semibold whitespace-nowrap">Контакты</th>
                <th className="p-3.5 font-semibold whitespace-nowrap">Роль и активность</th>
                <th className="p-3.5 font-semibold whitespace-nowrap">Арендная активность</th>
                <th className="p-3.5 font-semibold whitespace-nowrap">Документы</th>
                <th className="p-3.5 font-semibold whitespace-nowrap">Текущая аренда</th>
                <th className="p-3.5 font-semibold text-center whitespace-nowrap">Статус</th>
                <th className="p-3.5 font-semibold text-right whitespace-nowrap">Управление</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/10">
              {clients.map((c) => {
                const isBlacklisted = c.status === 'BLACKLIST';
                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                      isBlacklisted ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          onClick={() => handleOpenProfile(c)}
                          className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer transition-colors"
                          title="Открыть карточку клиента"
                        >
                          {c.fullName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenProfile(c)}
                              className="font-bold text-slate-900 dark:text-white hover:text-emerald-500 text-left transition-colors"
                            >
                              {c.fullName}
                            </button>
                          </div>
                          {c.blackListReason && (
                            <p className="text-xs text-rose-600 font-semibold max-w-xs truncate">
                              Причина ЧС: {c.blackListReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {c.phone ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedContactModal({
                              phone: c.phone,
                              clientName: c.fullName,
                              telegram: c.telegram,
                              details: {
                                courierService: c.courierService || undefined,
                                rentalNumber: c.activeRental?.rentalNumber,
                                telegram: c.telegram,
                              },
                            })
                          }
                          className="inline-flex min-h-11 items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800/80 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700 text-sm font-semibold transition group shadow-2xs"
                          title="Связаться: QR-код для звонка или диалог в Telegram"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                          <span className="font-mono">{c.phone}</span>
                          <QrCode className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        </button>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 text-sm italic">Нет телефона</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {c.isCourier && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20 whitespace-nowrap">
                            🚲 {c.courierService || 'Курьер'}
                          </span>
                        )}
                        {(c.retailOrdersCount || 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold text-xs border border-sky-500/20 whitespace-nowrap">
                            🛍️ {c.retailOrdersCount} чеков ({(c.retailOrdersSpent || 0).toLocaleString('ru-RU')} ₽)
                          </span>
                        )}
                        {!c.isCourier && (!c.retailOrdersCount || c.retailOrdersCount === 0) && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs whitespace-nowrap">
                            {c.clientType === 'RETAIL' ? 'Покупатель' : 'Клиент'}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {c.totalRentalDays || 0} дн. в прокате
                        </span>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>Всего: {(c.totalSpent || 0).toLocaleString('ru-RU')} ₽</span>
                          {c.loyaltyTier && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-extrabold text-xs border border-amber-500/20 uppercase">
                              ★ {c.loyaltyTier.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 space-y-0.5 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-semibold">
                        {c.citizenship}
                      </span>
                      {c.passportNumber ? (
                        <p className="text-xs text-slate-500">
                          Паспорт: {c.passportSerial || ''} {c.passportNumber}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Паспорт не внесен</p>
                      )}
                      {c.patentNumber && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                          Патент: {c.patentNumber}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {c.activeRental ? (
                        <span className="text-sky-600 dark:text-sky-400 font-bold">
                          {c.activeRental.rentalNumber}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">Нет активной</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      <StatusBadge type="client" status={c.status} />
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenProfile(c)}
                          title="Просмотреть карточку и историю клиента"
                          className="crm-icon-button text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          title="Редактировать данные клиента"
                          className="crm-icon-button text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenStatusModal(c)}
                          className="btn-secondary"
                        >
                          Статус
                        </button>
                        <button
                          onClick={() => handleDeleteClient(c)}
                          title={c.activeRental ? 'Нельзя удалить: есть активный договор' : 'Удалить клиента'}
                          disabled={!!c.activeRental}
                          className={`crm-icon-button ${
                            c.activeRental
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (< 768px) */}
      <div className="block md:hidden space-y-3">
        {clients.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 italic contour-card">
            Клиенты не найдены
          </div>
        ) : (
          clients.map((c) => {
            const isBlacklisted = c.status === 'BLACKLIST';
            return (
              <div
                key={c.id}
                className={`p-4 rounded-2xl border contour-card space-y-3 transition-all ${
                  isBlacklisted
                    ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/10'
                    : 'border-slate-200 dark:border-emerald-500/15'
                }`}
              >
                {/* Header: Name, Status & Courier badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      onClick={() => handleOpenProfile(c)}
                      className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
                    >
                      {c.fullName.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => handleOpenProfile(c)}
                        className="min-h-11 font-semibold text-base leading-snug text-slate-900 dark:text-white break-words text-left block"
                      >
                        {c.fullName}
                      </button>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {c.isCourier && (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            🚲 {c.courierService || 'Курьер'}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {c.citizenship}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge type="client" status={c.status} className="!text-xs" />
                  </div>
                </div>

                {isBlacklisted && c.blackListReason && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                    ⚠️ ЧС: {c.blackListReason}
                  </div>
                )}

                {/* 1-Tap Call and Telegram Row */}
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${c.phone}`}
                    className="flex-1 min-h-[44px] px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="break-words">Позвонить ({c.phone})</span>
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedContactModal({
                        phone: c.phone,
                        clientName: c.fullName,
                        telegram: c.telegram,
                        details: {
                          courierService: c.courierService || undefined,
                          rentalNumber: c.activeRental?.rentalNumber,
                          telegram: c.telegram,
                        },
                      })
                    }
                    className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                    title="QR-код и Telegram"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  {c.telegram && (
                    <a
                      href={`https://t.me/${c.telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[44px] px-3 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] text-sm font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 shrink-0"
                      title="Написать в Telegram"
                    >
                      <Send className="w-4 h-4" />
                      <span>TG</span>
                    </a>
                  )}
                </div>

                {/* Info Grid: Rental, Total days/spent */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-600 dark:text-slate-400 block">Текущая аренда</span>
                    {c.activeRental ? (
                      <strong className="text-sky-600 dark:text-sky-400 font-bold block truncate">
                        {c.activeRental.rentalNumber}
                      </strong>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 font-medium block">Нет активной</span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-600 dark:text-slate-400 block">В прокате</span>
                    <div className="text-slate-800 dark:text-slate-200 font-semibold flex flex-wrap items-center gap-1.5 text-sm">
                      <span>{c.totalRentalDays || 0} дн. • {(c.totalSpent || 0).toLocaleString('ru-RU')} ₽</span>
                      {c.loyaltyTier && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-extrabold text-xs border border-amber-500/20 uppercase shrink-0">
                          ★ {c.loyaltyTier.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Touch Action Buttons (min-height 44px) */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-emerald-500/10">
                  <button
                    type="button"
                    onClick={() => handleOpenProfile(c)}
                    className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1 text-sm font-semibold transition-colors"
                  >
                    <Eye className="w-4 h-4 text-sky-500" />
                    <span>Карточка</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(c)}
                    aria-label="Редактировать данные клиента"
                    className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1 text-sm font-semibold transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-emerald-500" />
                    <span className="hidden sm:inline">Изменить</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenStatusModal(c)}
                    className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
                  >
                    Статус
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteClient(c)}
                    disabled={!!c.activeRental}
                    className={`min-h-[44px] px-3 rounded-xl border transition-colors flex items-center justify-center ${
                      c.activeRental
                        ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        : 'border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    }`}
                    title={c.activeRental ? 'Нельзя удалить: есть активный договор' : 'Удалить'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Change Status & Blacklist */}
      <Modal
        isOpen={!!statusModalClient}
        onClose={() => setStatusModalClient(null)}
        title="Изменение статуса курьера"
        subtitle={statusModalClient?.fullName}
        maxWidth="md"
        mobileFullscreen
        footer={<div className="flex flex-wrap justify-end gap-2 pt-3">
          <button className="btn-secondary" onClick={() => setStatusModalClient(null)}>Отмена</button>
          <button className="btn-primary" onClick={handleConfirmStatusChange}>Сохранить статус</button>
        </div>}
      >
        <div className="space-y-4 text-sm">
          <div>
            <label htmlFor="client-status" className="crm-field-label">Статус в системе *</label>
            <select id="client-status"
              value={selectedNewStatus}
              onChange={(e) => setSelectedNewStatus(e.target.value as ClientStatus)}
              className="input-field"
            >
              <option value="NORMAL">NORMAL (Обычный надежный клиент)</option>
              <option value="VIP">VIP (Приоритетный курьер, скидка)</option>
              <option value="PROBLEM">PROBLEM (Задерживает оплаты, риск)</option>
              <option value="BLACKLIST">BLACKLIST (Черный список — запрет выдачи!)</option>
            </select>
          </div>

          {selectedNewStatus === 'BLACKLIST' && (
            <div>
              <label htmlFor="client-blacklist-reason" className="block text-rose-600 font-bold mb-1">
                Причина внесения в Черный Список *
              </label>
              <textarea id="client-blacklist-reason"
                rows={3}
                placeholder="Укажите подробную причину (невозврат байка, попытка кражи АКБ, скрывался...)"
                value={blackListReason}
                onChange={(e) => setBlackListReason(e.target.value)}
                className="input-field border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/30"
              />
            </div>
          )}

        </div>
      </Modal>

      {/* Modal: Add Client */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={newClientForm.clientType === 'COURIER' ? 'Онбординг нового курьера' : 'Регистрация клиента (Магазин / СТО)'}
        subtitle="Проверка документов и регистрация в CRM"
        maxWidth="lg"
        mobileFullscreen
        footer={<div className="flex flex-wrap justify-end gap-2 pt-3">
          <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Отмена</button>
          <button type="submit" form="create-client-form" className="btn-primary">Зарегистрировать</button>
        </div>}
      >
        <form id="create-client-form" onSubmit={handleCreateClient} className="space-y-4 text-sm">
          {/* Client Type Selector */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setNewClientForm({ ...newClientForm, clientType: 'COURIER' })}
              className={`flex-1 min-h-11 px-2 py-2 text-sm font-semibold rounded-lg transition-colors ${
                newClientForm.clientType === 'COURIER'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              🚴 Курьер доставки
            </button>
            <button
              type="button"
              onClick={() => setNewClientForm({ ...newClientForm, clientType: 'RETAIL' })}
              className={`flex-1 min-h-11 px-2 py-2 text-sm font-semibold rounded-lg transition-colors ${
                newClientForm.clientType === 'RETAIL'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              👤 Розничный покупатель / СТО
            </button>
          </div>

          <div>
            <label htmlFor="new-client-fullName" className="crm-field-label">
              {newClientForm.clientType === 'COURIER' ? 'ФИО курьера полностью *' : 'ФИО покупателя / заказчика *'}
            </label>
            <input id="new-client-fullName"
              required
              type="text"
              placeholder="Иванов Алексей Сергеевич"
              value={newClientForm.fullName}
              onChange={(e) => setNewClientForm({ ...newClientForm, fullName: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col justify-between">
              <label htmlFor="new-client-phone" className="crm-field-label">Номер телефона *</label>
              <input id="new-client-phone"
                required
                type="text"
                placeholder="+7 (999) 000-00-00"
                value={newClientForm.phone}
                onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="flex flex-col justify-between">
              <label htmlFor="new-client-telegram" className="crm-field-label">Telegram (@username)</label>
              <input id="new-client-telegram"
                type="text"
                placeholder="@client_tg"
                value={newClientForm.telegram}
                onChange={(e) => setNewClientForm({ ...newClientForm, telegram: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {newClientForm.clientType === 'COURIER' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col justify-between">
                <label htmlFor="new-client-citizenship" className="crm-field-label">Гражданство *</label>
                <select id="new-client-citizenship"
                  value={newClientForm.citizenship}
                  onChange={(e) => setNewClientForm({ ...newClientForm, citizenship: e.target.value })}
                  className="input-field font-semibold"
                >
                  <option value="РФ">Российская Федерация (РФ)</option>
                  <option value="Узбекистан">Узбекистан</option>
                  <option value="Кыргызстан">Кыргызстан (ЕАЭС)</option>
                  <option value="Таджикистан">Таджикистан</option>
                  <option value="Беларусь">Беларусь (ЕАЭС)</option>
                </select>
              </div>
              <div className="flex flex-col justify-between">
                <label htmlFor="new-client-courierService" className="crm-field-label">Служба доставки</label>
                <select id="new-client-courierService"
                  value={newClientForm.courierService}
                  onChange={(e) => setNewClientForm({ ...newClientForm, courierService: e.target.value })}
                  className="input-field"
                >
                  {COURIER_SERVICES.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col justify-between">
              <label htmlFor="new-client-passportSerial" className="crm-field-label">Серия паспорта</label>
              <input id="new-client-passportSerial"
                type="text"
                placeholder="4518 / FA"
                value={newClientForm.passportSerial}
                onChange={(e) => setNewClientForm({ ...newClientForm, passportSerial: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="flex flex-col justify-between">
              <label htmlFor="new-client-passportNumber" className="crm-field-label">Номер паспорта</label>
              <input id="new-client-passportNumber"
                type="text"
                placeholder="123456"
                value={newClientForm.passportNumber}
                onChange={(e) => setNewClientForm({ ...newClientForm, passportNumber: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <label className="block text-slate-500 font-semibold">Прописка
            <textarea value={newClientForm.registrationAddress} maxLength={500} rows={2} placeholder="Город, улица, дом, корпус, квартира" onChange={(e) => setNewClientForm({ ...newClientForm, registrationAddress: e.target.value })} className="input-field mt-1" />
          </label>

          {newClientForm.citizenship !== 'РФ' && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Обязательные поля для иностранных граждан (СНГ / ЕАЭС):
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col justify-between">
                  <label htmlFor="new-client-migrationCard" className="crm-field-label">Миграционная карта *</label>
                  <input id="new-client-migrationCard"
                    required
                    type="text"
                    placeholder="МК 77-00-123456"
                    value={newClientForm.migrationCard}
                    onChange={(e) => setNewClientForm({ ...newClientForm, migrationCard: e.target.value })}
                    className="input-field border-amber-300 dark:border-amber-700"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <label htmlFor="new-client-patentNumber" className="crm-field-label">Патент / ЕАЭС *</label>
                  <input id="new-client-patentNumber"
                    required
                    type="text"
                    placeholder="ПАТ-77-991204"
                    value={newClientForm.patentNumber}
                    onChange={(e) => setNewClientForm({ ...newClientForm, patentNumber: e.target.value })}
                    className="input-field border-amber-300 dark:border-amber-700"
                  />
                </div>
              </div>
            </div>
          )}

        </form>
      </Modal>

      {/* Modal: Edit Client */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingClient(null);
        }}
        title="Редактирование данных клиента"
        subtitle={editingClient ? `Клиент: ${editingClient.fullName}` : ''}
        maxWidth="lg"
        mobileFullscreen
        footer={<div className="flex flex-wrap justify-end gap-2 pt-3">
          <button type="button" className="btn-secondary" onClick={() => { setIsEditModalOpen(false); setEditingClient(null); }}>Отмена</button>
          <button type="submit" form="edit-client-form" className="btn-primary">Сохранить изменения</button>
        </div>}
      >
        <form id="edit-client-form" onSubmit={handleUpdateClient} className="space-y-4 text-sm">
          {/* Client Type Selector */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setEditClientForm({ ...editClientForm, clientType: 'COURIER' })}
              className={`flex-1 min-h-11 px-2 py-2 text-sm font-semibold rounded-lg transition-colors ${
                editClientForm.clientType === 'COURIER'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              🚴 Курьер доставки
            </button>
            <button
              type="button"
              onClick={() => setEditClientForm({ ...editClientForm, clientType: 'RETAIL' })}
              className={`flex-1 min-h-11 px-2 py-2 text-sm font-semibold rounded-lg transition-colors ${
                editClientForm.clientType === 'RETAIL'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              👤 Розничный покупатель / СТО
            </button>
          </div>

          <div>
            <label htmlFor="edit-client-fullName" className="crm-field-label">
              {editClientForm.clientType === 'COURIER' ? 'ФИО курьера полностью *' : 'ФИО покупателя / заказчика *'}
            </label>
            <input id="edit-client-fullName"
              required
              type="text"
              placeholder="Иванов Алексей Сергеевич"
              value={editClientForm.fullName}
              onChange={(e) => setEditClientForm({ ...editClientForm, fullName: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col justify-between">
              <label htmlFor="edit-client-phone" className="crm-field-label">Номер телефона *</label>
              <input id="edit-client-phone"
                required
                type="text"
                placeholder="+7 (999) 000-00-00"
                value={editClientForm.phone}
                onChange={(e) => setEditClientForm({ ...editClientForm, phone: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="flex flex-col justify-between">
              <label htmlFor="edit-client-telegram" className="crm-field-label">Telegram (@username)</label>
              <input id="edit-client-telegram"
                type="text"
                placeholder="@client_tg"
                value={editClientForm.telegram}
                onChange={(e) => setEditClientForm({ ...editClientForm, telegram: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {editClientForm.clientType === 'COURIER' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col justify-between">
                <label htmlFor="edit-client-citizenship" className="crm-field-label">Гражданство *</label>
                <select id="edit-client-citizenship"
                  value={editClientForm.citizenship}
                  onChange={(e) => setEditClientForm({ ...editClientForm, citizenship: e.target.value })}
                  className="input-field font-semibold"
                >
                  <option value="РФ">Российская Федерация (РФ)</option>
                  <option value="Узбекистан">Узбекистан</option>
                  <option value="Кыргызстан">Кыргызстан (ЕАЭС)</option>
                  <option value="Таджикистан">Таджикистан</option>
                  <option value="Беларусь">Беларусь (ЕАЭС)</option>
                </select>
              </div>
              <div className="flex flex-col justify-between">
                <label htmlFor="edit-client-courierService" className="crm-field-label">Служба доставки</label>
                <select id="edit-client-courierService"
                  value={editClientForm.courierService}
                  onChange={(e) => setEditClientForm({ ...editClientForm, courierService: e.target.value })}
                  className="input-field"
                >
                  {COURIER_SERVICES.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col justify-between">
              <label htmlFor="edit-client-passportSerial" className="crm-field-label">Серия паспорта</label>
              <input id="edit-client-passportSerial"
                type="text"
                placeholder="4518 / FA"
                value={editClientForm.passportSerial}
                onChange={(e) => setEditClientForm({ ...editClientForm, passportSerial: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="flex flex-col justify-between">
              <label htmlFor="edit-client-passportNumber" className="crm-field-label">Номер паспорта</label>
              <input id="edit-client-passportNumber"
                type="text"
                placeholder="123456"
                value={editClientForm.passportNumber}
                onChange={(e) => setEditClientForm({ ...editClientForm, passportNumber: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <label className="block text-slate-500 font-semibold">Прописка
            <textarea value={editClientForm.registrationAddress} maxLength={500} rows={2} placeholder="Город, улица, дом, корпус, квартира" onChange={(e) => setEditClientForm({ ...editClientForm, registrationAddress: e.target.value })} className="input-field mt-1" />
          </label>

          {editClientForm.citizenship !== 'РФ' && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Обязательные поля для иностранных граждан (СНГ / ЕАЭС):
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col justify-between">
                  <label htmlFor="edit-client-migrationCard" className="crm-field-label">Миграционная карта *</label>
                  <input id="edit-client-migrationCard"
                    required
                    type="text"
                    placeholder="МК 77-00-123456"
                    value={editClientForm.migrationCard}
                    onChange={(e) => setEditClientForm({ ...editClientForm, migrationCard: e.target.value })}
                    className="input-field border-amber-300 dark:border-amber-700"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <label htmlFor="edit-client-patentNumber" className="crm-field-label">Патент / ЕАЭС *</label>
                  <input id="edit-client-patentNumber"
                    required
                    type="text"
                    placeholder="ПАТ-77-991204"
                    value={editClientForm.patentNumber}
                    onChange={(e) => setEditClientForm({ ...editClientForm, patentNumber: e.target.value })}
                    className="input-field border-amber-300 dark:border-amber-700"
                  />
                </div>
              </div>
            </div>
          )}

        </form>
      </Modal>

      {/* Modal: Client Full Profile (Rentals, Retail Orders, Loyalty) */}
      <Modal
        isOpen={!!profileClient}
        onClose={() => setProfileClient(null)}
        title="Карточка и история клиента"
        subtitle={profileClient?.fullName}
        maxWidth="2xl"
        mobileFullscreen
      >
        {profileClient && (
          <div className="space-y-4 text-sm">
            {/* Header info card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#08100c] dark:to-[#101d17] border border-slate-200 dark:border-emerald-500/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {profileClient.fullName}
                    </h3>
                    <StatusBadge type="client" status={profileClient.status} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {profileClient.phone} {profileClient.telegram ? `• ${profileClient.telegram}` : ''} • Гражданство: {profileClient.citizenship}
                    {profileClient.passportNumber ? ` • Паспорт: ${profileClient.passportSerial || ''} ${profileClient.passportNumber}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {profileClient.isCourier && (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs flex items-center gap-1">
                      🚲 {profileClient.courierService || 'Курьер'}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick stats KPI bar */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-emerald-500/10">
                <div className="p-2 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/60 dark:border-emerald-500/10">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Дней в аренде</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {profileClient.totalRentalDays || 0} дн.
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/60 dark:border-emerald-500/10">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Всего договоров</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {((profileClient as any).rentals || []).length} шт.
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/60 dark:border-emerald-500/10">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Всего трат (LTV)</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {(profileClient.totalSpent || 0).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Tabs */}
            {profileClient.registrationAddress && <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm"><span className="block text-slate-500 text-sm mb-1">Прописка</span><p className="whitespace-pre-wrap break-words">{profileClient.registrationAddress}</p></div>}
            <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-2">
              <button
                type="button"
                onClick={() => setProfileTab('RENTALS')}
                className={`min-h-11 px-3 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  profileTab === 'RENTALS'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Договоры аренды ({((profileClient as any).rentals || []).length})
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('RETAIL')}
                className={`min-h-11 px-3 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  profileTab === 'RETAIL'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Чеки магазина ({((profileClient as any).retailOrders || []).length})
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('LOYALTY')}
                className={`min-h-11 px-3 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  profileTab === 'LOYALTY'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Лояльность и скидки
              </button>
              <button type="button" onClick={() => setProfileTab('REPAIRS')} className={`min-h-[44px] px-3 py-2 text-sm font-bold border-b-2 flex items-center gap-1.5 ${profileTab === 'REPAIRS' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500'}`}>
                <Wrench className="w-3.5 h-3.5" />СТО ({profileClient.repairs?.length || 0})
              </button>
            </div>

            {/* Tab 1: Rentals */}
            {profileTab === 'RENTALS' && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {((profileClient as any).rentals || []).length === 0 ? (
                  <p className="text-center py-6 text-slate-500 dark:text-slate-400">У данного клиента пока нет оформленных договоров аренды.</p>
                ) : (
                  ((profileClient as any).rentals || []).map((r: any) => (
                    <div key={r.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 flex items-center justify-between text-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{r.rentalNumber}</span>
                          <StatusBadge type="rental" status={r.status} />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Байк: {r.bike?.inventoryNumber || r.bikeId} {r.tariff ? `• Тариф: ${r.tariff.name} (${r.tariff.price} ₽)` : ''}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Период: {new Date(r.startedAt).toLocaleDateString()} — {new Date(r.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 dark:text-white">{r.tariff?.price?.toLocaleString('ru-RU') || 0} ₽</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">Залог: {r.depositAmount || 0} ₽</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Retail Orders */}
            {profileTab === 'RETAIL' && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {((profileClient as any).retailOrders || []).length === 0 ? (
                  <p className="text-center py-6 text-slate-500 dark:text-slate-400">У данного клиента пока нет розничных покупок.</p>
                ) : (
                  ((profileClient as any).retailOrders || []).map((o: any) => (
                    <div key={o.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{o.orderNumber}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(o.createdAt).toLocaleString('ru-RU')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold">
                            {o.paymentMethod}
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {o.totalAmount.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </div>
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-400">
                        {o.items.map((it: any, idx: number) => (
                          <div key={idx} className="flex justify-between py-0.5">
                            <span>{it.name} × {it.quantity}</span>
                            <span>{(it.price * it.quantity).toLocaleString('ru-RU')} ₽</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {profileTab === 'REPAIRS' && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(profileClient.repairs || []).length === 0 ? <p className="text-center py-6 text-slate-500 dark:text-slate-400">У клиента пока нет заказ-нарядов СТО.</p> : (profileClient.repairs || []).map((repair) => (
                  <div key={repair.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm space-y-2">
                    <div className="flex flex-wrap justify-between gap-2"><strong>{repair.orderNumber}</strong><StatusBadge type="repair" status={repair.status} /></div>
                    <p>{repair.description}</p>
                    <p>{new Date(repair.createdAt).toLocaleDateString('ru-RU')} · {repair.totalCost.toLocaleString('ru-RU')} ₽</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Loyalty breakdown */}
            {profileTab === 'LOYALTY' && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Текущий уровень лояльности</span>
                    <span className="text-base font-extrabold text-amber-500">
                      ★ {profileClient.loyaltyTier ? profileClient.loyaltyTier.name : 'Базовый уровень'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Режим: {profileClient.loyaltyMode === 'MANUAL' ? 'Назначен вручную' : 'Автоматический (по сумме и дням)'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Скидка на аренду</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {profileClient.loyaltyTier?.discountRentalPercent || 0}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Скидка на детали и экип</span>
                    <span className="text-base font-bold text-sky-600 dark:text-sky-400">
                      {profileClient.loyaltyTier?.discountPartsPercent || 0}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Скидка на СТО</span>
                    <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                      {profileClient.loyaltyTier?.discountRepairsPercent || 0}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Все розничные покупки в магазине и оплаты аренды суммируются в единый оборот (текущий: {(profileClient.totalSpent || 0).toLocaleString('ru-RU')} ₽).
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Contact / Phone QR Modal */}
      {selectedContactModal && (
        <PhoneQrModal
          isOpen={!!selectedContactModal}
          onClose={() => setSelectedContactModal(null)}
          phone={selectedContactModal.phone}
          clientName={selectedContactModal.clientName}
          telegram={selectedContactModal.telegram}
          details={selectedContactModal.details}
        />
      )}
    </div>
  );
};
