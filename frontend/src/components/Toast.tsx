import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Info className="w-5 h-5 text-vault-cyan shrink-0" />;
        let borderClass = 'border-vault-cyan/30 bg-vault-900/95';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          borderClass = 'border-emerald-500/30 bg-vault-900/95';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          borderClass = 'border-rose-500/30 bg-vault-900/95';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl border ${borderClass} shadow-2xl backdrop-blur-md max-w-md w-full animate-in slide-in-from-right duration-300`}
          >
            <div className="flex items-center space-x-3 mr-3">
              {icon}
              <p className="text-sm text-slate-200">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
