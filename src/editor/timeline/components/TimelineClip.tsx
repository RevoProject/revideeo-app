/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { StoredClip } from '../../../types';
import { Film, Image, Type, Volume2 } from 'lucide-react';
import { ClipThumbnailStrip } from './ClipThumbnailStrip';
import { ClipTrimHandles } from './ClipTrimHandles';
import { TransitionHandle } from './TransitionHandle';
import { useTranslation } from '../../../i18n';

interface TimelineClipProps {
  clip: StoredClip;
  index: number;
  assetName: string;
  thumbnails: string[];
  showName: boolean;
  trimStart: number;
  trimEnd: number;
  isSelected: boolean;
  locked: boolean;
  hasTransition: boolean;
  transitionLeft: string;
  transitionWidth: string;
  transitionTitle: string;
  transitionLabel?: string;
  left: string;
  width: string;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTrimLeftPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onTrimRightPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onTransitionPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onTransitionDoubleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTransitionContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const TimelineClip = ({
  clip,
  index,
  assetName,
  thumbnails,
  showName,
  trimStart,
  trimEnd,
  isSelected,
  locked,
  hasTransition,
  transitionLeft,
  transitionWidth,
  transitionTitle,
  transitionLabel,
  left,
  width,
  onContextMenu,
  onDoubleClick,
  onPointerDown,
  onClick,
  onTrimLeftPointerDown,
  onTrimRightPointerDown,
  onTransitionPointerDown,
  onTransitionDoubleClick,
  onTransitionContextMenu,
}: TimelineClipProps) => {
  const { t } = useTranslation();
  return (
  <>
    <div
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onClick={onClick}
      data-clip-index={index}
      style={{ left, width, touchAction: 'none' }}
      className={`absolute top-2 bottom-2 overflow-hidden rounded border cursor-grab active:cursor-grabbing transition-shadow z-[1] ${clip.type === 'audio' ? 'border-pink-700 bg-pink-800/50 hover:bg-pink-800/70' : clip.type === 'text' ? 'border-blue-700 bg-blue-800/40 hover:bg-blue-800/60' : clip.type === 'image' ? 'border-amber-600 bg-amber-700/40 hover:bg-amber-700/60' : 'border-blue-700 bg-blue-800/40 hover:bg-blue-800/60'} ${clip.groupId ? 'border-t-2 border-t-emerald-400' : ''} ${isSelected ? '!z-10 ring-2 ring-blue-500 shadow-lg shadow-blue-500/20' : ''}`}
    >
      <ClipThumbnailStrip clipId={clip.id} thumbnails={thumbnails} trimStart={trimStart} trimEnd={trimEnd} />
      {showName && <div className="relative z-10 truncate bg-black/20 px-1 py-0.5 text-[10px] text-blue-100">{clip.type === 'text' ? clip.text ?? t('props.standardText') : assetName}</div>}
      {clip.type === 'text' && <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center"><span className="inline-flex max-w-[90%] items-center gap-1 rounded bg-blue-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-blue-100"><Type size={10} />{t('media.text')}</span></div>}
      {clip.type === 'audio' && <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center"><span className="inline-flex max-w-[90%] items-center gap-1 rounded bg-pink-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-pink-200"><Volume2 size={10} />{t('media.audio')}</span></div>}
      {clip.type === 'image' && <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center"><span className="inline-flex max-w-[90%] items-center gap-1 rounded bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200"><Image size={10} />{t('media.image')}</span></div>}
      {clip.type === 'video' && <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center"><span className="inline-flex max-w-[90%] items-center gap-1 rounded bg-blue-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-blue-200"><Film size={10} />{t('media.video')}</span></div>}
      <ClipTrimHandles disabled={locked} onTrimLeftPointerDown={onTrimLeftPointerDown} onTrimRightPointerDown={onTrimRightPointerDown} />
    </div>
    {hasTransition && <TransitionHandle left={transitionLeft} width={transitionWidth} title={transitionTitle} label={transitionLabel} top="8px" bottom="8px" onPointerDown={onTransitionPointerDown} onDoubleClick={onTransitionDoubleClick} onContextMenu={onTransitionContextMenu} />}
  </>
  );
};
