import React from 'react';
import { createPortal } from 'react-dom';

// A body-level print copy avoids clipping by scrollable and transformed dialogs.
export function PrintableContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <>
    <div className={className}>{children}</div>
    {createPortal(<div id="printable-act" className="hidden print:block text-sm text-black bg-white">{children}</div>, document.body)}
  </>;
}
