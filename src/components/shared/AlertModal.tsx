/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { registerAlertSetter, unregisterAlertSetter } from './showAlert';

export type AlertModalVariant = 'info' | 'error' | 'success';

interface AlertModalState {
  open: boolean;
  title: string;
  message: string;
  variant: AlertModalVariant;
}

const variantConfig: Record<AlertModalVariant, { icon: React.ReactNode; borderColor: string; iconColor: string }> = {
  info: {
    icon: <Info size={20} />,
    borderColor: 'border-blue-500/40',
    iconColor: 'text-blue-400',
  },
  error: {
    icon: <AlertTriangle size={20} />,
    borderColor: 'border-red-500/40',
    iconColor: 'text-red-400',
  },
  success: {
    icon: <CheckCircle2 size={20} />,
    borderColor: 'border-green-500/40',
    iconColor: 'text-green-400',
  },
};

const AlertModal = ({ state, onClose }: { state: AlertModalState; onClose: () => void }) => {
  const config = variantConfig[state.variant];

  useEffect(() => {
    if (!state.open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onClose();
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [state.open, onClose]);

  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onPointerDown={onClose}>
      <div
        className={`flex w-[400px] flex-col gap-4 rounded-xl border ${config.borderColor} bg-[#18191c] p-6 shadow-2xl`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 shrink-0 ${config.iconColor}`}>
            {config.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white">{state.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{state.message}</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-500 hover:text-gray-300">
            <X size={16} />
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#202124] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#2a2b30] transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export const AlertModalProvider = () => {
  const [state, setState] = useState<AlertModalState>({ open: false, title: '', message: '', variant: 'info' });

  useEffect(() => {
    registerAlertSetter(setState);
    return () => { unregisterAlertSetter(); };
  }, []);

  return <AlertModal state={state} onClose={() => setState((prev) => ({ ...prev, open: false }))} />;
};
