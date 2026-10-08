import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChatMessage, User, PresenceUser } from '../../types';
import { api } from '../../services/api';
import { getRoleMeta } from './OnlineUsersBadge';
import {
  MessageSquare,
  Send,
  ArrowUpRight,
  Wrench,
  UserCheck,
  Code,
  Shield,
  Clock,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardChatWidgetProps {
  currentUser?: User | null;
  onOpenFullChat: () => void;
}

export const DashboardChatWidget: React.FC<DashboardChatWidgetProps> = ({
  currentUser,
  onOpenFullChat,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Online users query
  const { data: onlineUsers = [] } = useQuery<PresenceUser[]>({
    queryKey: ['onlineUsers'],
    queryFn: api.getOnlineUsers,
    refetchInterval: 10000,
  });

  const loadRecentMessages = async () => {
    try {
      const data = await api.getChatMessages(5);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load recent chat messages', err);
    }
  };

  useEffect(() => {
    loadRecentMessages();
    const interval = setInterval(loadRecentMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    try {
      setIsSending(true);
      const senderName =
        currentUser?.fullName ||
        currentUser?.username ||
        currentUser?.login ||
        'Сотрудник базы';
      const senderRole = currentUser?.roleTitle || currentUser?.role || 'TEAM';
      const senderId = currentUser?.id || 'u-current';

      const sent = await api.sendChatMessage({
        text,
        senderId,
        senderName,
        senderRole,
      });

      setMessages((prev) => [...prev.slice(-4), sent]);
      setInputText('');
      toast.success('Сообщение отправлено в командный чат');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка отправки сообщения');
    } finally {
      setIsSending(false);
    }
  };

  const getRoleIcon = (roleTitle?: string) => {
    const t = (roleTitle || '').toLowerCase();
    if (t.includes('мастер') || t.includes('механик') || t.includes('сто') || t.includes('mechanic')) {
      return <Wrench className="w-3 h-3 text-amber-500" />;
    }
    if (t.includes('менеджер') || t.includes('manager') || t.includes('администратор')) {
      return <UserCheck className="w-3 h-3 text-sky-500" />;
    }
    if (t.includes('разработчик') || t.includes('developer') || t.includes('admin')) {
      return <Code className="w-3 h-3 text-purple-500" />;
    }
    return <Shield className="w-3 h-3 text-emerald-500" />;
  };

  return (
    <div className="contour-card p-4 space-y-3 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-emerald-500/15">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Оперативный чат базы</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400">Сообщения смены и координация</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFullChat}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
        >
          <span>Открыть весь чат</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Active Team Strip (Multi-line wrap, no scrollbar) */}
      {onlineUsers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 py-1.5 px-2.5 bg-emerald-500/5 dark:bg-[#07100b] rounded-xl border border-slate-100 dark:border-emerald-500/15">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 shrink-0 mr-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>В сети ({onlineUsers.length}):</span>
          </div>
          {onlineUsers.map((u) => {
            const meta = getRoleMeta(u.roleTitle, u.userRole);
            return (
              <div
                key={u.userId}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-[#112219] border border-slate-200 dark:border-emerald-500/20 text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{u.userName}</span>
                {u.roleTitle && (
                  <span className={`text-[8px] px-1 py-0.2 rounded border font-semibold ${meta.badgeColor}`}>
                    {u.roleTitle}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Messages list */}
      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-xs italic">
            Сообщений в чате пока нет. Напишите первое сообщение команде!
          </div>
        ) : (
          messages.slice(-4).map((msg) => {
            const isMe = currentUser?.id && msg.senderId === currentUser.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1813] border border-slate-100 dark:border-emerald-500/10 text-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-[11px]">
                    {getRoleIcon(msg.senderRole)}
                    <span>{isMe ? 'Вы' : msg.senderName}</span>
                    <span className="text-[9px] font-normal text-slate-400">
                      ({msg.senderRole || 'Сотрудник'})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{timeStr}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed break-words">
                  {msg.text}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Input Bar */}
      <form onSubmit={handleQuickSend} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          placeholder="Быстрое сообщение в смену..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3 py-2 min-h-[38px] bg-slate-50 dark:bg-[#122119] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-10 h-10 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-md shadow-emerald-500/20 transition shrink-0"
          title="Отправить сообщение"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
