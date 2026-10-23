import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  mobileFullscreen?: boolean;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  mobileFullscreen = false,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${mobileFullscreen ? 'p-0 sm:p-4 md:p-6' : 'p-2 sm:p-4 md:p-6'} overflow-y-auto`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div
        className={`relative w-full ${widthClasses} bg-white dark:bg-[#0c1511] ${mobileFullscreen ? 'rounded-none h-[100dvh] max-h-[100dvh] sm:rounded-2xl sm:h-auto sm:max-h-[92vh]' : 'rounded-2xl max-h-[92vh]'} shadow-2xl border border-slate-200 dark:border-emerald-500/25 dark:shadow-[0_0_50px_rgba(16,185,129,0.12)] p-4 sm:p-6 transition-all transform flex flex-col z-10`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-emerald-500/15 shrink-0 gap-2">
          <div className="min-w-0 flex-1 pr-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words leading-tight" title={title}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words leading-normal" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-3 sm:py-4 overflow-y-auto grow custom-scrollbar">
          {children}
        </div>
        {footer && <div className="shrink-0 border-t border-slate-100 dark:border-emerald-500/15 pb-[env(safe-area-inset-bottom)]">{footer}</div>}
      </div>
    </div>
  );
};
