/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { RefreshCw } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { applyUpdate } from '../../pwa';

interface UpdateModalProps {
  version: string;
  onDismiss: () => void;
}

export const UpdateModal = ({ version, onDismiss }: UpdateModalProps) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1b1f] p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
            <RefreshCw size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{t('update.modal.title')}</h2>
            <p className="text-[11px] text-gray-400">{t('update.modal.version', { version })}</p>
          </div>
        </div>
        <p className="mb-5 text-[12px] leading-relaxed text-gray-300">
          {t('update.modal.description')}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-gray-300 hover:bg-white/10 transition-colors"
          >
            {t('update.modal.later')}
          </button>
          <button
            onClick={() => void applyUpdate()}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-500 transition-colors"
          >
            {t('update.modal.update')}
          </button>
        </div>
      </div>
    </div>
  );
};
