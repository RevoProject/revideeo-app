/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { AlertTriangle, Rocket } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface WelcomeModalProps {
  onDismiss: () => void;
}

export const WelcomeModal = ({ onDismiss }: WelcomeModalProps) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4">
      <div className="flex w-[440px] max-w-full flex-col gap-5 rounded-xl border border-[#2c2d33] bg-[#18191c] p-6 shadow-2xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 border border-blue-500/50">
            <img src="/favicon.svg" alt="ReVideeo" className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('welcome.title')}</h2>
            <span className="mt-1 inline-block rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
              {t('welcome.devVersion')}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <p className="text-[12px] leading-relaxed text-gray-300">{t('welcome.warning')}</p>
          </div>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-gray-500">
          {t('welcome.openSource')}
        </p>

        <button
          onClick={onDismiss}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-xs font-bold text-white hover:bg-blue-500 transition-colors"
        >
          <Rocket size={14} />
          {t('welcome.start')}
        </button>
      </div>
    </div>
  );
};
