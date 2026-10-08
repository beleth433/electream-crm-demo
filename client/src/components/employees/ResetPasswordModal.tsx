import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { User } from '../../types';
import { api } from '../../services/api';
import { KeyRound, Sparkles, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setIsCopied(false);
  };

  useEffect(() => {
    if (isOpen) {
      generatePassword();
      setShowPassword(true);
      setIsCopied(false);
    }
  }, [isOpen, user]);

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setIsCopied(true);
    toast.success('Пароль скопирован в буфер обмена');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!password.trim()) {
      toast.error('Введите новый пароль');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.updateUser(user.id, { password: password.trim() });
      toast.success(`Пароль для @${user.login || user.username} успешно обновлен!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления пароля');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Сброс и выдача нового пароля"
      subtitle={`Сотрудник: ${user.fullName} (@${user.login || user.username})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Новый пароль учетной записи *
          </label>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              className="w-full h-11 px-3 pr-20 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-[16px] sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                title={showPassword ? 'Скрыть' : 'Показать'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors"
                title="Скопировать"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={generatePassword}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#14231c] dark:hover:bg-[#1a2d24] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-emerald-500/20 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Сгенерировать случайный пароль</span>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
          Сохраните и передайте пароль сотруднику лично или через Telegram. После сохранения старый пароль перестанет действовать.
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-emerald-500/15">
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
            className="min-h-[44px] px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isSubmitting ? 'Сохранение...' : 'Установить новый пароль'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
