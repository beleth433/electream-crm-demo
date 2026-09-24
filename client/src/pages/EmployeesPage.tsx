import React, { useState, useEffect } from 'react';
import { Employee, PaymentMethod } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import {
  Users,
  Plus,
  Banknote,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal: Add/Edit Employee
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    role: '',
    salaryType: 'MONTHLY' as 'MONTHLY' | 'PER_SHIFT' | 'PIECEWORK',
    salaryAmount: 50000,
    status: 'ACTIVE' as 'ACTIVE' | 'ON_LEAVE' | 'DISMISSED',
    notes: '',
  });

  // Modal: Payout Salary
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutEmployee, setPayoutEmployee] = useState<Employee | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number>(30000);
  const [payoutMethod, setPayoutMethod] = useState<PaymentMethod>('CASH');
  const [payoutComment, setPayoutComment] = useState('');

  const loadData = () => {
    setIsLoading(true);
    api
      .getEmployees()
      .then(setEmployees)
      .catch((err) => toast.error('Ошибка загрузки сотрудников: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      fullName: '',
      phone: '+7 ',
      email: '',
      role: '',
      salaryType: 'MONTHLY',
      salaryAmount: 50000,
      status: 'ACTIVE',
      notes: '',
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.fullName,
      phone: emp.phone,
      email: emp.email || '',
      role: emp.role,
      salaryType: emp.salaryType,
      salaryAmount: emp.salaryAmount,
      status: emp.status,
      notes: emp.notes || '',
    });
    setIsFormModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, formData);
        toast.success(`Сотрудник "${formData.fullName}" обновлен`);
      } else {
        await api.createEmployee(formData);
        toast.success(`Сотрудник "${formData.fullName}" добавлен в штат`);
      }
      setIsFormModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения');
    }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (window.confirm(`Вы действительно хотите удалить сотрудника "${emp.fullName}" из системы?`)) {
      try {
        await api.deleteEmployee(emp.id);
        toast.success(`Сотрудник "${emp.fullName}" удален`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления');
      }
    }
  };

  const handleOpenPayoutModal = (emp: Employee) => {
    setPayoutEmployee(emp);
    const defaultAmount =
      emp.salaryType === 'MONTHLY'
        ? Math.round(emp.salaryAmount / 2)
        : emp.salaryAmount;
    setPayoutAmount(defaultAmount);
    setPayoutComment(
      emp.salaryType === 'MONTHLY'
        ? 'Аванс за текущий месяц'
        : emp.salaryType === 'PER_SHIFT'
        ? 'Оплата отработанных смен'
        : 'Оплата за выполненную работу / заказ'
    );
    setPayoutMethod('CASH');
    setIsPayoutModalOpen(true);
  };

  const handleExecutePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutEmployee) return;

    try {
      const res = await api.payoutSalary(payoutEmployee.id, {
        amount: payoutAmount,
        method: payoutMethod,
        comment: payoutComment,
      });
      toast.success(res.message || 'Выплата успешно проведена!');
      setIsPayoutModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка проведения выплаты');
    }
  };

  // Aggregated KPIs
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE').length;
  const totalMonthlyPayroll = employees.reduce((sum, e) => {
    if (e.status !== 'ACTIVE') return sum;
    return sum + (e.salaryType === 'MONTHLY' ? e.salaryAmount : e.salaryType === 'PER_SHIFT' ? e.salaryAmount * 22 : e.salaryAmount);
  }, 0);
  const totalPaidThisMonth = employees.reduce((sum, e) => sum + (e.thisMonthPaid || 0), 0);

  const getRoleBadgeStyle = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('мастер') || r.includes('механик') || r.includes('сто')) {
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
    if (r.includes('менеджер') || r.includes('управляющ') || r.includes('админ')) {
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Штат сотрудников и фонд оплаты труда
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Управление ролями, фиксированные оклады, сменные ставки и ручные выплаты зарплат в кассу
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Добавить сотрудника
        </button>
      </div>

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
            {totalEmployees} <span className="text-xs font-normal text-slate-400">чел.</span>
          </div>
          <p className="text-[11px] text-emerald-500 mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {activeEmployees} на смене / в строю
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
            {totalMonthlyPayroll.toLocaleString('ru-RU')} ₽
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Оклады + прогноз 22 смен</p>
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
              Статус учета
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
            Связь с P&L кассы
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Каждая выплата напрямую уменьшает чистую маржу базы
          </p>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="p-5 contour-card flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all"
          >
            <div>
              {/* Header card */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {emp.fullName}
                  </h3>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(
                      emp.role
                    )}`}
                  >
                    {emp.role}
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    emp.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : emp.status === 'ON_LEAVE'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {emp.status === 'ACTIVE'
                    ? 'Работает'
                    : emp.status === 'ON_LEAVE'
                    ? 'В отпуске'
                    : 'Уволен'}
                </span>
              </div>

              {/* Contact Info */}
              <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a href={`tel:${emp.phone}`} className="hover:text-emerald-400 transition-colors">
                    {emp.phone}
                  </a>
                </div>
                {emp.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{emp.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>В штате с: {new Date(emp.hiredAt).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>

              {emp.notes && (
                <p className="mt-3 p-2 rounded-lg bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/10 text-[11px] text-slate-500 dark:text-slate-400 italic">
                  {emp.notes}
                </p>
              )}
            </div>

            {/* Salary & Payout Block */}
            <div className="pt-3 border-t border-slate-200 dark:border-emerald-500/10 space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/15">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {emp.salaryType === 'MONTHLY'
                      ? 'Оклад в месяц'
                      : emp.salaryType === 'PER_SHIFT'
                      ? 'Ставка за смену'
                      : 'Сдельная оплата'}:
                  </span>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {emp.salaryAmount.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Выплачено за месяц:
                  </span>
                  <p className="text-sm font-bold text-emerald-500">
                    {(emp.thisMonthPaid || 0).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenPayoutModal(emp)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  <Banknote className="w-4 h-4" />
                  Выплатить з/п
                </button>
                <button
                  onClick={() => handleOpenEditModal(emp)}
                  title="Редактировать сотрудника"
                  className="p-2 border border-slate-200 dark:border-emerald-500/20 text-slate-600 dark:text-slate-300 hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteEmployee(emp)}
                  title="Удалить сотрудника"
                  className="p-2 border border-slate-200 dark:border-rose-500/20 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create / Edit Employee */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingEmployee ? 'Редактировать сотрудника' : 'Новый сотрудник в штат'}
        subtitle="Владелец CRM сам определяет роль, ставку и график оплаты"
        maxWidth="md"
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              ФИО сотрудника *
            </label>
            <input
              required
              type="text"
              placeholder="Смирнов Алексей Викторович"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem]">
                Телефон *
              </label>
              <input
                required
                type="text"
                placeholder="+7 (999) 000-00-00"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem]">
                Email / Telegram
              </label>
              <input
                type="text"
                placeholder="tech@ebike-crm.ru"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Role (free-form text input) */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem]">
              Должность / Роль в сервисе *
            </label>
            <input
              required
              type="text"
              placeholder="Например: Механик, Мастер СТО, Администратор..."
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold text-slate-900 dark:text-white"
            />
          </div>

          {/* Salary Type & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem]">
                Схема оплаты *
              </label>
              <select
                value={formData.salaryType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salaryType: e.target.value as 'MONTHLY' | 'PER_SHIFT' | 'PIECEWORK',
                  })
                }
                className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-medium text-slate-900 dark:text-white"
              >
                <option value="MONTHLY">Фиксированный оклад (в месяц)</option>
                <option value="PER_SHIFT">Ставка за смену (выход)</option>
                <option value="PIECEWORK">Сдельная (за объем / выполненную работу)</option>
              </select>
            </div>
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold text-xs min-h-[1.25rem]">
                {formData.salaryType === 'MONTHLY'
                  ? 'Сумма оклада (₽) *'
                  : formData.salaryType === 'PER_SHIFT'
                  ? 'Ставка за смену (₽) *'
                  : 'Базовая ставка (₽) *'}
              </label>
              <input
                required
                type="number"
                min="0"
                step="500"
                value={formData.salaryAmount}
                onChange={(e) =>
                  setFormData({ ...formData, salaryAmount: Number(e.target.value) })
                }
                className="w-full h-10 px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              Статус занятости
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as 'ACTIVE' | 'ON_LEAVE' | 'DISMISSED',
                })
              }
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-slate-900 dark:text-white"
            >
              <option value="ACTIVE">Работает / В строю</option>
              <option value="ON_LEAVE">В отпуске / Больничный</option>
              <option value="DISMISSED">Уволен / Архив</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              Заметки / Обязанности
            </label>
            <input
              type="text"
              placeholder="Зона ответственности, график 2/2, особенности..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-emerald-500/15">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-sm"
            >
              {editingEmployee ? 'Сохранить изменения' : 'Принять в штат'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Payout Salary / Advance */}
      <Modal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        title="Выплата зарплаты / аванса"
        subtitle="Списание средств из кассы компании в счет оплаты труда"
        maxWidth="md"
      >
        {payoutEmployee && (
          <form onSubmit={handleExecutePayout} className="space-y-4 text-xs">
            {/* Employee Summary Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Получатель:</span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {payoutEmployee.fullName}
                </h4>
                <p className="text-[11px] text-emerald-500 font-medium">{payoutEmployee.role}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Ставка:</span>
                <p className="font-bold text-xs text-slate-900 dark:text-white">
                  {payoutEmployee.salaryAmount.toLocaleString('ru-RU')} ₽
                  <span className="text-[10px] font-normal text-slate-400">
                    {' '}
                    /{payoutEmployee.salaryType === 'MONTHLY'
                      ? 'мес'
                      : payoutEmployee.salaryType === 'PER_SHIFT'
                      ? 'смена'
                      : 'сдельно'}
                  </span>
                </p>
              </div>
            </div>

            {/* Payout Amount */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                Сумма к выплате (₽) *
              </label>
              <input
                required
                type="number"
                min="100"
                step="100"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-base font-black text-emerald-500"
              />
              {/* Quick suggestions */}
              <div className="flex gap-2 mt-1.5">
                {[10000, 20000, 35000, payoutEmployee.salaryAmount].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPayoutAmount(amt)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/10 text-slate-600 dark:text-slate-300 hover:border-emerald-500"
                  >
                    {amt.toLocaleString('ru-RU')} ₽
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                Источник списания (метод выплаты) *
              </label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold text-slate-900 dark:text-white"
              >
                <option value="CASH">Наличные (из кассы центральной базы)</option>
                <option value="CARD">Перевод на банковскую карту</option>
                <option value="SBP">СБП (Система быстрых платежей)</option>
                <option value="BANK_TRANSFER">Безналичный расчет (с р/с компании)</option>
              </select>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                Назначение платежа / Комментарий
              </label>
              <input
                type="text"
                placeholder="Аванс за 1-ю половину месяца, премия за переработку..."
                value={payoutComment}
                onChange={(e) => setPayoutComment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>
                Расходная операция автоматически отобразится в разделе «Касса и финансы» и будет
                учтена в P&L отчете.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-emerald-500/15">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-sm"
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
