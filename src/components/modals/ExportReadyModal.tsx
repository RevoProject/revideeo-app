/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { CheckCircle2, Download, X } from 'lucide-react';
import { useTranslation } from '../../i18n';

export const ExportReadyModal = ({
  name,
  format,
  onDownload,
  onDismiss,
}: {
  name: string;
  format: string;
  onDownload: () => void;
  onDismiss: () => void;
}) => {
  const { t } = useTranslation();
  return (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4" onClick={onDismiss}>
    <div
      className="flex w-[420px] flex-col gap-5 rounded-xl border border-[#2c2d33] bg-[#18191c] p-6 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/15">
            <CheckCircle2 size={22} className="text-green-400" />
          </div>
          <h2 className="text-lg font-bold text-white">{t('export.ready')}</h2>
        </div>
        <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300" aria-label={t('juicer.close')}>
          <X size={18} />
        </button>
      </div>

      <p className="break-words rounded-lg bg-[#202124] px-3 py-2 font-mono text-xs text-gray-300">
        {name}.{format}
      </p>

      <p className="text-xs leading-relaxed text-gray-400">
        {t('export.readyDesc')}
      </p>

      <div className="flex justify-end gap-2">
        <button
          onClick={onDismiss}
          className="rounded-lg px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-200"
        >
          {t('export.dismiss')}
        </button>
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
        >
          <Download size={14} />{t('export.download')}
        </button>
      </div>
    </div>
  </div>
  );
};
