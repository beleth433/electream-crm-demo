import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import {
  ShieldCheck,
  LogIn,
  Lock,
  User as UserIcon,
  Laptop,
  Smartphone,
  ArrowRight,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

interface TrustedDeviceProfile {
  id: string;
  login: string;
  fullName: string;
  roleTitle?: string;
  role?: string;
  initials: string;
  authorizedAt: string;
  token?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [trustedProfile, setTrustedProfile] = useState<TrustedDeviceProfile | null>(() => {
    try {
      const raw = localStorage.getItem('crm_trusted_device_profile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [showFullLoginForm, setShowFullLoginForm] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      toast.error('Введите логин или email');
      return;
    }
    const cleanPass = password.trim();
    if (!cleanPass) {
      toast.error('Введите пароль');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.login(cleanId, cleanPass, rememberDevice);
      localStorage.setItem('crm_auth_token', res.token);
      localStorage.setItem('crm_auth_user', JSON.stringify(res.user));

      if (rememberDevice) {
        const initials = res.user.fullName
          ? res.user.fullName
              .split(' ')
              .filter(Boolean)
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
          : 'EM';

        const profile: TrustedDeviceProfile = {
          id: res.user.id,
          login: res.user.login || cleanId,
          fullName: res.user.fullName,
          roleTitle: res.user.roleTitle,
          role: res.user.role,
          initials,
          authorizedAt: new Date().toISOString(),
          token: res.trustedDeviceToken,
        };
        localStorage.setItem('crm_trusted_device_profile', JSON.stringify(profile));
        setTrustedProfile(profile);
      } else {
        localStorage.removeItem('crm_trusted_device_profile');
        setTrustedProfile(null);
      }

      toast.success(`Добро пожаловать, ${res.user.fullName}!`);
      onLoginSuccess(res.user);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка входа в систему');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTrustedLogin = async () => {
    if (!trustedProfile) return;
    setIsLoading(true);
    try {
      if (!trustedProfile.token) throw new Error('Требуется подтверждение пароля');
      const res = await api.trustedLogin(trustedProfile.token);
      localStorage.setItem('crm_auth_token', res.token);
      localStorage.setItem('crm_auth_user', JSON.stringify(res.user));
      toast.success(`С возвращением, ${res.user.fullName}!`);
      onLoginSuccess(res.user);
    } catch (err: any) {
      // If auto-login fails, fall back to password form with prefilled login
      setIdentifier(trustedProfile.login);
      setShowFullLoginForm(true);
      toast.info('Требуется подтверждение пароля для входа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgetDevice = () => {
    if (window.confirm('Забыть это устройство? Для следующего входа потребуется полный ввод логина и пароля.')) {
      localStorage.removeItem('crm_trusted_device_profile');
      setTrustedProfile(null);
      setShowFullLoginForm(true);
      setIdentifier('');
      setPassword('');
      toast.info('Привязка к устройству удалена');
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
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
              <p className="text-[11px] font-black tracking-widest uppercase text-slate-500 dark:text-emerald-400 mt-0.5">
                PRO SAMOKAT EDITION
              </p>
            </div>

            {trustedProfile && !showFullLoginForm ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mt-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Доверенное устройство</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold mt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Служебный контур • Только для команды</span>
              </div>
            )}
          </div>

                    {/* DEMO SHOWCASE BANNER (1-CLICK LOGIN) */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 text-center shadow-lg shadow-emerald-500/5">
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>Демо-режим (Портфолио)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Ознакомьтесь со всем функционалом CRM парка в 1 клик без необходимости ручного ввода.
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/25 transition-all active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Войти в демо в 1 клик (Администратор)</span>
            </button>
            <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Логин: <span className="text-emerald-600 dark:text-emerald-400 font-bold">demo</span> • Пароль: <span className="text-emerald-600 dark:text-emerald-400 font-bold">demo</span>
            </div>
          </div>

          {/* MODE 1: Recognized Trusted Device */}
          {trustedProfile && !showFullLoginForm ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-50 to-slate-100 dark:from-emerald-950/30 dark:via-[#0a1610] dark:to-[#0c1c14] border border-emerald-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-emerald-500/20">
                    {trustedProfile.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {trustedProfile.fullName}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
                      {trustedProfile.roleTitle || 'Сотрудник парка'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Логин: @{trustedProfile.login}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickTrustedLogin}
                  disabled={isLoading}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Войти в CRM как {trustedProfile.fullName.split(' ')[0]}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-emerald-500/15 text-xs">
                <button
                  type="button"
                  onClick={() => setShowFullLoginForm(true)}
                  className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold py-1.5 transition-colors"
                >
                  Войти под другим логином
                </button>
                <button
                  type="button"
                  onClick={handleForgetDevice}
                  className="text-rose-500 hover:text-rose-600 font-medium py-1.5 transition-colors"
                >
                  Забыть это устройство
                </button>
              </div>
            </div>
          ) : (
            /* MODE 2: Strict Login Form (New Device or Switch Account) */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Логин или Email
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ваш служебный логин..."
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-[#08120d] border border-slate-200 dark:border-emerald-500/30 rounded-2xl text-base sm:text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-[#08120d] border border-slate-200 dark:border-emerald-500/30 rounded-2xl text-base sm:text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Trust this device checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberDeviceCheck"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label
                  htmlFor="rememberDeviceCheck"
                  className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                >
                  Запомнить это устройство как доверенное
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 mt-2 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-2xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <LogIn className="w-4 h-4 shrink-0" />
                )}
                <span>Войти в систему</span>
              </button>

              {trustedProfile && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFullLoginForm(false)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                  >
                    ← Вернуться к быстрому входу ({trustedProfile.fullName.split(' ')[0]})
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Footer note */}
          <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-emerald-500/60 leading-relaxed">
            Вход разрешён исключительно сотрудникам парка. При неавторизованном доступе обратитесь к руководителю.
          </p>
        </div>
      </div>
    </div>
  );
};
