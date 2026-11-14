import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { insightsRequest, track, visitorId } from '../services/demoInsights';

export function DemoFeedback() {
  const [open,setOpen] = useState(false);
  const [fit,setFit] = useState('');
  const [comment,setComment] = useState('');
  const [contact,setContact] = useState('');
  const [consent,setConsent] = useState(false);
  const [busy,setBusy] = useState(false);
  const [sent,setSent] = useState(false);
  const [error,setError] = useState('');
  const [id,setId] = useState(() => crypto.randomUUID());
  const close = () => { setOpen(false); try { localStorage.setItem('electream-feedback-offered','1'); } catch {} };
  useEffect(() => {
    const show = () => { setOpen(true); };
    const offer = () => { try { if (localStorage.getItem('electream-feedback-offered')) return; } catch {} setOpen(true); };
    window.addEventListener('demo:feedback',show);
    window.addEventListener('demo:tour-completed',offer);
    return () => { window.removeEventListener('demo:feedback',show); window.removeEventListener('demo:tour-completed',offer); };
  },[]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      await insightsRequest('feedback',{ id,visitorId:visitorId(),fit,comment,contact,consent });
      setSent(true); try { localStorage.setItem('electream-feedback-offered','1'); } catch {}
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return <Modal isOpen={open} onClose={close} title={sent?'Спасибо за обратную связь':'Как вам ELECTREAM CRM?'} subtitle="Опрос необязательный — кнопка «Оставить отзыв» всегда рядом с обучением" maxWidth="md">
    {sent ? <div className="space-y-4"><p>Ответ сохранён. Он поможет выбрать следующие улучшения.</p><button className="btn-secondary" onClick={() => { setSent(false); setFit(''); setComment(''); setContact(''); setConsent(false); setId(crypto.randomUUID()); }}>Написать ещё</button></div> : <form onSubmit={submit} className="space-y-4 text-sm">
      <label className="block space-y-2"><span className="font-semibold">Насколько CRM подходит под ваши задачи?</span><select required value={fit} onChange={e=>setFit(e.target.value)} className="crm-input w-full"><option value="" disabled>Выберите ответ</option><option value="yes">Подходит</option><option value="partly">Частично</option><option value="no">Не подходит</option><option value="unsure">Пока не понял</option></select></label>
      <label className="block space-y-2"><span className="font-semibold">Чего не хватает или что было неудобно?</span><textarea maxLength={2000} rows={3} value={comment} onChange={e=>setComment(e.target.value)} className="crm-input w-full" placeholder="Необязательно. Не указывайте данные клиентов." /></label>
      <label className="block space-y-2"><span className="font-semibold">Хотите обсудить внедрение? Оставьте контакт</span><input maxLength={200} value={contact} onChange={e=>setContact(e.target.value)} className="crm-input w-full" placeholder="Telegram или email — необязательно" /></label>
      {contact.trim() && <label className="flex items-start gap-2"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} /><span>Согласен на использование указанного контакта для ответа по внедрению CRM.</span></label>}
      <p className="text-xs text-slate-500">Ответы и контакт доступны только владельцу демо. В отчёте показываются ответы за последние 90 дней; сброс учебной базы их не удаляет.</p>
      {error && <p role="alert" className="text-rose-600">{error}</p>}
      <div className="flex flex-wrap gap-2"><button disabled={busy} className="btn-primary" type="submit">{busy?'Сохраняем…':'Отправить ответ'}</button><button type="button" className="btn-secondary" onClick={close}>Не сейчас</button></div>
    </form>}
    <a href="https://t.me/bxleth" target="_blank" rel="noopener noreferrer" onClick={()=>track('contact_clicked')} className="btn-secondary mt-4 w-full">Обсудить внедрение в Telegram</a>
  </Modal>;
}
