/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { X } from 'lucide-react';
import { useTranslation } from '../../i18n';

export const ShortcutsModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const shortcuts = [
    [t('shortcuts.keys.space'), t('shortcuts.actions.playPause')],
    ['← / →', t('shortcuts.actions.frameStep')],
    [t('shortcuts.keys.backspaceDelete'), t('shortcuts.actions.deleteClip')],
    ['S', t('shortcuts.actions.splitClip')],
    ['T', t('shortcuts.actions.addMarker')],
    ['F', t('shortcuts.actions.cycleTransitions')],
    ['Alt+← / Alt+→', t('shortcuts.actions.jumpEdge')],
    ['Ctrl+Z / Ctrl+Shift+Z', t('shortcuts.actions.undoRedo')],
    ['Ctrl+Y', t('shortcuts.actions.redo')],
    ['Ctrl + / Ctrl -', t('shortcuts.actions.zoomInOut')],
    ['Ctrl + =', t('shortcuts.actions.zoomReset')],
  ];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="flex w-[420px] flex-col gap-4 rounded-xl border border-[#2c2d33] bg-[#18191c] p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">{t('shortcuts.title')}</h2><button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button></div><div className="flex flex-col gap-2">{shortcuts.map(([keys, action]) => <div key={keys} className="flex items-center justify-between gap-3 text-xs"><kbd className="whitespace-nowrap rounded border border-[#2c2d33] bg-[#202124] px-2 py-1 font-mono text-gray-300">{keys}</kbd><span className="text-right text-gray-400">{action}</span></div>)}</div><p className="text-[11px] text-gray-600">{t('shortcuts.hint')}</p></div></div>;
};
