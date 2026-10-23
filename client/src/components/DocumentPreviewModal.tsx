import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { PrintableContent } from './PrintableContent';
import { PrintableActModal } from '../pages/PrintableActModal';
import { PrintableSaleReceiptModal } from '../pages/PrintableSaleReceiptModal';

const money = (value: number) => value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₽';
const displayValue = (value: string) => /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value).toLocaleString('ru-RU') : value;

export function DocumentPreviewModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: doc, isLoading, error } = useQuery({ queryKey: ['document', id], queryFn: () => api.getDocument(id!), enabled: !!id, retry: false, staleTime: 0 });
  if (id && doc?.type === 'HANDOVER_ACT' && doc.snapshot.rentalData) return <PrintableActModal isOpen onClose={onClose} rental={doc.snapshot.rentalData} archivedDocument={doc} />;
  if (id && doc?.type === 'SALE_RECEIPT' && doc.snapshot.saleData) return <PrintableSaleReceiptModal isOpen onClose={onClose} order={doc.snapshot.saleData} archivedDocument={doc} />;
  return <Modal isOpen={!!id} onClose={onClose} title={doc?.title || 'Документ'} subtitle={doc?.number} maxWidth="4xl" mobileFullscreen
    footer={doc && <button className="btn-primary min-h-11 w-full sm:w-auto" onClick={() => window.print()}><Printer className="w-4 h-4" />Печать / Сохранить PDF</button>}>
    {isLoading && <p role="status">Загрузка документа…</p>}
    {error && <p role="alert" className="text-rose-500">{error.message}</p>}
    {doc && <>
      {doc.reconstructed && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 no-print">Восстановлен из текущих данных операции {new Date(doc.capturedAt).toLocaleDateString('ru-RU')}. Первоначальные данные могли отличаться.</p>}
      <PrintableContent className="document-paper bg-white text-slate-900 p-4 sm:p-8 text-sm space-y-5 rounded-xl border border-slate-200 break-words">
        <header className="text-center border-b border-slate-300 pb-4">
          <h2 className="text-lg font-bold">{doc.title}</h2><p>№ {doc.number} от {new Date(doc.issuedAt).toLocaleDateString('ru-RU')}</p>
          <p className="text-xs mt-1">Операция: {doc.sourceNumber}</p>
          {doc.reconstructed && <p className="text-xs mt-1">Восстановлен {new Date(doc.capturedAt).toLocaleDateString('ru-RU')} из доступных данных</p>}
        </header>
        <section className="grid sm:grid-cols-2 gap-5">
          <div><h3 className="font-bold">Организация / исполнитель</h3><p>{doc.snapshot.issuer.recipientName || 'ELECTREAM PRO SAMOKAT'}</p>
            {doc.snapshot.issuer.inn && <p>ИНН: {doc.snapshot.issuer.inn}</p>}
            {doc.snapshot.issuer.bankName && <p>Банк: {doc.snapshot.issuer.bankName}</p>}
            {doc.snapshot.issuer.accountNumber && <p>Счёт: {doc.snapshot.issuer.accountNumber}</p>}
            {doc.snapshot.issuer.bik && <p>БИК: {doc.snapshot.issuer.bik}</p>}
            {doc.snapshot.issuer.phoneNumber && <p>Телефон: {doc.snapshot.issuer.phoneNumber}</p>}
            <p>Сотрудник: {doc.snapshot.actor}</p></div>
          <div><h3 className="font-bold">Клиент</h3><p>{doc.snapshot.client.fullName}</p><p>{doc.snapshot.client.phone}</p>
            {(doc.snapshot.client.passportSerial || doc.snapshot.client.passportNumber) && <p>Паспорт: {doc.snapshot.client.passportSerial} {doc.snapshot.client.passportNumber}</p>}
            {doc.snapshot.client.registrationAddress && <p>Прописка: {doc.snapshot.client.registrationAddress}</p>}</div>
        </section>
        <dl className="space-y-1">{doc.snapshot.details.map((item, i) => <div key={i} className="flex flex-wrap gap-x-2"><dt className="font-semibold">{item.label}:</dt><dd>{displayValue(item.value)}</dd></div>)}</dl>
        {doc.snapshot.equipment.length > 0 && <section><h3 className="font-bold mb-2">Техника и комплектация</h3>{doc.snapshot.equipment.map((item, i) => <p key={i}>{i + 1}. {item.name} — {item.number}</p>)}</section>}
        {doc.snapshot.items.length > 0 && <section><h3 className="font-bold mb-2">Товары и работы</h3><table className="w-full text-left text-xs sm:text-sm"><thead><tr className="border-b"><th className="py-2">Наименование</th><th>Кол-во</th><th>Цена</th><th className="text-right">Сумма</th></tr></thead><tbody>{doc.snapshot.items.map((item, i) => <tr key={i} className="border-b border-slate-100"><td className="py-2 pr-2">{item.name}</td><td>{item.quantity}</td><td>{money(item.price)}</td><td className="text-right">{money(item.price * item.quantity)}</td></tr>)}</tbody></table></section>}
        <p className="font-bold text-right">{doc.type === 'RETURN_ACT' ? 'Возвращено клиенту' : 'Сумма документа'}: {money(doc.amount)}</p>
        {doc.snapshot.notes && <section><h3 className="font-bold">Примечания</h3><p className="whitespace-pre-wrap">{doc.snapshot.notes}</p></section>}
        {doc.type === 'RENTAL_CONTRACT' && <p>Арендодатель передаёт клиенту перечисленную технику во временное пользование на указанных выше условиях. Выдача и возврат оформляются отдельными актами. Для аренды с правом выкупа передача в собственность оформляется после полной оплаты.</p>}
        {doc.type === 'BUYOUT_ACT' && <p>Выкупная стоимость оплачена полностью. Перечисленная техника передана в собственность клиента. Возврат залога и расчёт по возвратной экипировке оформляются отдельно.</p>}
        {doc.type === 'REPAIR_ACT' && <p>Выполнены работы, перечисленные в настоящем акте. Примечания и замечания сторон указываются выше.</p>}
        {doc.type !== 'SALE_RECEIPT' && <footer className="grid grid-cols-2 gap-6 pt-8 text-xs"><p>Сотрудник: __________________<br />{doc.snapshot.actor}</p><p>Клиент: __________________<br />{doc.snapshot.client.fullName}</p></footer>}
      </PrintableContent>
    </>}
  </Modal>;
}
