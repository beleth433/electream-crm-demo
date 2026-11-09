import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#0d1813] border border-rose-500/30 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {this.props.fallbackTitle || 'Произошла непредвиденная ошибка в разделе'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Система защиты предотвратила сбой интерфейса. Вы можете перезагрузить раздел или вернуться к работе.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left p-3 rounded-xl bg-slate-50 dark:bg-[#07110c] border border-slate-200 dark:border-rose-500/20 text-[11px] font-mono text-rose-600 dark:text-rose-400 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Home className="w-4 h-4" />
                Попробовать снова
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
              >
                <RotateCw className="w-4 h-4" />
                Обновить страницу
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
