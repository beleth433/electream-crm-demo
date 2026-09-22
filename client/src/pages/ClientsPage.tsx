import React, { useState, useEffect } from 'react';
import { Client, ClientStatus } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Users,
  Search,
  Plus,
  Phone,
  Send,
  FileCheck,
  AlertOctagon,
  ShieldAlert,
  Star,
  CheckCircle,
  Trash2,
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Status Change / Blacklist Modal
  const [statusModalClient, setStatusModalClient] = useState<Client | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<ClientStatus>('NORMAL');
  const [blackListReason, setBlackListReason] = useState('');

  // Add Courier Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  // Edit Courier Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientForm, setEditClientForm] = useState({
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

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setEditClientForm({
      fullName: client.fullName || '',
      phone: client.phone || '',
      telegram: client.telegram || '',
      passportSerial: client.passportSerial || '',
      passportNumber: client.passportNumber || '',
      citizenship: client.citizenship || 'РФ',
      migrationCard: client.migrationCard || '',
      patentNumber: client.patentNumber || '',
      courierService: client.courierService || 'Яндекс Еда',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      await api.updateClient(editingClient.id, editClientForm as any);
      toast.success(`Данные курьера ${editClientForm.fullName} успешно обновлены`);
      setIsEditModalOpen(false);
      setEditingClient(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления данных курьера');
    }
  };

  const loadData = () => {
    setIsLoading(true);
    api
      .getClients({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        courierService: serviceFilter === 'ALL' ? undefined : serviceFilter,
        search,
      })
      .then((data) => setClients(data))
      .catch((err) => toast.error('Ошибка загрузки курьеров: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, serviceFilter]);

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
        citizenship: 'РФ',
        migrationCard: '',
        patentNumber: '',
        courierService: 'Яндекс Еда',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            База курьеров
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Паспортные данные, проверка гражданства СНГ, патенты и проверка благонадежности
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Зарегистрировать курьера
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 contour-card">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
          {[
            { id: 'ALL', label: 'Все курьеры' },
            { id: 'NORMAL', label: 'Надежные' },
            { id: 'VIP', label: 'VIP' },
            { id: 'PROBLEM', label: 'Проблемные' },
            { id: 'BLACKLIST', label: 'Черный список' },
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
            placeholder="ФИО, телефон, Telegram, патент..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </form>
      </div>

      {/* Courier Cards / Table */}
      <div className="contour-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-[#08100c] text-slate-500 dark:text-emerald-400/80 border-b border-slate-200 dark:border-emerald-500/15">
              <tr>
                <th className="p-3.5 font-semibold">ФИО Курьера</th>
                <th className="p-3.5 font-semibold">Контакты</th>
                <th className="p-3.5 font-semibold">Служба доставки</th>
                <th className="p-3.5 font-semibold">Гражданство и документы</th>
                <th className="p-3.5 font-semibold">Текущая аренда</th>
                <th className="p-3.5 font-semibold text-center">Статус</th>
                <th className="p-3.5 font-semibold text-right">Управление</th>
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
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 shrink-0">
                          {c.fullName.slice(0, 1)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {c.fullName}
                          </span>
                          {c.blackListReason && (
                            <p className="text-[10px] text-rose-600 font-semibold max-w-xs truncate">
                              Причина ЧС: {c.blackListReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{c.phone}</p>
                      {c.telegram && (
                        <a
                          href={`https://t.me/${c.telegram.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-600 dark:text-sky-400 hover:underline text-[10px] flex items-center gap-0.5"
                        >
                          <Send className="w-2.5 h-2.5" /> {c.telegram}
                        </a>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        {c.courierService || 'Яндекс Еда'}
                      </span>
                    </td>

                    <td className="p-3.5 space-y-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-[10px] font-semibold">
                        {c.citizenship}
                      </span>
                      <p className="text-[10px] text-slate-500">
                        Паспорт: {c.passportSerial || ''} {c.passportNumber || ''}
                      </p>
                      {c.patentNumber && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                          Патент: {c.patentNumber}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5">
                      {c.activeRental ? (
                        <span className="text-sky-600 dark:text-sky-400 font-bold">
                          {c.activeRental.rentalNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">Нет активной</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <StatusBadge type="client" status={c.status} />
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          title="Редактировать данные курьера"
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenStatusModal(c)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Статус
                        </button>
                        <button
                          onClick={() => handleDeleteClient(c)}
                          title={c.activeRental ? 'Нельзя удалить: есть активный договор' : 'Удалить курьера'}
                          disabled={!!c.activeRental}
                          className={`p-1 rounded-lg transition-all ${
                            c.activeRental
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
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

      {/* Modal: Change Status & Blacklist */}
      <Modal
        isOpen={!!statusModalClient}
        onClose={() => setStatusModalClient(null)}
        title="Изменение статуса курьера"
        subtitle={statusModalClient?.fullName}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">Статус в системе *</label>
            <select
              value={selectedNewStatus}
              onChange={(e) => setSelectedNewStatus(e.target.value as ClientStatus)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
            >
              <option value="NORMAL">NORMAL (Обычный надежный клиент)</option>
              <option value="VIP">VIP (Приоритетный курьер, скидка)</option>
              <option value="PROBLEM">PROBLEM (Задерживает оплаты, риск)</option>
              <option value="BLACKLIST">BLACKLIST (Черный список — запрет выдачи!)</option>
            </select>
          </div>

          {selectedNewStatus === 'BLACKLIST' && (
            <div>
              <label className="block text-rose-600 font-bold mb-1">
                Причина внесения в Черный Список *
              </label>
              <textarea
                rows={3}
                placeholder="Укажите подробную причину (невозврат байка, попытка кражи АКБ, скрывался...)"
                value={blackListReason}
                onChange={(e) => setBlackListReason(e.target.value)}
                className="w-full px-3 py-2 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 rounded-lg text-xs"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setStatusModalClient(null)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirmStatusChange}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm"
            >
              Сохранить статус
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Add Courier */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Онбординг нового курьера"
        subtitle="Проверка документов и регистрация в CRM"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateClient} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">ФИО курьера полностью *</label>
            <input
              required
              type="text"
              placeholder="Азизов Бахром Искандерович"
              value={newClientForm.fullName}
              onChange={(e) => setNewClientForm({ ...newClientForm, fullName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Номер телефона *</label>
              <input
                required
                type="text"
                placeholder="+7 (999) 000-00-00"
                value={newClientForm.phone}
                onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Telegram (@username)</label>
              <input
                type="text"
                placeholder="@courier_tg"
                value={newClientForm.telegram}
                onChange={(e) => setNewClientForm({ ...newClientForm, telegram: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Гражданство *</label>
              <select
                value={newClientForm.citizenship}
                onChange={(e) => setNewClientForm({ ...newClientForm, citizenship: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="Яндекс Еда">Яндекс Еда / Маркет</option>
                <option value="Самокат">Самокат</option>
                <option value="Купер">Купер</option>
                <option value="Частный курьер">Частный курьер</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Серия паспорта</label>
              <input
                type="text"
                placeholder="4518 / FA"
                value={newClientForm.passportSerial}
                onChange={(e) => setNewClientForm({ ...newClientForm, passportSerial: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Номер паспорта</label>
              <input
                type="text"
                placeholder="123456"
                value={newClientForm.passportNumber}
                onChange={(e) => setNewClientForm({ ...newClientForm, passportNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          {newClientForm.citizenship !== 'РФ' && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                Обязательные поля для иностранных граждан (СНГ / ЕАЭС):
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Миграционная карта *</label>
                  <input
                    required
                    type="text"
                    placeholder="МК 77-00-123456"
                    value={newClientForm.migrationCard}
                    onChange={(e) => setNewClientForm({ ...newClientForm, migrationCard: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Патент / ЕАЭС *</label>
                  <input
                    required
                    type="text"
                    placeholder="ПАТ-77-991204"
                    value={newClientForm.patentNumber}
                    onChange={(e) => setNewClientForm({ ...newClientForm, patentNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm"
            >
              Зарегистрировать
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Courier */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingClient(null);
        }}
        title="Редактирование данных курьера"
        subtitle={editingClient ? `Курьер ID: ${editingClient.id}` : ''}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateClient} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">ФИО курьера полностью *</label>
            <input
              required
              type="text"
              placeholder="Азизов Бахром Искандерович"
              value={editClientForm.fullName}
              onChange={(e) => setEditClientForm({ ...editClientForm, fullName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Номер телефона *</label>
              <input
                required
                type="text"
                placeholder="+7 (999) 000-00-00"
                value={editClientForm.phone}
                onChange={(e) => setEditClientForm({ ...editClientForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Telegram (@username)</label>
              <input
                type="text"
                placeholder="@courier_tg"
                value={editClientForm.telegram}
                onChange={(e) => setEditClientForm({ ...editClientForm, telegram: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Гражданство *</label>
              <select
                value={editClientForm.citizenship}
                onChange={(e) => setEditClientForm({ ...editClientForm, citizenship: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
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
                value={editClientForm.courierService}
                onChange={(e) => setEditClientForm({ ...editClientForm, courierService: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="Яндекс Еда">Яндекс Еда / Маркет</option>
                <option value="Самокат">Самокат</option>
                <option value="Купер">Купер</option>
                <option value="Частный курьер">Частный курьер</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Серия паспорта</label>
              <input
                type="text"
                placeholder="4518 / FA"
                value={editClientForm.passportSerial}
                onChange={(e) => setEditClientForm({ ...editClientForm, passportSerial: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Номер паспорта</label>
              <input
                type="text"
                placeholder="123456"
                value={editClientForm.passportNumber}
                onChange={(e) => setEditClientForm({ ...editClientForm, passportNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          {editClientForm.citizenship !== 'РФ' && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                Обязательные поля для иностранных граждан (СНГ / ЕАЭС):
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Миграционная карта *</label>
                  <input
                    required
                    type="text"
                    placeholder="МК 77-00-123456"
                    value={editClientForm.migrationCard}
                    onChange={(e) => setEditClientForm({ ...editClientForm, migrationCard: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Патент / ЕАЭС *</label>
                  <input
                    required
                    type="text"
                    placeholder="ПАТ-77-991204"
                    value={editClientForm.patentNumber}
                    onChange={(e) => setEditClientForm({ ...editClientForm, patentNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingClient(null);
              }}
              className="px-4 py-2 border border-slate-200 rounded-xl"
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
    </div>
  );
};
