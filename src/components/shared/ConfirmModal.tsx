/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { registerConfirmSetter, unregisterConfirmSetter } from './showConfirm';

interface ConfirmModalState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
}

const defaultState: ConfirmModalState = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'OK',
  cancelLabel: 'Anuluj',
  danger: false,
};

export const ConfirmModal = () => {
  const [state, setState] = useState<ConfirmModalState>(defaultState);
  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const close = (value: boolean) => {
    resolveRef.current(value);
    setState(defaultState);
  };

  useEffect(() => {
    if (!state.open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [state.open]);

  useEffect(() => {
    registerConfirmSetter((opts) => {
      resolveRef.current = opts.resolve;
      setState({ ...defaultState, ...opts, open: true });
    });
    return () => { unregisterConfirmSetter(); };
  }, []);

  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-[91] flex items-center justify-center bg-black/60 p-4" onPointerDown={() => close(false)}>
      <div
        className={`flex w-[420px] flex-col gap-4 rounded-xl border ${state.danger ? 'border-red-500/40' : 'border-[#3a3d45]'} bg-[#18191c] p-6 shadow-2xl`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {state.danger && (
            <div className="mt-0.5 shrink-0 text-red-400">
              <AlertTriangle size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white">{state.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{state.message}</p>
          </div>
          <button onClick={() => close(false)} className="shrink-0 text-gray-500 hover:text-gray-300">
            <X size={16} />
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => close(false)}
            className="rounded-lg bg-[#202124] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#2a2b30] transition-colors"
          >
            {state.cancelLabel}
          </button>
          <button
            onClick={() => close(true)}
            className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors ${
              state.danger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
