import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Search } from 'lucide-react';
import { api } from '../services/api';
import { useCrmRefresh } from '../hooks/useCrmRefresh';
import { DOCUMENT_TYPES, DocumentFilters, DocumentSummary } from '../types/documents';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';

export function DocumentsPage({ onOpenSource }: { onOpenSource: (document: DocumentSummary) => void }) {
  const [filters, setFilters] = useState<DocumentFilters>({ page: 1 });
  const [search, setSearch] = useState('');
  const [openedId, setOpenedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => { const timer = setTimeout(() => setFilters((prev) => ({ ...prev, search, page: 1 })), 250); return () => clearTimeout(timer); }, [search]);
  const invalidDates = !!(filters.from && filters.to && filters.from > filters.to);
  const { data, isLoading, error } = useQuery({ queryKey: ['documents', filters], queryFn: () => api.getDocuments(filters), enabled: !invalidDates, retry: false });
  useCrmRefresh(() => { void queryClient.invalidateQueries({ queryKey: ['documents'] }); });
  const update = (values: Partial<DocumentFilters>) => setFilters((prev) => ({ ...prev, ...values, page: 1 }));
  const action = (doc: DocumentSummary) => <div className="flex gap-2 flex-wrap"><button className="btn-primary min-h-11" onClick={() => setOpenedId(doc.id)}>Просмотр / печать</button><button className="btn-secondary min-h-11" title="Перейти к исходной операции" onClick={() => onOpenSource(doc)}><ExternalLink className="w-4 h-4" /><span>Операция</span></button></div>;
  return <div className="space-y-4">
    <div><h2 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-500" />Документы</h2><p className="text-sm text-slate-500 mt-1">Договоры, акты, чеки и заказ-наряды. Новые документы сохраняют данные на момент оформления.</p></div>
    <div className="contour-card p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <label className="text-sm space-y-1"><span className="flex gap-1 items-center"><Search className="w-4 h-4" />Поиск</span><input className="input-field w-full min-h-11 text-base" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Клиент, телефон, номер, велосипед" /></label>
      <label className="text-sm space-y-1"><span>Тип документа</span><select className="input-field w-full min-h-11 text-base" value={filters.type || ''} onChange={(e) => update({ type: e.target.value })}><option value="">Все типы</option>{Object.entries(DOCUMENT_TYPES).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label>
      <label className="text-sm space-y-1"><span>Дата с</span><input aria-label="Дата с" type="date" className="input-field w-full min-h-11 text-base" value={filters.from || ''} onChange={(e) => update({ from: e.target.value })} /></label>
      <label className="text-sm space-y-1"><span>Дата по</span><input aria-label="Дата по" type="date" className="input-field w-full min-h-11 text-base" value={filters.to || ''} onChange={(e) => update({ to: e.target.value })} /></label>
    </div>
    {invalidDates && <p role="alert" className="text-rose-500">Дата начала позже даты окончания.</p>}
    {error && <p role="alert" className="text-rose-500">Не удалось загрузить документы: {error.message}</p>}
    {isLoading && <p role="status">Загрузка документов…</p>}
    {!invalidDates && !error && data && <>
      <p className="text-sm text-slate-500">Найдено: {data.total}</p>
      {!data.items.length && <div className="contour-card p-8 text-center text-slate-500">Документы не найдены. Они появятся после оформления аренды, продажи или заказ-наряда СТО.</div>}
      <div className="hidden lg:block contour-card overflow-x-auto"><table className="w-full text-sm text-left"><thead className="border-b border-slate-200 dark:border-slate-700"><tr>{['Документ', 'Дата', 'Клиент', 'Техника / операция', 'Сумма', 'Действия'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{data.items.map((doc) => <tr key={doc.id} className="border-b border-slate-100 dark:border-slate-800"><td className="p-3"><p className="font-semibold">{doc.title}</p><p className="text-xs text-slate-500">{doc.number}{doc.reconstructed && ' · Восстановлен'}</p></td><td className="p-3">{new Date(doc.issuedAt).toLocaleDateString('ru-RU')}</td><td className="p-3"><p>{doc.clientName}</p>{doc.clientPhone && <a href={`tel:${doc.clientPhone}`} className="text-emerald-600">{doc.clientPhone}</a>}</td><td className="p-3">{doc.bikeNumber}<p className="text-xs text-slate-500">{doc.sourceNumber}</p></td><td className="p-3 whitespace-nowrap">{doc.amount.toLocaleString('ru-RU')} ₽</td><td className="p-3">{action(doc)}</td></tr>)}</tbody></table></div>
      <div className="lg:hidden space-y-3">{data.items.map((doc) => <article key={doc.id} className="contour-card p-4 space-y-2"><h3 className="font-bold">{doc.title}</h3><p className="text-xs text-slate-500 break-all">{doc.number} · {new Date(doc.issuedAt).toLocaleDateString('ru-RU')}{doc.reconstructed && ' · Восстановлен'}</p><p>{doc.clientName}</p>{doc.clientPhone && <a className="block text-emerald-600" href={`tel:${doc.clientPhone}`}>{doc.clientPhone}</a>}<p>{doc.bikeNumber} · {doc.sourceNumber}</p><p className="font-bold">{doc.amount.toLocaleString('ru-RU')} ₽</p>{action(doc)}</article>)}</div>
      {data.total > data.pageSize && <div className="flex flex-wrap gap-3 items-center justify-center"><button className="btn-secondary min-h-11" disabled={data.page <= 1} onClick={() => setFilters((prev) => ({ ...prev, page: data.page - 1 }))}>Назад</button><span>Страница {data.page} из {Math.ceil(data.total / data.pageSize)}</span><button className="btn-secondary min-h-11" disabled={data.page * data.pageSize >= data.total} onClick={() => setFilters((prev) => ({ ...prev, page: data.page + 1 }))}>Далее</button></div>}
    </>}
    <DocumentPreviewModal id={openedId} onClose={() => setOpenedId(null)} />
  </div>;
}
