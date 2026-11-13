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
      const res = await api.demoLogin();
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
        <div className="contour-card p-6 sm:p-8">
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-2">
              <img
                src="/electream-logo.png"
                alt="ELECTREAM"
                className="w-48 h-auto object-contain mx-auto"
              />
            </div>

            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 text-slate-600 dark:text-slate-400 text-xs font-semibold mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Личное учебное пространство • 24 часа</span>
            </div>
          </div>

          {/* DEMO SHOWCASE BANNER (1-CLICK LOGIN) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-900 dark:text-white font-semibold text-sm mb-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>ДЕМО-РЕЖИМ</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Попробуйте аренду, ремонт и продажи на вымышленных данных. Ваши изменения не затронут других посетителей. Не вводите настоящие персональные данные.
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Zap className="w-4 h-4 fill-current" />
              )}
              <span>Открыть личное демо</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
