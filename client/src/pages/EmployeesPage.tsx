import React, { useState, useEffect } from 'react';
import { User, AccessLevel, Employee, PaymentMethod } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { UserFormModal } from '../components/employees/UserFormModal';
import { AccessLevelModal } from '../components/employees/AccessLevelModal';
import { AccessLevelsTab } from '../components/employees/AccessLevelsTab';
import {
  Users,
  ShieldCheck,
  Plus,
  Banknote,
  Edit2,
  Trash2,
  Phone,
  Search,
  CheckCircle2,
  Ban,
  Clock,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface EmployeesPageProps {
  currentUser?: User | null;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'team' | 'levels'>('team');
  const [users, setUsers] = useState<User[]>([]);
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AccessLevel | null>(null);

  // Salary Payout Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutUser, setPayoutUser] = useState<User | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number>(30000);
  const [payoutMethod, setPayoutMethod] = useState<PaymentMethod>('CASH');
  const [payoutComment, setPayoutComment] = useState('');

  const empPerm = currentUser?.accessLevel?.permissions?.employees;
  const canEditEmployees = currentUser?.accessLevel ? empPerm?.canEdit !== false : true;
  const canDeleteEmployees = currentUser?.accessLevel ? empPerm?.canDelete !== false : true;
  const canManageRBAC = currentUser?.accessLevel ? currentUser.accessLevel.canManageEmployees !== false : true;

  const isHighestAccess = (u: User) =>
    u.accessLevelId === 'lvl-owner' ||
    u.accessLevel?.id === 'lvl-owner' ||
    u.login === 'bxleth';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uData, lData, eData] = await Promise.all([
        api.getUsers(),
        api.getAccessLevels(),
        api.getEmployees().catch(() => []),
      ]);
      setUsers(uData);
      setAccessLevels(lData);
      setEmployees(eData);
    } catch (err: any) {
      toast.error('Ошибка загрузки данных: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (targetUser: User) => {
    if (!canEditEmployees) {
      toast.error('У вас нет прав редактирования статуса сотрудников');
      return;
    }
    if (isHighestAccess(targetUser)) {
      toast.error('Учетная запись с высшим уровнем доступа не может быть деактивирована');
      return;
    }
    if (targetUser.id === currentUser?.id) {
      toast.error('Вы не можете заблокировать собственную учетную запись');
      return;
    }
    const nextState = targetUser.isActive === false ? true : false;
    try {
      await api.updateUser(targetUser.id, { isActive: nextState });
      toast.success(
        nextState
          ? `Сотрудник ${targetUser.fullName} разблокирован`
          : `Доступ для ${targetUser.fullName} заблокирован`
      );
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка изменения статуса');
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (!canDeleteEmployees) {
      toast.error('У вас нет прав удаления сотрудников');
      return;
    }
    if (targetUser.login === 'bxleth') {
      toast.error('Учетная запись руководителя защищена от удаления');
      return;
    }
    if (window.confirm(`Вы уверены, что хотите удалить сотрудника "${targetUser.fullName}" (@${targetUser.login})?`)) {
      try {
        await api.deleteUser(targetUser.id);
        toast.success(`Сотрудник "${targetUser.fullName}" удален`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления');
      }
    }
  };

  const handleOpenPayoutModal = (targetUser: User) => {
    setPayoutUser(targetUser);
    const defaultAmount =
      targetUser.salaryType === 'MONTHLY'
        ? Math.round((targetUser.salaryAmount || 50000) / 2)
        : targetUser.salaryAmount || 50000;
    setPayoutAmount(defaultAmount);
    setPayoutComment(
      targetUser.salaryType === 'MONTHLY'
        ? 'Аванс за текущий месяц'
        : targetUser.salaryType === 'PER_SHIFT'
        ? 'Оплата отработанных смен'
        : 'Оплата за выполненную работу'
    );
    setPayoutMethod('CASH');
    setIsPayoutModalOpen(true);
  };

  const handleExecutePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutUser) return;

    try {
      // Find matching employee by id or phone or create one
      const empId = payoutUser.employeeId || employees.find((e) => e.phone === payoutUser.phone)?.id;
      if (!empId) {
        toast.error('Сотрудник не найден в зарплатной базе');
        return;
      }
      const res = await api.payoutSalary(empId, {
        amount: payoutAmount,
        method: payoutMethod,
        comment: payoutComment,
      });
      toast.success(res.message || 'Выплата зарплаты зафиксирована в кассе!');
      setIsPayoutModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка проведения выплаты');
    }
  };

  // KPIs
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive !== false).length;
  const totalPayroll = users.reduce((sum, u) => {
    if (u.isActive === false) return sum;
    const amt = u.salaryAmount || 0;
    return sum + (u.salaryType === 'PER_SHIFT' ? amt * 22 : amt);
  }, 0);
  const totalPaidThisMonth = users.reduce((sum, u) => sum + (u.thisMonthPaid || 0), 0);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      (u.login && u.login.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.roleTitle && u.roleTitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Команда и уровни доступа (RBAC)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Управление учетными записями, логинами, паролями, уровнями доступа и зарплатами
          </p>
        </div>

        {/* Sub-tab switcher */}
        {canManageRBAC && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 self-start sm:self-auto">
            <button
              onClick={() => setActiveSubTab('team')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'team'
                  ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Команда ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('levels')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'levels'
                  ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Уровни доступа ({accessLevels.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Subtab 1: Team & Accounts */}
      {activeSubTab === 'team' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 contour-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Всего сотрудников
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {totalUsers} <span className="text-xs font-normal text-slate-400">чел.</span>
              </div>
              <p className="text-[11px] text-emerald-500 mt-1 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {activeUsers} активных аккаунтов
              </p>
            </div>

            <div className="p-4 contour-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Расчетный ФОТ в месяц
                </span>
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {totalPayroll.toLocaleString('ru-RU')} ₽
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Оклады и сменные ставки</p>
            </div>

            <div className="p-4 contour-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Выплачено в этом месяце
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-500">
                {totalPaidThisMonth.toLocaleString('ru-RU')} ₽
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Отражено в кассовых расходах</p>
            </div>

            <div className="p-4 contour-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Настроено уровней
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {accessLevels.length}
              </div>
              <p className="text-[11px] text-purple-400 mt-1">Гибкие RBAC профили</p>
            </div>
          </div>

          {/* Search Bar & Add Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по ФИО, логину @, должности или телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {canEditEmployees && (
              <button
                onClick={() => {
                  setEditingUser(null);
                  setIsUserModalOpen(true);
                }}
                className="min-h-[44px] px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить сотрудника</span>
              </button>
            )}
          </div>

          {/* Mobile Cards (Phones < 768px) */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.map((u) => {
              const lvl = accessLevels.find((l) => l.id === u.accessLevelId) || u.accessLevel;
              const isActive = u.isActive !== false;

              return (
                <div
                  key={u.id}
                  className={`p-4 contour-card space-y-3 transition-all ${
                    !isActive ? 'opacity-60 bg-rose-500/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        {u.fullName}
                      </h4>
                      <p className="text-xs font-mono font-bold text-emerald-500">
                        @{u.login || u.username}
                      </p>
                      <span className="inline-block mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {u.roleTitle || 'Сотрудник'}
                      </span>
                    </div>

                    {isHighestAccess(u) ? (
                      <span className="min-h-[36px] px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5 shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Владелец</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={!canEditEmployees}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1.5 shrink-0 ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        <span>{isActive ? 'Активен' : 'Заблокирован'}</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Уровень доступа:</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {lvl?.name || 'По умолчанию'}
                      </span>
                    </div>

                    {u.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Телефон:</span>
                        <a href={`tel:${u.phone}`} className="hover:text-emerald-400 font-medium">
                          {u.phone}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Ставка з/п:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {(u.salaryAmount ?? 0).toLocaleString('ru-RU')} ₽
                        <span className="text-[10px] font-normal text-slate-400">
                          {' '}
                          /{u.salaryType === 'PER_SHIFT' ? 'смена' : 'мес'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {(canEditEmployees || canDeleteEmployees) && (
                    <div className="pt-3 border-t border-slate-200 dark:border-emerald-500/10 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenPayoutModal(u)}
                        className="min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Выплата з/п</span>
                      </button>

                      {canEditEmployees && (
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setIsUserModalOpen(true);
                          }}
                          className="min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-emerald-500/20 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Редактировать</span>
                        </button>
                      )}

                      {canDeleteEmployees && !isHighestAccess(u) && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="col-span-2 min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 border border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold rounded-xl"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Удалить сотрудника</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table (Screens >= 768px) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-emerald-500/20 bg-white dark:bg-[#07100b]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-emerald-500/20 bg-slate-50 dark:bg-[#0c1611] text-slate-500 dark:text-slate-400 font-bold">
                  <th className="py-3 px-4">Сотрудник и логин</th>
                  <th className="py-3 px-4">Должность</th>
                  <th className="py-3 px-4">Уровень доступа</th>
                  <th className="py-3 px-4">Оклад / Ставка</th>
                  <th className="py-3 px-4">Телефон</th>
                  <th className="py-3 px-4 text-center">Доступ</th>
                  {(canEditEmployees || canDeleteEmployees) && <th className="py-3 px-4 text-right">Действия</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/10">
                {filteredUsers.map((u) => {
                  const lvl = accessLevels.find((l) => l.id === u.accessLevelId) || u.accessLevel;
                  const isActive = u.isActive !== false;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50 dark:hover:bg-[#0c1712] transition-colors ${
                        !isActive ? 'opacity-60 bg-rose-500/5' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{u.fullName}</div>
                        <span className="font-mono text-[11px] font-bold text-emerald-500">
                          @{u.login || u.username}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {u.roleTitle || 'Сотрудник'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {lvl?.name || 'По умолчанию'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {(u.salaryAmount ?? 0).toLocaleString('ru-RU')} ₽
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          /{u.salaryType === 'PER_SHIFT' ? 'смена' : 'мес'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {u.phone ? (
                          <a href={`tel:${u.phone}`} className="hover:text-emerald-400">
                            {u.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isHighestAccess(u) ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Владелец</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={!canEditEmployees}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors inline-flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-emerald-500/10 hover:text-emerald-400'
                            }`}
                            title="Нажмите, чтобы включить/отключить доступ"
                          >
                            {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            <span>{isActive ? 'Активен' : 'Блок'}</span>
                          </button>
                        )}
                      </td>

                      {(canEditEmployees || canDeleteEmployees) && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 min-w-[145px]">
                            {canEditEmployees && (
                              <button
                                onClick={() => handleOpenPayoutModal(u)}
                                title="Выплатить зарплату / аванс"
                                className="h-8 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[11px] inline-flex items-center justify-center gap-1 shadow-2xs transition-colors shrink-0"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>Выплата</span>
                              </button>
                            )}

                            {canEditEmployees && (
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setIsUserModalOpen(true);
                                }}
                                title="Редактировать сотрудника"
                                className="w-8 h-8 inline-flex items-center justify-center border border-slate-200 dark:border-emerald-500/20 text-slate-600 dark:text-slate-300 hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDeleteEmployees && (
                              !isHighestAccess(u) ? (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  title="Удалить сотрудника"
                                  className="w-8 h-8 inline-flex items-center justify-center border border-slate-200 dark:border-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div className="w-8 h-8 shrink-0" />
                              )
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Access Levels (RBAC) */}
      {activeSubTab === 'levels' && (
        <AccessLevelsTab
          accessLevels={accessLevels}
          users={users}
          canManage={canManageRBAC}
          onRefresh={loadData}
          onOpenCreateModal={() => {
            setEditingLevel(null);
            setIsLevelModalOpen(true);
          }}
          onOpenEditModal={(lvl) => {
            setEditingLevel(lvl);
            setIsLevelModalOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={editingUser}
        accessLevels={accessLevels}
        onSuccess={loadData}
      />


      <AccessLevelModal
        isOpen={isLevelModalOpen}
        onClose={() => setIsLevelModalOpen(false)}
        level={editingLevel}
        onSuccess={loadData}
      />

      {/* Salary Payout Modal */}
      <Modal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        title="Выплата зарплаты / аванса"
        subtitle="Списание средств из кассы компании в счет фонда оплаты труда"
        maxWidth="md"
      >
        {payoutUser && (
          <form onSubmit={handleExecutePayout} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Получатель:</span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {payoutUser.fullName}
                </h4>
                <p className="text-[11px] text-emerald-500 font-medium">@{payoutUser.login || payoutUser.username}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Ставка:</span>
                <p className="font-bold text-xs text-slate-900 dark:text-white">
                  {(payoutUser.salaryAmount || 50000).toLocaleString('ru-RU')} ₽
                  <span className="text-[10px] font-normal text-slate-400">
                    {' '}
                    /{payoutUser.salaryType === 'PER_SHIFT' ? 'смена' : 'мес'}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                Сумма к выплате (₽) *
              </label>
              <input
                required
                type="number"
                min="1"
                step="any"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(Number(e.target.value))}
                className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-base font-black text-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                Источник списания (метод выплаты) *
              </label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PaymentMethod)}
                className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold text-[16px] sm:text-xs text-slate-900 dark:text-white"
              >
                <option value="CASH">Наличные (из кассы центральной базы)</option>
                <option value="CARD">Перевод на банковскую карту</option>
                <option value="SBP">СБП (Система быстрых платежей)</option>
                <option value="BANK_TRANSFER">Безналичный расчет (с р/с компании)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                Назначение платежа / Комментарий
              </label>
              <input
                type="text"
                placeholder="Аванс за текущий месяц, премия..."
                value={payoutComment}
                onChange={(e) => setPayoutComment(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Расходная операция автоматически отобразится в кассе и будет учтена в P&L отчете.</span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-emerald-500/15">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="min-h-[44px] px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-sm"
              >
                Подтвердить и списать из кассы
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
