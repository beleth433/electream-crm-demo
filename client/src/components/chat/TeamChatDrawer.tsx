import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, User, PresenceUser } from '../../types';
import { api } from '../../services/api';
import { getRoleMeta } from './OnlineUsersBadge';
import {
  MessageSquare,
  Send,
  X,
  Trash2,
  Shield,
  Wrench,
  UserCheck,
  Code,
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onlineUsers?: PresenceUser[];
  onNewMessageSent?: () => void;
}

export const TeamChatDrawer: React.FC<TeamChatDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  onlineUsers = [],
  onNewMessageSent,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const data = await api.getChatMessages(100);
      setMessages(data);
    } catch (err: any) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000); // Polling every 5s when open
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      setMessages((prev) => [...prev, sent]);
      setInputText('');
      if (onNewMessageSent) onNewMessageSent();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка отправки сообщения');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить это сообщение из истории чата?')) return;
    try {
      await api.deleteChatMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success('Сообщение удалено');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  const getRoleBadge = (roleTitle?: string) => {
    const t = (roleTitle || '').toLowerCase();
    if (t.includes('мастер') || t.includes('механик') || t.includes('сто') || t.includes('mechanic')) {
      return {
        label: roleTitle || 'Мастер СТО',
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: <Wrench className="w-3 h-3" />,
      };
    }
    if (t.includes('менеджер') || t.includes('manager') || t.includes('администратор')) {
      return {
        label: roleTitle || 'Менеджер',
        color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
        icon: <UserCheck className="w-3 h-3" />,
      };
    }
    if (t.includes('разработчик') || t.includes('developer') || t.includes('admin')) {
      return {
        label: roleTitle || 'Разработчик',
        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        icon: <Code className="w-3 h-3" />,
      };
    }
    return {
      label: roleTitle || 'Команда',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: <Shield className="w-3 h-3" />,
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop (hidden on mobile since drawer is full screen) */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in hidden sm:block"
        onClick={onClose}
      />

      {/* Main Drawer Panel - Full screen on mobile, right slide-over on desktop */}
      <div className="w-full sm:w-[430px] h-[100dvh] bg-white dark:bg-[#09110d] sm:border-l border-slate-200 dark:border-emerald-500/20 shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-emerald-500/20 bg-slate-50/90 dark:bg-[#0c1813] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Командный чат базы</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Оперативная координация смены
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            title="Закрыть чат"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Online Team Roster (Multi-line Wrap, No Scrollbars) */}
        <div className="px-3.5 py-2.5 bg-emerald-500/5 dark:bg-[#060e0a] border-b border-slate-200/80 dark:border-emerald-500/15 flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>В сети ({onlineUsers.length}):</span>
            </div>
            {onlineUsers.length > 0 && (
              <span className="text-[10px] text-slate-400 font-medium normal-case">
                На смене
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {onlineUsers.length === 0 ? (
              <span className="text-[11px] text-slate-400 italic">нет активных сотрудников</span>
            ) : (
              onlineUsers.map((u) => {
                const meta = getRoleMeta(u.roleTitle, u.userRole);
                const isMe = u.userId === currentUser?.id;
                return (
                  <div
                    key={u.userId}
                    title={`${u.userName} (${u.roleTitle || 'Сотрудник'})${isMe ? ' — Вы' : ''}`}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                      isMe
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 shadow-2xs ring-1 ring-emerald-500/20'
                        : 'bg-white dark:bg-[#112219] border border-slate-200 dark:border-emerald-500/25 text-slate-800 dark:text-slate-100 shadow-2xs'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full ${meta.avatarBg} flex items-center justify-center text-[9px] font-black shrink-0 border`}
                    >
                      {u.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-bold">{u.userName}</span>
                    {u.roleTitle && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold border ${meta.badgeColor}`}
                      >
                        {u.roleTitle}
                      </span>
                    )}
                    {isMe && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Вы)</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3.5 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              Загрузка сообщений смены...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Сообщений пока нет</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Напишите первое сообщение команде, передайте смену или оповестите о готовности байка
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = currentUser?.id && msg.senderId === currentUser.id;
              const badge = getRoleBadge(msg.senderRole);
              const timeStr = new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                >
                  {/* Header info */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {isMe ? 'Вы' : msg.senderName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold border ${badge.color}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{timeStr}</span>
                  </div>

                  {/* Message Bubble */}
                  <div className="relative max-w-[88%] sm:max-w-[85%]">
                    <div
                      className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-2xs ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-xs'
                          : 'bg-white dark:bg-[#122119] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-emerald-500/20 rounded-tl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Delete action */}
                    <button
                      type="button"
                      onClick={() => handleDelete(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -right-2 p-1 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-full shadow-md border border-slate-200 dark:border-slate-700"
                      title="Удалить сообщение"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Box (Pinned to Bottom with safe-area padding for mobile) */}
        <div className="p-3 sm:p-3.5 border-t border-slate-200 dark:border-emerald-500/20 bg-white dark:bg-[#0c1813] shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Сообщение для смены..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 min-h-[44px] bg-slate-50 dark:bg-[#122119] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="w-11 h-11 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-md shadow-emerald-500/20 transition shrink-0 active:scale-95"
              title="Отправить сообщение"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-slate-400 mt-1.5 text-center">
            Сообщения сохраняются в общей базе и видны всей команде
          </p>
        </div>
      </div>
    </div>
  );
};
