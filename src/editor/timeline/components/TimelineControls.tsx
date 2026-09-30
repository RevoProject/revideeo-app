/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import React from 'react';
import type { NativePlayerHandle } from '@revideeo/player';
import { Pause, Play, Plus, Scissors, Shrink } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { formatTimecode, parsePositionInput } from '../utils/timelineGeometry';

interface TimelineControlsProps {
  playerRef: React.RefObject<NativePlayerHandle | null>;
  isPlaying: boolean;
  trackCount: number;
  maxTracks: number;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  onSeek: (frame: number) => void;
  onSplit: () => void;
  onAddTrack: () => void;
  onFitZoom?: () => void;
  mobile?: boolean;
}

export const TimelineControls = ({
  playerRef,
  isPlaying,
  trackCount,
  maxTracks,
  currentFrame,
  totalFrames,
  fps,
  onSeek,
  onSplit,
  onAddTrack,
  onFitZoom,
  mobile = false,
}: TimelineControlsProps) => {
  const { t } = useTranslation();
  const [showTimecode, setShowTimecode] = React.useState(false);
  const [editingPosition, setEditingPosition] = React.useState(false);
  const [positionDraft, setPositionDraft] = React.useState('');

  const seekbarRef = React.useRef<HTMLInputElement>(null);
  const frameLabelRef = React.useRef<HTMLSpanElement>(null);

  const commitPosition = () => {
    const position = parsePositionInput(positionDraft, fps);
    if (position !== null) onSeek(Math.max(0, Math.min(position, totalFrames)));
    setEditingPosition(false);
  };

  React.useEffect(() => {
    if (!isPlaying) {
      if (seekbarRef.current) seekbarRef.current.value = String(currentFrame);
      if (frameLabelRef.current) frameLabelRef.current.textContent = String(currentFrame);
    }
  }, [currentFrame, isPlaying]);

  return (
    <div className={`${mobile ? 'h-10 px-2 gap-2' : 'h-12 px-4 gap-3'} flex items-center border-b border-[#222429] text-xs`}>
      <button onClick={() => playerRef.current?.toggle()} className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-white font-bold transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        {!mobile && t('timeline.playPause')}
      </button>
      <button onClick={onAddTrack} disabled={trackCount >= maxTracks} title={t('timeline.addTrack')} className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[#202124] px-2.5 text-gray-300 font-medium transition-colors hover:bg-[#2a2b30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus size={13} className="text-blue-400" />
        {!mobile && t('timeline.trackCount', { count: String(trackCount), max: String(maxTracks) })}
      </button>
      <button onClick={onSplit} className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[#2a2b30] px-3 text-gray-300 font-medium transition-colors hover:bg-[#383a42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <Scissors size={14} className="text-blue-400" />
        {!mobile && t('timeline.split')}
      </button>
      {!mobile && onFitZoom && <button onClick={onFitZoom} title={t('timeline.fitTimeline')} className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[#202124] px-3 text-gray-300 font-medium transition-colors hover:bg-[#2a2b30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Shrink size={14} className="text-blue-400" />{t('timeline.fitTimeline')}</button>}
      <input ref={seekbarRef} data-testid="timeline-seekbar" type="range" min="0" max={totalFrames} defaultValue={currentFrame} onChange={(event) => onSeek(parseInt(event.target.value))} className="flex-1 min-w-0 h-1.5 accent-blue-500 cursor-ew-resize" title={t('timeline.seek')} />
      {editingPosition ? (
        <input autoFocus value={positionDraft} onChange={(event) => setPositionDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setEditingPosition(false); if (event.key === 'Enter') commitPosition(); }} className="w-36 rounded-md border border-blue-500 bg-[#202124] px-2 py-1 text-right font-mono text-xs text-gray-200 outline-none" placeholder={t('timeline.positionPlaceholder')} />
      ) : (
        <button type="button" onClick={() => setShowTimecode((value) => !value)} onDoubleClick={() => { setPositionDraft(showTimecode ? formatTimecode(currentFrame, fps) : String(currentFrame)); setEditingPosition(true); }} className="text-gray-400 font-mono whitespace-nowrap shrink-0 hover:text-gray-200 transition-colors" title={t('timeline.frameHint')}>
          {showTimecode ? <><span className="text-blue-400">{formatTimecode(currentFrame, fps)}</span> / {formatTimecode(totalFrames, fps)}</> : <>{t('timeline.frame')}: <span ref={frameLabelRef} data-testid="timeline-frame-label" className="text-blue-400" /> / {totalFrames}</>}
        </button>
      )}
    </div>
  );
};
