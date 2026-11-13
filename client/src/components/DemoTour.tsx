import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, RotateCcw, X } from 'lucide-react';
import { Modal } from './Modal';

const STEPS = [
  ['dashboard', 'Пульс бизнеса', 'Дашборд объединяет показатели парка, аренды, ремонтов и денег.', 'Найдите свободную технику и открытые ремонты. При пустой базе показатели могут быть нулевыми.'],
  ['bikes', 'Парк техники', 'У каждого велосипеда есть модель, инвентарный номер и статус. Статус связан с арендой и ремонтом.', 'Откройте карточку велосипеда. Найдите свободную технику для пробной выдачи.'],
  ['batteries', 'Аккумуляторы', 'АКБ учитываются отдельно: установка в велосипед, выдача дополнительной батареи, возврат на склад.', 'Посмотрите напряжение, статус и привязку аккумулятора к технике.'],
  ['clients', 'Клиенты', 'Карточка клиента связывает его аренды и обращения. Используйте только вымышленные сведения.', 'Создайте учебного клиента или откройте существующего. Не вводите настоящие телефоны, паспорта и документы.'],
  ['rentals', 'Выдача и возврат', 'Мастер выдачи связывает клиента, велосипед, тариф, АКБ и экипировку. Затем можно продлить или закрыть аренду.', 'Откройте оформление аренды. Выберите клиента, свободную технику и тариф. После выдачи проверьте оплату и документы.'],
  ['outfits', 'Экипировка', 'Замки, шлемы и сумки имеют собственный учёт. Выдача и возврат связаны с арендой и залогом.', 'Найдите доступную экипировку и проверьте сумму залога.'],
  ['repairs', 'Мастерская', 'Заказ-наряд объединяет неисправность, работы, запчасти и ответственность за оплату.', 'Изучите создание ремонта и его статусы. При завершении проверьте стоимость и списание деталей.'],
  ['inventory', 'Склад и закупки', 'Склад показывает остатки деталей, а заявки помогают планировать закупки.', 'Найдите остаток запчасти и её цену. Посмотрите заявки на закупку.'],
  ['shop', 'Продажи', 'Магазин связывает розничную продажу, чек, оплату и движение склада.', 'Выберите учебный товар и изучите оформление продажи. После операции проверьте остаток и кассу.'],
  ['finance', 'Касса', 'Доходы от аренды, ремонта и продаж отражаются в финансовых операциях.', 'Найдите платёж после пробной операции. Сравните сумму, назначение и способ оплаты.'],
  ['documents', 'Документы', 'Реестр собирает договоры, акты, чеки и заказ-наряды со связью с исходными операциями.', 'Откройте документ и печатную форму. Если операций пока нет, реестр будет пустым.'],
  ['loyalty', 'Лояльность и завершение', 'Уровни лояльности определяют скидки. История, база знаний и сотрудники дополняют работу команды.', 'Изучите уровни скидок. Затем попробуйте полный цикл: клиент → аренда → оплата → возврат.'],
];
const KEY = 'electream-demo-tour-v1';
function progress(): { status?: string; step?: number } {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}
export function DemoTour({ onNavigate, onOpenRental }: { onNavigate: (tab: string) => void; onOpenRental: () => void }) {
  const [invitation, setInvitation] = useState(() => !progress().status);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(() => { const n = Number(progress().step); return Number.isInteger(n) && n >= 0 && n < STEPS.length ? n : 0; });
  const [collapsed, setCollapsed] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const current = STEPS[step];
  const save = (status: string, index = step) => { try { localStorage.setItem(KEY, JSON.stringify({ status, step: index })); } catch {} };
  const start = (index: number) => { setStep(index); setInvitation(false); setCollapsed(false); setActive(true); onNavigate(STEPS[index][0]); save('started', index); };
  useEffect(() => {
    if (!active || collapsed) return;
    panel.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setCollapsed(true); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [active, collapsed, step]);
  const move = (index: number) => { setStep(index); onNavigate(STEPS[index][0]); save('started', index); };
  const decline = () => { save('declined'); setInvitation(false); };
  return <>
    <Modal
      isOpen={invitation}
      onClose={decline}
      title="Познакомиться с ELECTREAM CRM?"
      subtitle="Интерактивное знакомство с основными разделами"
      maxWidth="md"
      footer={<div className="flex flex-col gap-2 pt-4">
        <button type="button" autoFocus onClick={() => start(0)} className="btn-primary"><GraduationCap className="h-4 w-4 shrink-0" />Начать обучение</button>
        <button type="button" onClick={decline} className="btn-secondary">Посмотреть самостоятельно</button>
      </div>}
    >
      <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        <p>Пройдите интерактивный маршрут: парк, выдача техники, ремонт, продажи и финансы. На каждом шаге можно работать с интерфейсом и пробовать операции.</p>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="mb-1 font-semibold text-slate-900 dark:text-white">Безопасная практика</p>
          <p>Это учебный стенд. Не вводите персональные данные. Обучение всегда доступно по кнопке в нижнем углу.</p>
        </div>
      </div>
    </Modal>
    {!invitation && (!active || collapsed) && <button type="button" onClick={() => active ? setCollapsed(false) : start(step)} className="btn-secondary fixed right-4 bottom-24 md:bottom-5 z-40 shadow-sm" aria-label="Открыть обучение CRM"><GraduationCap className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />{active ? 'Продолжить обучение' : 'Обучение'}</button>}
    {active && !collapsed && <aside ref={panel} tabIndex={-1} aria-label="Обучение CRM" className="contour-card fixed right-3 bottom-24 md:bottom-5 z-40 flex w-[calc(100%-1.5rem)] sm:w-96 max-h-[65dvh] flex-col p-4 sm:p-6 text-sm leading-relaxed text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-emerald-500/15">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><GraduationCap className="h-5 w-5" /></span>
          <div><p className="font-semibold">Обучение CRM</p><p className="text-xs text-slate-500 dark:text-slate-400">Шаг {step + 1} из {STEPS.length}</p></div>
        </div>
        <button type="button" onClick={() => setCollapsed(true)} aria-label="Свернуть подсказку" className="crm-icon-button text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"><X className="h-5 w-5" /></button>
      </div>
      <div className="custom-scrollbar min-h-0 space-y-4 overflow-y-auto py-4">
        <div role="progressbar" aria-valuemin={0} aria-valuenow={step + 1} aria-valuemax={STEPS.length} aria-label="Прогресс обучения" className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-emerald-500/10">
          <div className="h-full rounded-full bg-emerald-500 transition-all motion-reduce:transition-none" style={{ width: `${(step + 1) / STEPS.length * 100}%` }} />
        </div>
        <div><h2 className="mb-2 text-base font-bold leading-tight sm:text-lg dark:text-white">{current[1]}</h2><p className="text-slate-600 dark:text-slate-400">{current[2]}</p></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-emerald-500/20 dark:bg-[#101d17]"><p className="mb-1 font-semibold">Попробуйте</p><p className="text-slate-600 dark:text-slate-400">{current[3]}</p></div>
        <div className="flex flex-col gap-2"><button type="button" className="btn-secondary" onClick={() => onNavigate(current[0])}>Открыть раздел<ArrowRight className="h-4 w-4 shrink-0" /></button>{current[0] === 'rentals' && <button type="button" className="btn-secondary" onClick={() => { setCollapsed(true); onOpenRental(); }}>Оформить аренду</button>}</div>
      </div>
      <div className="shrink-0 space-y-2 border-t border-slate-100 pt-4 dark:border-emerald-500/15">
        <div className="flex items-center justify-between gap-2">
          <button type="button" disabled={step === 0} onClick={() => move(step - 1)} className="btn-secondary"><ArrowLeft className="h-4 w-4 shrink-0" />Назад</button>
          <button type="button" onClick={() => { if (step === STEPS.length - 1) { save('completed', 0); setStep(0); setActive(false); } else move(step + 1); }} className="btn-primary">{step === STEPS.length - 1 ? 'Завершить' : 'Далее'}<ArrowRight className="h-4 w-4 shrink-0" /></button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => start(0)} className="crm-filter-tab gap-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-emerald-500/10"><RotateCcw className="h-3.5 w-3.5 shrink-0" />Начать заново</button>
          <button type="button" onClick={() => { save('paused'); setActive(false); }} className="crm-filter-tab text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-emerald-500/10">Позже</button>
        </div>
      </div>
    </aside>}
  </>;
}
