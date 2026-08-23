/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import React from 'react';
import { useState } from 'react';
import { Clapperboard, Eye, EyeOff, Lock, LockOpen, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import type { TrackSettings } from '../../../types';

interface TrackHeaderProps {
  trackIndex: number;
  settings: TrackSettings | undefined;
  selected: boolean;
  mobile?: boolean;
  onSelect: () => void;
  onToggle: (key: keyof TrackSettings) => void;
  onRename: (name: string) => void;
  onContextMenu: (event: React.MouseEvent) => void;
  showControls?: boolean;
}

export const TrackHeader = ({ trackIndex, settings, selected, mobile = false, onSelect, onToggle, onRename, onContextMenu, showControls = true }: TrackHeaderProps) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings?.name ?? t('timeline.track', { index: String(trackIndex + 1) }));
  const commit = () => { onRename(draft.trim() || t('timeline.track', { index: String(trackIndex + 1) })); setEditing(false); };
  const label = mobile ? `V${trackIndex + 1}` : (settings?.name ?? t('timeline.track', { index: String(trackIndex + 1) }));
  const iconSize = mobile ? 11 : 12;
  const iconPad = mobile ? 'p-0.5' : 'p-1';
  return (
    <div onContextMenu={onContextMenu} className={`${mobile ? 'h-14' : 'h-20'} border flex flex-col items-center justify-center gap-0.5 rounded text-xs font-semibold transition-colors ${selected ? 'border-blue-500 bg-blue-600/20 text-blue-300' : 'border-[#2d3037] bg-[#202124] text-gray-500 hover:text-gray-300'}`}>
      {editing ? <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') commit(); if (event.key === 'Escape') setEditing(false); }} className="w-32 rounded border border-blue-500 bg-[#111214] px-1 py-0.5 text-center text-xs text-gray-200 outline-none" /> : (
        <button type="button" onPointerDown={onSelect} onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); if (mobile) onSelect(); else { setDraft(settings?.name ?? t('timeline.track', { index: String(trackIndex + 1) })); setEditing(true); } }} className={`flex items-center gap-1 ${mobile ? 'text-[11px]' : ''}`}>{!mobile && <Clapperboard size={14} className="text-blue-400" />}{label}</button>
      )}
      {showControls && <div className={`flex items-center ${mobile ? 'gap-0.5' : 'gap-1'}`}>
        <button type="button" title={settings?.locked ? t('timeline.unlock') : t('timeline.lock')} onPointerDown={(event) => { event.stopPropagation(); onToggle('locked'); }} className={`rounded ${iconPad} hover:bg-[#383a42] ${settings?.locked ? 'text-amber-400' : 'text-gray-500'}`}>{settings?.locked ? <Lock size={iconSize} /> : <LockOpen size={iconSize} />}</button>
        <button type="button" title={settings?.muted ? t('timeline.unmute') : t('timeline.mute')} onPointerDown={(event) => { event.stopPropagation(); onToggle('muted'); }} className={`rounded ${iconPad} hover:bg-[#383a42] ${settings?.muted ? 'text-amber-400' : 'text-gray-500'}`}>{settings?.muted ? <VolumeX size={iconSize} /> : <Volume2 size={iconSize} />}</button>
        <button type="button" title={settings?.hidden ? t('timeline.show') : t('timeline.hide')} onPointerDown={(event) => { event.stopPropagation(); onToggle('hidden'); }} className={`rounded ${iconPad} hover:bg-[#383a42] ${settings?.hidden ? 'text-amber-400' : 'text-gray-500'}`}>{settings?.hidden ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}</button>
      </div>}
    </div>
  );
};
