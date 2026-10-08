import React from 'react';
import { PresenceUser } from '../../types';
import { Wrench, UserCheck, Code, Shield, Users } from 'lucide-react';

export const getRoleMeta = (roleTitle?: string, userRole?: string) => {
  const combined = `${roleTitle || ''} ${userRole || ''}`.toLowerCase();
  if (
    combined.includes('мастер') ||
    combined.includes('механик') ||
    combined.includes('сто') ||
    combined.includes('mechanic')
  ) {
    return {
      label: roleTitle || 'Мастер СТО',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      avatarBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      dotColor: 'bg-amber-500',
      Icon: Wrench,
    };
  }
  if (
    combined.includes('менеджер') ||
    combined.includes('manager') ||
    combined.includes('администратор')
  ) {
    return {
      label: roleTitle || 'Менеджер',
      badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
      avatarBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
      dotColor: 'bg-sky-500',
      Icon: UserCheck,
    };
  }
  if (
    combined.includes('разработчик') ||
    combined.includes('developer') ||
    combined.includes('admin') ||
    combined.includes('bxleth')
  ) {
    return {
      label: roleTitle || 'Разработчик',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      avatarBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      dotColor: 'bg-purple-500',
      Icon: Code,
    };
  }
  if (
    combined.includes('владелец') ||
    combined.includes('owner') ||
    combined.includes('директор')
  ) {
    return {
      label: roleTitle || 'Владелец',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      avatarBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      dotColor: 'bg-emerald-500',
      Icon: Shield,
    };
  }
  return {
    label: roleTitle || 'Команда',
    badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    avatarBg: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    dotColor: 'bg-slate-500',
    Icon: Users,
  };
};

interface NavbarOnlineUsersProps {
  onlineUsers: PresenceUser[];
  currentUserId?: string;
  onOpenChat: () => void;
}

export const NavbarOnlineUsers: React.FC<NavbarOnlineUsersProps> = ({
  onlineUsers,
  currentUserId,
  onOpenChat,
}) => {
  const count = onlineUsers.length;

  return (
    <div className="relative flex items-center">
      {/* Desktop view: Individual pills with user names and roles */}
      <div className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-[#0c1813]/90 backdrop-blur-xs border border-slate-200 dark:border-emerald-500/20 rounded-xl shadow-2xs">
        <button
          type="button"
          onClick={onOpenChat}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-slate-600 dark:text-emerald-400/90 hover:text-emerald-600 dark:hover:text-emerald-300 transition shrink-0"
          title="Нажмите, чтобы открыть чат смены"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-emerald-400/70">
            В сети:
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          {count === 0 ? (
            <span className="text-[11px] text-slate-400 px-1.5 italic">нет активных</span>
          ) : (
            <>
              {onlineUsers.slice(0, 3).map((u) => {
                const meta = getRoleMeta(u.roleTitle, u.userRole);
                const isMe = u.userId === currentUserId;
                return (
                  <button
                    key={u.userId}
                    type="button"
                    onClick={onOpenChat}
                    title={`${u.userName} (${u.roleTitle || 'Сотрудник'})${isMe ? ' — Вы' : ''}. Нажмите для чата`}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#112219] border border-slate-200/90 dark:border-emerald-500/30 text-xs shadow-2xs hover:border-emerald-500 hover:shadow-xs hover:scale-[1.02] active:scale-95 transition-all text-left"
                  >
                    <div
                      className={`w-4 h-4 rounded-full ${meta.avatarBg} flex items-center justify-center text-[9px] font-black shrink-0 border`}
                    >
                      {u.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100 truncate max-w-[90px] sm:max-w-[120px]">
                      {u.userName}
                    </span>
                    {u.roleTitle && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold shrink-0 border ${meta.badgeColor}`}
                      >
                        {u.roleTitle}
                      </span>
                    )}
                  </button>
                );
              })}

              {count > 3 && (
                <button
                  type="button"
                  onClick={onOpenChat}
                  className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-emerald-950/60 border border-slate-300 dark:border-emerald-500/30 text-[10px] font-black text-slate-700 dark:text-emerald-300 hover:bg-slate-300 dark:hover:bg-emerald-900 transition"
                  title={`Еще ${count - 3} пользователей в сети. Нажмите для чата`}
                >
                  +{count - 3}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Medium screens (Tablet / sm/md): Compact Pill with 1st user & count */}
      <div className="hidden sm:flex lg:hidden items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenChat}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#112219] border border-slate-200 dark:border-emerald-500/20 text-xs font-bold text-slate-700 dark:text-emerald-400 hover:border-emerald-500 active:scale-95 transition shadow-2xs"
          title="Пользователи в сети. Нажмите для перехода в чат"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          {count > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[11px] text-slate-900 dark:text-white truncate max-w-[100px]">
                {onlineUsers[0]?.userName}
              </span>
              {count > 1 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-black">
                  +{count - 1}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">0 онлайн</span>
          )}
        </button>
      </div>

      {/* Mobile view (< 640px): Super compact touch-friendly badge */}
      <div className="sm:hidden flex items-center">
        <button
          type="button"
          onClick={onOpenChat}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#112219] border border-slate-200 dark:border-emerald-500/20 text-xs font-bold text-slate-700 dark:text-emerald-400 active:scale-95 transition min-h-[38px]"
          title="Пользователи онлайн (нажмите для чата)"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
            {count} в сети
          </span>
        </button>
      </div>
    </div>
  );
};
