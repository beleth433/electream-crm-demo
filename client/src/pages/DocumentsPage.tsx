import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Search } from 'lucide-react';
import { api } from '../services/api';
import { useCrmRefresh } from '../hooks/useCrmRefresh';
import { DOCUMENT_TYPES, DocumentFilters, DocumentSummary } from '../types/documents';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { CrmPageHeader } from '../components/CrmPageHeader';

const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');
const formatAmount = (amount: number) => amount.toLocaleString('ru-RU') + ' ₽';

export function DocumentsPage({ onOpenSource }: { onOpenSource: (document: DocumentSummary) => void }) {
  const [filters, setFilters] = useState<DocumentFilters>({ page: 1 });
  const [search, setSearch] = useState('');
  const [openedId, setOpenedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    const timer = setTimeout(() => setFilters((prev) => ({ ...prev, search, page: 1 })), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const invalidDates = !!(filters.from && filters.to && filters.from > filters.to);
  const { data, isLoading, error } = useQuery({ queryKey: ['documents', filters], queryFn: () => api.getDocuments(filters), enabled: !invalidDates, retry: false });
  useCrmRefresh(() => queryClient.invalidateQueries({ queryKey: ['documents'] }));
  const update = (values: Partial<DocumentFilters>) => setFilters((prev) => ({ ...prev, ...values, page: 1 }));
  const actions = (doc: DocumentSummary) => (
    <div className="flex flex-wrap gap-2">
      <button className="btn-primary" onClick={() => setOpenedId(doc.id)}><FileText className="h-4 w-4 shrink-0" />Просмотр / печать</button>
      <button className="btn-secondary" title="Перейти к исходной операции" onClick={() => onOpenSource(doc)}><ExternalLink className="h-4 w-4 shrink-0" />Операция</button>
    </div>
  );
  return <div className="crm-page">
    <CrmPageHeader title="Документы" icon={<FileText className="h-5 w-5" />}
      description="Договоры, акты, чеки и заказ-наряды. Новые документы сохраняют данные на момент оформления." />
    <div className="contour-card grid grid-cols-2 gap-4 p-4 xl:grid-cols-4">
      <label className="col-span-2 min-w-0 sm:col-span-1">
        <span className="crm-field-label">Поиск</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className="input-field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Клиент, телефон, номер, велосипед" />
        </div>
      </label>
      <label className="col-span-2 min-w-0 sm:col-span-1">
        <span className="crm-field-label">Тип документа</span>
        <select className="input-field" value={filters.type || ''} onChange={(e) => update({ type: e.target.value })}>
          <option value="">Все типы</option>
          {Object.entries(DOCUMENT_TYPES).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
        </select>
      </label>
      <label className="min-w-0"><span className="crm-field-label">Дата с</span><input type="date" className="input-field" value={filters.from || ''} onChange={(e) => update({ from: e.target.value })} /></label>
      <label className="min-w-0"><span className="crm-field-label">Дата по</span><input type="date" className="input-field" value={filters.to || ''} onChange={(e) => update({ to: e.target.value })} /></label>
    </div>
    {invalidDates && <p role="alert" className="text-rose-600 dark:text-rose-400">Дата начала позже даты окончания.</p>}
    {error && <p role="alert" className="text-rose-600 dark:text-rose-400">Не удалось загрузить документы: {error.message}</p>}
    {isLoading && <p role="status">Загрузка документов…</p>}
    {!invalidDates && !error && data && <>
      <p className="text-slate-600 dark:text-slate-400" role="status">Найдено: <strong className="font-semibold text-slate-900 dark:text-white">{data.total}</strong></p>
      {!data.items.length && <div className="contour-card p-8 text-center text-slate-600 dark:text-slate-400">Документы не найдены. Они появятся после оформления аренды, продажи или заказ-наряда СТО.</div>}
      {data.items.length > 0 && <div className="contour-card hidden overflow-x-auto lg:block">
        <table className="crm-table">
          <thead><tr>{['Документ', 'Дата', 'Клиент', 'Техника / операция', 'Сумма', 'Действия'].map((label) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/10">
            {data.items.map((doc) => <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td><p className="font-semibold">{doc.title}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{doc.number}{doc.reconstructed && ' · Восстановлен'}</p></td>
              <td className="whitespace-nowrap tabular-nums">{formatDate(doc.issuedAt)}</td>
              <td><p className="font-medium">{doc.clientName}</p>{doc.clientPhone && <a href={'tel:' + doc.clientPhone} className="inline-flex min-h-11 items-center whitespace-nowrap text-emerald-700 hover:underline dark:text-emerald-400">{doc.clientPhone}</a>}</td>
              <td>{doc.bikeNumber}<p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{doc.sourceNumber}</p></td>
              <td className="whitespace-nowrap font-semibold tabular-nums">{formatAmount(doc.amount)}</td>
              <td>{actions(doc)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
      <div className="space-y-3 lg:hidden">{data.items.map((doc) => <article key={doc.id} className="contour-card space-y-4 p-4">
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold leading-snug">{doc.title}</h3>
          <p className="break-words text-xs text-slate-600 dark:text-slate-400">{doc.number} · {formatDate(doc.issuedAt)}{doc.reconstructed && ' · Восстановлен'}</p>
        </div>
        <div>
          <p className="font-medium">{doc.clientName}</p>
          {doc.clientPhone && <a className="inline-flex min-h-11 items-center text-emerald-700 hover:underline dark:text-emerald-400" href={'tel:' + doc.clientPhone}>{doc.clientPhone}</a>}
          <p className="break-words text-slate-600 dark:text-slate-400">{[doc.bikeNumber, doc.sourceNumber].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-emerald-500/15">
          <p className="text-base font-semibold tabular-nums">{formatAmount(doc.amount)}</p>
          {actions(doc)}
        </div>
      </article>)}</div>
      {data.total > data.pageSize && <div className="flex flex-wrap items-center justify-center gap-3">
        <button className="btn-secondary" disabled={data.page <= 1} onClick={() => setFilters((prev) => ({ ...prev, page: data.page - 1 }))}>Назад</button>
        <span>Страница {data.page} из {Math.ceil(data.total / data.pageSize)}</span>
        <button className="btn-secondary" disabled={data.page * data.pageSize >= data.total} onClick={() => setFilters((prev) => ({ ...prev, page: data.page + 1 }))}>Далее</button>
      </div>}
    </>}
    <DocumentPreviewModal id={openedId} onClose={() => setOpenedId(null)} />
  </div>;
}
