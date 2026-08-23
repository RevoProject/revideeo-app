/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { Download, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { applyUpdate } from '../../pwa';

interface UpdateBannerProps {
  version: string;
  onDismiss: () => void;
}

export const UpdateBanner = ({ version, onDismiss }: UpdateBannerProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative z-[75] flex items-center justify-center gap-3 border-b border-blue-600/40 bg-blue-500/15 px-3 py-2.5 text-[11px] font-semibold text-blue-200">
      <Download size={14} className="shrink-0 text-blue-400" />
      <span>{t('update.banner', { version })}</span>
      <button
        onClick={() => void applyUpdate()}
        className="ml-1 shrink-0 rounded-md bg-blue-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-blue-500 transition-colors"
      >
        {t('update.install')}
      </button>
      <button onClick={onDismiss} className="shrink-0 text-blue-400 hover:text-blue-200 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
};
