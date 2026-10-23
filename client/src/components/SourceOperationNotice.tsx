import React from 'react';
import type { DocumentSummary } from '../types/documents';

export function SourceOperationNotice({ document, onClear }: { document?: DocumentSummary | null; onClear?: () => void }) {
  if (!document) return null;
  return <div role="status" className="contour-card p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
    <p>Показана операция <strong>{document.sourceNumber}</strong> из реестра документов. Если операция удалена, её документ остаётся в реестре.</p>
    <button className="btn-secondary min-h-11" onClick={onClear}>Показать все операции</button>
  </div>;
}
