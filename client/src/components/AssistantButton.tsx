import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Send, Copy, CheckCircle2, Loader2, Monitor, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { api } from '../services/api';

const statuses = { QUEUED: 'Ожидает локальный компьютер', PROCESSING: 'Модель готовит предложение', READY: 'Предложение готово', ERROR: 'Нужно исправить запрос', APPLIED: 'Сохранено в CRM', CANCELLED: 'Отменено' };
const moduleNames = { clients: 'Клиенты', bikes: 'Велосипеды', batteries: 'Аккумуляторы' };
export const AssistantButton: React.FC<{ userId: string; onOpenModule: (module: string) => void }> = ({ userId, onOpenModule }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'commands' | 'tasks' | 'connection'>('commands');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: number } | null>(null);
  const request = useRef<{ id: string; text: string } | null>(null);
  const query = useQueryClient();
  const tasks = useQuery({ queryKey: ['assistant-tasks', userId], queryFn: api.getAssistantTasks, refetchInterval: 15000 });
  const status = useQuery({ queryKey: ['assistant-status', userId], queryFn: api.getAssistantStatus, enabled: open, refetchInterval: open ? 3000 : false });
  const refresh = () => { query.invalidateQueries({ queryKey: ['assistant-status', userId] }); query.invalidateQueries({ queryKey: ['assistant-tasks', userId] }); };
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try { await action(); refresh(); } catch (e: any) { toast.error(e.message || 'Не удалось выполнить действие'); }
    finally { setBusy(false); }
  };
  const data = status.data;
  const count = tasks.data?.length || 0;
  const control = 'min-h-11 rounded-xl border border-slate-200 dark:border-emerald-500/20 px-3 py-2 text-xs font-semibold disabled:opacity-50';
  const input = 'w-full min-w-0 rounded-xl border border-slate-200 dark:border-emerald-500/20 bg-slate-50 dark:bg-[#101d17] p-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500';
  return <>
    <button type="button" onClick={() => setOpen(true)} title="Локальный ИИ-помощник и незавершённые данные" className="relative min-h-11 min-w-11 flex items-center justify-center gap-1.5 rounded-xl px-2 sm:px-3 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
      <Bot className="w-4 h-4 shrink-0" /><span className="hidden lg:inline">Помощник</span>
      {count > 0 && <span className="absolute right-0 top-0 rounded-full bg-amber-400 px-1 text-[10px] leading-4 text-slate-950">{count}</span>}
    </button>
    {createPortal(<Modal isOpen={open} onClose={() => setOpen(false)} title="Локальный помощник" subtitle="Продиктуйте команду, проверьте предложение и подтвердите изменения" maxWidth="3xl" mobileFullscreen>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          {([['commands', 'Команды', Bot], ['tasks', `Дополнить данные${count ? ' · ' + count : ''}`, ListTodo], ['connection', 'Компьютер', Monitor]] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setTab(id)} className={`${control} flex items-center gap-1.5 ${tab === id ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}><Icon className="w-4 h-4" />{label}</button>)}
        </div>
        {status.isError && <p role="alert" className="text-rose-600">{status.error.message}</p>}
        {status.isPending && <p className="text-slate-500">Загрузка…</p>}
        {tab === 'commands' && <>
          <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs text-slate-600 dark:text-slate-300">
            Пилот: клиенты, добавление велосипедов и АКБ по существующим моделям. Продажи, аренда и касса пока оформляются в своих разделах. Модель должна быть запущена на подключённом компьютере.
          </div>
          {!data?.devices.length && <button type="button" onClick={() => setTab('connection')} className={`${control} bg-amber-500/10 text-amber-700 dark:text-amber-300 w-full`}>Сначала подключите компьютер</button>}
          <form onSubmit={e => { e.preventDefault(); run(async () => {
            const clean = text.trim();
            if (!request.current || request.current.text !== clean) request.current = { id: crypto.randomUUID(), text: clean };
            await api.submitAssistant(request.current.id, clean);
            request.current = null; setText('');
          }); }} className="space-y-2">
            <label htmlFor="assistant-command" className="block font-semibold">Что добавить или изменить?</label>
            <textarea id="assistant-command" value={text} onChange={e => setText(e.target.value)} rows={4} minLength={3} maxLength={8000} required className={input} placeholder="Добавь три велосипеда Minako Monster по 45 000 рублей за каждый…" />
            <p className="text-xs text-slate-500">Можно диктовать сюда вашей программой транскрибации. Встроенного распознавания голоса пока нет.</p>
            <button type="submit" disabled={busy || !data?.devices.length || text.trim().length < 3} className={`${control} flex items-center gap-2 bg-emerald-500 text-slate-950 border-emerald-500`}><Send className="w-4 h-4" />Подготовить изменения</button>
          </form>
          <div className="space-y-3">
            {data?.jobs.map(job => <article key={job.id} className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-emerald-500/20 space-y-2 break-words [overflow-wrap:anywhere]">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${job.status === 'APPLIED' ? 'bg-emerald-500/10 text-emerald-600' : job.status === 'ERROR' ? 'bg-rose-500/10 text-rose-600' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>{['QUEUED', 'PROCESSING'].includes(job.status) && <Loader2 className="w-3 h-3 animate-spin" />}{statuses[job.status]}</span><time className="text-[11px] text-slate-500">{new Date(job.createdAt).toLocaleString('ru-RU')}</time></div>
              <p className="text-xs text-slate-500 whitespace-pre-wrap">{job.text}</p>
              {job.summary && <p className="font-semibold">{job.summary}</p>}
              {!!job.preview?.length && <ul className="list-disc pl-5 space-y-1 text-xs">{job.preview.map((line, i) => <li key={i}>{line}</li>)}</ul>}
              {!!job.warnings?.length && <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1"><p className="font-bold">После сохранения нужно дополнить:</p>{job.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>}
              {!!job.questions.length && <div className="rounded-lg bg-sky-500/10 p-3 text-xs space-y-1"><p className="font-bold">Нужно уточнить перед сохранением:</p>{job.questions.map((q, i) => <p key={i}>{q}</p>)}</div>}
              {job.error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{job.error}</p>}
              {job.results && <p className="text-xs text-emerald-700 dark:text-emerald-400">{job.results.map(r => r.label).join(', ')}</p>}
              <div className="flex flex-wrap gap-2">
                {job.canApply && <button type="button" disabled={busy} onClick={() => run(async () => { await api.applyAssistant(job.id); toast.success('Изменения сохранены в CRM'); })} className={`${control} bg-emerald-500 text-slate-950 border-emerald-500`}>Подтвердить и сохранить</button>}
                {['READY', 'ERROR'].includes(job.status) && <button type="button" disabled={busy} title="Отменить прежнее предложение и подготовить уточнённое" onClick={() => run(async () => { await api.cancelAssistant(job.id); setText(job.text + '\nУточнение: '); document.getElementById('assistant-command')?.focus(); })} className={control}>Уточнить запрос</button>}
                {['QUEUED', 'PROCESSING', 'READY', 'ERROR'].includes(job.status) && <button type="button" disabled={busy} onClick={() => run(() => api.cancelAssistant(job.id))} className={`${control} text-slate-500`}>Отменить</button>}
              </div>
            </article>)}
          </div>
        </>}
        {tab === 'tasks' && <div className="space-y-3">
          <p className="text-xs text-slate-500">Задачи остаются здесь до заполнения полей. Фактическую закупочную цену нужно дополнительно подтвердить кнопкой «Проверено».</p>
          {tasks.isError && <p role="alert" className="text-rose-600">{tasks.error.message}</p>}
          {!count && !tasks.isPending && !tasks.isError && <p className="p-4 text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />Нет незавершённых данных помощника</p>}
          {tasks.data?.map(task => <article key={task.id} className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 break-words [overflow-wrap:anywhere]">
            <div className="min-w-0"><p className="font-semibold">{task.label}</p><p className="text-xs text-slate-600 dark:text-slate-400">{task.title}</p></div>
            <div className="flex gap-2 shrink-0"><button type="button" onClick={() => { onOpenModule(task.module); setOpen(false); }} className={control}>{moduleNames[task.module]}</button>{task.field === 'purchasePrice' && <button type="button" disabled={busy} onClick={() => run(() => api.resolveAssistantTask(task.id))} className={`${control} text-emerald-600`}>Проверено</button>}</div>
          </article>)}
        </div>}
        {tab === 'connection' && <div className="space-y-4">
          <p className="text-sm">Запустите локальную программу на компьютере с Ollama. Затем откройте её настройки и введите адрес этой CRM и одноразовый код.</p>
          <p className="text-xs text-slate-500">Адрес CRM: <span className="break-all select-all font-mono">{new URL((import.meta as any).env?.VITE_API_URL || window.location.origin, window.location.origin).origin}</span></p>
          <a href="http://127.0.0.1:47831" target="_blank" rel="noreferrer" className={`${control} inline-flex items-center text-emerald-600`}>Открыть локальную программу</a>
          <p className="text-xs text-slate-500">Если программа ещё не установлена: в папке проекта запустите <code>npm run assistant:local</code>. Для отдельного компьютера см. инструкцию <code>local-assistant/README.md</code>.</p>
          <button type="button" disabled={busy} onClick={() => run(async () => { setPairing(await api.pairAssistant()); })} className={`${control} block bg-emerald-500 text-slate-950 border-emerald-500`}>Получить код подключения</button>
          {pairing && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2"><p className="text-xs text-slate-500">Действует до {new Date(pairing.expiresAt).toLocaleTimeString('ru-RU')}. Даёт доступ к предложениям от вашего имени; передавайте только своей локальной программе.</p><code className="block text-sm break-all select-all">{pairing.code}</code><button type="button" className={`${control} flex items-center gap-2`} onClick={() => run(async () => { await navigator.clipboard.writeText(pairing.code); toast.success('Код скопирован'); })}><Copy className="w-4 h-4" />Скопировать</button></div>}
          <div className="space-y-2">{data?.devices.map(device => <div key={device.id} className="p-3 rounded-xl border border-slate-200 dark:border-emerald-500/20 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-semibold break-all">{device.name}</p><p className="text-xs text-slate-500">{device.lastSeenAt ? `Последняя связь: ${new Date(device.lastSeenAt).toLocaleString('ru-RU')}` : 'Ожидаем первый запуск'}</p></div><button type="button" disabled={busy} onClick={() => run(() => api.revokeAssistant(device.id))} className={`${control} text-rose-600 shrink-0`}>Отключить</button></div>)}</div>
        </div>}
      </div>
    </Modal>, document.body)}
  </>;
};
