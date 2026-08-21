import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border flex items-start gap-3 transition-all transform translate-y-0 backdrop-blur-md ${
              t.type === 'success'
                ? 'bg-white/95 dark:bg-[#0f172a]/95 border-emerald-300 dark:border-blue-500/40 text-slate-900 dark:text-white shadow-emerald-500/10'
                : t.type === 'warning'
                ? 'bg-white/95 dark:bg-[#1e1708]/95 border-amber-300 dark:border-amber-500/40 text-slate-900 dark:text-white shadow-amber-500/10'
                : t.type === 'error'
                ? 'bg-white/95 dark:bg-[#1f0f0f]/95 border-red-300 dark:border-red-500/40 text-slate-900 dark:text-white shadow-red-500/10'
                : 'bg-white/95 dark:bg-[#0a0a0a]/95 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-black/20'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold leading-tight">{t.title}</h5>
              {t.message && (
                <p className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5 leading-relaxed">
                  {t.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="p-1 rounded-md text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
