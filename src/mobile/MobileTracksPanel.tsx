/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { Eye, EyeOff, Lock, LockOpen, Volume2, VolumeX } from 'lucide-react';
import type { TrackSettings } from '../types';
import { useTranslation } from '../i18n';

export const MobileTracksPanel = ({ trackSettings, selectedTrack, onSelectTrack, onToggle, onRename }: { trackSettings: TrackSettings[]; selectedTrack: number; onSelectTrack: (track: number) => void; onToggle: (track: number, key: keyof TrackSettings) => void; onRename: (track: number, name: string) => void }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 p-3">
      {trackSettings.map((settings, index) => <div key={index} className={`rounded-xl border p-3 ${selectedTrack === index ? 'border-blue-500 bg-blue-600/10' : 'border-[#2c2f37] bg-[#202124]'}`}>
        <div className="flex items-center gap-2"><button type="button" onClick={() => onSelectTrack(index)} className="rounded-md bg-[#2a2d34] px-2 py-1 text-[10px] font-bold text-gray-300">V{index + 1}</button><input value={settings.name} onChange={(event) => onRename(index, event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-gray-200 outline-none" aria-label={t('timeline.trackNameAria', { index: String(index + 1) })} /><button type="button" title={settings.locked ? t('timeline.unlock') : t('timeline.lock')} onClick={() => onToggle(index, 'locked')} className={`rounded p-1.5 ${settings.locked ? 'text-amber-400' : 'text-gray-500'}`}>{settings.locked ? <Lock size={15} /> : <LockOpen size={15} />}</button><button type="button" title={settings.muted ? t('timeline.unmute') : t('timeline.mute')} onClick={() => onToggle(index, 'muted')} className={`rounded p-1.5 ${settings.muted ? 'text-amber-400' : 'text-gray-500'}`}>{settings.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button><button type="button" title={settings.hidden ? t('timeline.show') : t('timeline.hide')} onClick={() => onToggle(index, 'hidden')} className={`rounded p-1.5 ${settings.hidden ? 'text-amber-400' : 'text-gray-500'}`}>{settings.hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
      </div>)}
    </div>
  );
};
