import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { User, AccessLevel } from '../../types';
import { api } from '../../services/api';
import { Sparkles, Eye, EyeOff, ShieldCheck, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessLevels: AccessLevel[];
  onSuccess: () => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  user,
  accessLevels,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+7 ');
  const [roleTitle, setRoleTitle] = useState('');
  const [accessLevelId, setAccessLevelId] = useState('lvl-manager');
  const [salaryType, setSalaryType] = useState<'MONTHLY' | 'PER_SHIFT' | 'PIECEWORK'>('MONTHLY');
  const [salaryAmount, setSalaryAmount] = useState<number>(50000);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#';
    let result = '';
    for (let i = 0; i < 9; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setShowPassword(true);
  };

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFullName(user.fullName || '');
        setLogin(user.login || user.username || '');
        setPassword(user.password || '');
        setPhone(user.phone || '+7 ');
        setRoleTitle(user.roleTitle || '');
        setAccessLevelId(user.accessLevelId || 'lvl-manager');
        setSalaryType(user.salaryType || 'MONTHLY');
        setSalaryAmount(typeof user.salaryAmount === 'number' ? user.salaryAmount : 0);
        setShowPassword(false);
      } else {
        setFullName('');
        setLogin('');
        setPhone('+7 ');
        setRoleTitle('Менеджер смены');
        setAccessLevelId(accessLevels.find((l) => l.id === 'lvl-manager')?.id || accessLevels[0]?.id || 'lvl-manager');
        setSalaryType('MONTHLY');
        setSalaryAmount(50000);
        generatePassword();
      }
    }
  }, [isOpen, user, accessLevels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Укажите ФИО сотрудника');
      return;
    }

    try {
      setIsSubmitting(true);
      const calculatedRole =
        accessLevelId === 'lvl-owner'
          ? 'ADMIN'
          : selectedLevel?.permissions?.repairs?.canEdit && !selectedLevel?.permissions?.finance?.visible
          ? 'MECHANIC'
          : 'MANAGER';

      if (!login.trim()) {
        toast.error('Укажите логин для входа');
        return;
      }

      if (user) {
        // Update existing user
        await api.updateUser(user.id, {
          fullName: fullName.trim(),
          login: login.trim().toLowerCase(),
          phone: phone.trim(),
          roleTitle: roleTitle.trim(),
          role: calculatedRole,
          accessLevelId,
          salaryAmount,
          salaryType,
          ...(password.trim() ? { password: password.trim() } : {}),
        });
        toast.success(`Данные сотрудника "${fullName}" обновлены`);
      } else {
        // Create new user
        if (!login.trim()) {
          toast.error('Укажите логин для входа');
          return;
        }
        if (!password.trim()) {
          toast.error('Укажите или сгенерируйте пароль');
          return;
        }
        await api.createUser({
          fullName: fullName.trim(),
          login: login.trim().toLowerCase(),
          password: password.trim(),
          phone: phone.trim(),
          roleTitle: roleTitle.trim(),
          role: calculatedRole,
          accessLevelId,
          salaryAmount,
          salaryType,
        });
        toast.success(`Сотрудник "${fullName}" (@${login.trim().toLowerCase()}) успешно добавлен`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения сотрудника');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLevel = accessLevels.find((l) => l.id === accessLevelId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Редактировать сотрудника' : 'Новый сотрудник и учетная запись'}
      subtitle="Настройка логина, пароля, уровня доступа и оклада"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              ФИО сотрудника *
            </label>
            <input
              type="text"
              required
              placeholder="Иванов Петр Сергеевич"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Телефон
            </label>
            <input
              type="text"
              placeholder="+7 (999) 000-00-00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Position / Role Title & Access Level Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Должность в сервисе *
            </label>
            <input
              type="text"
              required
              placeholder="Например: Мастер СТО, Администратор"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Уровень доступа (RBAC) *
            </label>
            <select
              value={accessLevelId}
              onChange={(e) => setAccessLevelId(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            >
              {accessLevels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name} {lvl.isSystem ? '(Системный)' : '(Пользовательский)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedLevel && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 -mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{selectedLevel.description || 'Набор прав для роли'}</span>
          </p>
        )}

        {/* Login & Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-emerald-500/10">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 h-4">
              Логин для входа *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 font-bold">@</span>
              <input
                type="text"
                required
                disabled={Boolean(user && user.login === 'bxleth')}
                placeholder="ivan_manager"
                value={login}
                onChange={(e) => setLogin(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                className="w-full h-11 pl-8 pr-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 disabled:opacity-60"
              />
            </div>
            {Boolean(user && user.login === 'bxleth') && (
              <p className="text-[10px] text-slate-400 mt-1">Логин главного администратора защищен от смены</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 h-4">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                Пароль сотрудника *
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 shrink-0"
                title="Сгенерировать случайный пароль"
              >
                <Sparkles className="w-3 h-3" />
                <span>Сгенерировать</span>
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 pr-10 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Salary Scheme & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-emerald-500/10">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 h-4">
              Схема оплаты
            </label>
            <select
              value={salaryType}
              onChange={(e) => setSalaryType(e.target.value as any)}
              className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            >
              <option value="MONTHLY">Оклад в месяц</option>
              <option value="PER_SHIFT">Ставка за смену</option>
              <option value="PIECEWORK">Сдельная оплата</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 h-4">
              Размер ставки (₽)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={salaryAmount}
              onChange={(e) => {
                const val = e.target.value;
                setSalaryAmount(val === '' ? 0 : Math.max(0, Number(val)));
              }}
              className="w-full h-11 px-3 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm font-black text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-emerald-500/15">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            {isSubmitting ? 'Сохранение...' : user ? 'Сохранить изменения' : 'Создать сотрудника'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
