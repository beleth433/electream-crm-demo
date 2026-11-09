import React, { useState } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import {
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('crm_trusted_device_profile');
      const res = await api.login('demo', 'demo', false);
      localStorage.setItem('crm_auth_token', res.token);
      localStorage.setItem('crm_auth_user', JSON.stringify(res.user));
      toast.success('Демо-доступ активирован! Добро пожаловать.');
      onLoginSuccess(res.user);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка входа в демо-режим');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50/30 dark:from-[#060c09] dark:via-[#09140e] dark:to-[#07130b] text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md">
        {/* Brand Container */}
        <div className="bg-white dark:bg-[#0c1813] border border-slate-200/90 dark:border-emerald-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/5 backdrop-blur-md">
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-2">
              <img
                src="/electream-logo.png"
                alt="ELECTREAM"
                className="w-48 h-auto object-contain mx-auto"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Служебный контур • Только для команды</span>
            </div>
          </div>

          {/* DEMO SHOWCASE BANNER (1-CLICK LOGIN) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 text-center shadow-lg shadow-emerald-500/5">
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>ДЕМО-РЕЖИМ</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Ознакомьтесь со всем функционалом CRM парка в 1 клик без необходимости ручного ввода.
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/25 transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Zap className="w-4 h-4 fill-current" />
              )}
              <span>Войти в демо в 1 клик (Администратор)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
