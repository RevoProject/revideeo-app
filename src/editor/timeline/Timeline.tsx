import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { NativePlayerHandle } from '@revideeo/player';
import { ArrowRightLeft } from 'lucide-react';
import type { StoredClip, TimelineMarker, TrackSettings } from '../../types';
import { useTranslation } from '../../i18n';
import { getMaxTracks } from '../../capabilities';
import { TimelineControls } from './components/TimelineControls';
import { TimelineRuler } from './components/TimelineRuler';
import { TimelineClip } from './components/TimelineClip';
import { TrackHeader } from './components/TrackHeader';
import { useTimelineZoom } from './hooks/useTimelineZoom';
import type { TimelineDrag } from './utils/timelineInteraction';

export interface TimelineAsset {
  sourceId: string;
  name: string;
  durationInFrames: number;
  thumbnails?: string[];
}

const ROW_H = 88;
const MIN_TRANSITION_DURATION = 5;
const MAX_TRANSITION_DURATION = 30;

const groupByTrack = (clips: StoredClip[]): Map<number, StoredClip[]> => {
  const grouped = new Map<number, StoredClip[]>();
  clips.forEach((clip) => grouped.set(clip.trackIndex, [...(grouped.get(clip.trackIndex) ?? []), clip]));
  grouped.forEach((trackClips) => trackClips.sort((a, b) => a.offsetInTimeline - b.offsetInTimeline));
  return grouped;
};

interface TimelineProps {
  clips: StoredClip[];
  markers: TimelineMarker[];
  assets: TimelineAsset[];
  totalFrames: number;
  currentFrame: number;
  fps: number;
  selectedClipIds: string[];
  selectedTrack: number;
  trackCount: number;
  trackSettings: TrackSettings[];
  playerRef: React.RefObject<NativePlayerHandle | null>;
  isPlaying: boolean;
  onSeek: (frame: number) => void;
  onSelectClip: (id: string, additive?: boolean) => void;
  onSelectClips: (ids: string[]) => void;
  onSelectTrack: (track: number) => void;
  onSplit: () => void;
  onQuickTransition: () => void;
  onAddTrack: () => void;
  onBeginEdit: () => void;
  onUpdateClipFromDrag: (id: string, patch: Partial<StoredClip>) => void;
  onTransitionResize: (id: string, frames: number) => void;
  onTransitionDrop: (id: string, frame: number) => void;
  onSelectTransition: (clipId: string, trackIndex: number) => void;
  onMediaDrop: (sourceId: string, trackIndex: number, frame: number) => void;
  onToggleTrackSetting: (trackIndex: number, key: keyof TrackSettings) => void;
  onRenameTrack: (trackIndex: number, name: string) => void;
  onContextMenuClip: (event: React.MouseEvent, clipId: string) => void;
  onContextMenuTrack: (event: React.MouseEvent, trackIndex: number) => void;
  onContextMenuEmpty: (event: React.MouseEvent, trackIndex: number) => void;
  onContextMenuTransition?: (event: React.MouseEvent, clipId: string, trackIndex: number) => void;
  onClearSelection: () => void;
  onOpenProperties: () => void;
  onOpenTransitions: () => void;
  onClipDragEnd?: (id: string) => void;
  height?: number;
  mobile?: boolean;
}

export const Timeline = ({
  clips, markers, assets, totalFrames, currentFrame, fps, selectedClipIds, selectedTrack, trackCount, trackSettings,
  playerRef, isPlaying, onSeek, onSelectClip, onSelectClips, onSelectTrack, onSplit, onQuickTransition, onAddTrack,
  onBeginEdit, onUpdateClipFromDrag, onTransitionResize, onTransitionDrop, onSelectTransition, onMediaDrop,
  onToggleTrackSetting, onRenameTrack, onContextMenuClip, onContextMenuTrack, onContextMenuEmpty, onContextMenuTransition, onClearSelection,
  onOpenProperties, onOpenTransitions, onClipDragEnd, height, mobile = false,
}: TimelineProps) => {
  const { t } = useTranslation();
  const rowHeight = mobile ? 64 : ROW_H;
  const areaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<TimelineDrag | null>(null);
  const pinchingRef = useRef(false);
  const pinchRef = useRef<{ startDist: number; startZoom: number; startAreaWidth: number; playheadViewportX: number } | null>(null);
  const pendingScrollRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const MIN_ZOOM = mobile ? 0.125 : 0.25;
  const { zoom: timelineZoom, setZoom } = useTimelineZoom(MIN_ZOOM);
  zoomRef.current = timelineZoom;
  const [areaWidth, setAreaWidth] = useState(0);
  const [selectionBox, setSelectionBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [transitionDragLabel, setTransitionDragLabel] = useState<{ x: number; y: number; td: number } | null>(null);
  const trackClips = useMemo(() => groupByTrack(clips), [clips]);
  // Render the highest layer at the top while keeping Track 1 at the bottom.
  const tracks = Array.from({ length: trackCount }, (_, index) => trackCount - 1 - index);
  const pct = (value: number) => `${(value / totalFrames) * 100}%`;

  useEffect(() => {
    if (!isPlaying && playheadRef.current) {
      playheadRef.current.style.left = pct(currentFrame);
    }
  }, [currentFrame, isPlaying, totalFrames]);

  const seekFromEvent = (event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(totalFrames, Math.round(((event.clientX - rect.left) / rect.width) * totalFrames))));
  };

  const beginMarquee = (event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    if (mobile) {
      seekFromEvent(event);
      onClearSelection();
      return;
    }
    onSelectClips([]);
    dragRef.current = { kind: 'marquee', startX: event.clientX, startY: event.clientY, moved: false };
    setSelectionBox(null);
    seekFromEvent(event);
  };

  useEffect(() => {
    const node = areaRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setAreaWidth(node.clientWidth));
    observer.observe(node);
    setAreaWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  const pinchDistance = (event: React.TouchEvent) => {
    const [a, b] = [event.touches[0], event.touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length !== 2) return;
    const container = scrollRef.current;
    const area = areaRef.current;
    if (!container || !area) return;
    const parentWidth = area.parentElement?.clientWidth ?? area.clientWidth;
    const areaWidthFor = (z: number) => Math.max(parentWidth, z * parentWidth);
    const startAreaWidth = areaWidthFor(zoomRef.current);
    const playheadContentX = (currentFrame / totalFrames) * startAreaWidth;
    const playheadViewportX = playheadContentX - container.scrollLeft;
    pinchingRef.current = true;
    pinchRef.current = {
      startDist: pinchDistance(event),
      startZoom: zoomRef.current,
      startAreaWidth,
      playheadViewportX,
    };
    dragRef.current = null;
    setSelectionBox(null);
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (!pinchingRef.current || !pinchRef.current || event.touches.length !== 2) return;
    event.preventDefault();
    const ratio = pinchDistance(event) / (pinchRef.current.startDist || 1);
    const newZoom = Math.max(MIN_ZOOM, Math.min(4, pinchRef.current.startZoom * ratio));
    setZoom(newZoom);
    const parentWidth = areaRef.current?.parentElement?.clientWidth ?? areaRef.current?.clientWidth ?? 1;
    const newAreaWidth = Math.max(parentWidth, newZoom * parentWidth);
    pendingScrollRef.current = (currentFrame / totalFrames) * newAreaWidth - pinchRef.current.playheadViewportX;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (event.touches.length < 2) {
      pinchingRef.current = false;
      pinchRef.current = null;
    }
  };

  useLayoutEffect(() => {
    if (pinchingRef.current && pendingScrollRef.current !== null && scrollRef.current) {
      scrollRef.current.scrollLeft = pendingScrollRef.current;
      pendingScrollRef.current = null;
    }
  }, [timelineZoom]);

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const area = areaRef.current;
    if (!scroll || !area || totalFrames <= 0) return;
    const playheadX = (currentFrame / totalFrames) * area.scrollWidth;
    const margin = scroll.clientWidth * 0.2;
    const leftEdge = scroll.scrollLeft + margin;
    const rightEdge = scroll.scrollLeft + scroll.clientWidth - margin;
    if (playheadX < leftEdge) scroll.scrollLeft = Math.max(0, playheadX - scroll.clientWidth * 0.3);
    else if (playheadX > rightEdge) scroll.scrollLeft = Math.min(Math.max(0, area.scrollWidth - scroll.clientWidth), playheadX - scroll.clientWidth * 0.7);
  }, [currentFrame, timelineZoom, totalFrames]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const area = areaRef.current;
      if (!drag || !area || pinchingRef.current) return;
      const rect = area.getBoundingClientRect();
      const framesPerPixel = totalFrames / areaWidth;
      const dx = event.clientX - drag.startX;
      if (drag.kind === 'marquee') {
        drag.moved = true;
        const startX = drag.startX - rect.left;
        const startY = drag.startY - rect.top;
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;
        const left = Math.max(0, Math.min(startX, currentX));
        const top = Math.max(0, Math.min(startY, currentY));
        const right = Math.min(rect.width, Math.max(startX, currentX));
        const bottom = Math.min(rect.height, Math.max(startY, currentY));
        setSelectionBox({ left, top, width: right - left, height: bottom - top });
        const minFrame = Math.round((left / rect.width) * totalFrames);
        const maxFrame = Math.round((right / rect.width) * totalFrames);
        const minVisualTrack = Math.max(0, Math.floor(top / rowHeight));
        const maxVisualTrack = Math.min(trackCount - 1, Math.floor(bottom / rowHeight));
        const minTrack = trackCount - 1 - maxVisualTrack;
        const maxTrack = trackCount - 1 - minVisualTrack;
        onSelectClips(clips.filter((clip) => clip.trackIndex >= minTrack && clip.trackIndex <= maxTrack && clip.offsetInTimeline < maxFrame && clip.offsetInTimeline + clip.durationInFrames > minFrame).map((clip) => clip.id));
        return;
      }
      if (drag.kind === 'clip') {
        if (!drag.moved) { drag.moved = true; onBeginEdit(); }
        const visualTrack = Math.max(0, Math.min(trackCount - 1, Math.floor((event.clientY - rect.top) / rowHeight)));
        const newTrack = trackCount - 1 - visualTrack;
        const trackDelta = newTrack - drag.originalTrack;
        drag.originals.forEach((original) => onUpdateClipFromDrag(original.id, { offsetInTimeline: Math.max(0, Math.round(original.offset + dx * framesPerPixel)), trackIndex: Math.max(0, Math.min(trackCount - 1, original.track + trackDelta)) }));
      } else if (drag.kind === 'transition') {
        if (!drag.moved) { drag.moved = true; onBeginEdit(); }
        const td = Math.max(MIN_TRANSITION_DURATION, Math.min(MAX_TRANSITION_DURATION, Math.round(drag.originalTd + dx * framesPerPixel)));
        onTransitionResize(drag.clipId, td);
        setTransitionDragLabel({ x: event.clientX, y: event.clientY, td });
      } else {
        if (!drag.moved) { drag.moved = true; onBeginEdit(); }
        const delta = Math.round(dx * framesPerPixel);
        if (drag.kind === 'trim-left') {
          const trimDelta = Math.max(-drag.originalStartFrame, Math.min(drag.originalDuration - 1, delta));
          onUpdateClipFromDrag(drag.clipId, { offsetInTimeline: Math.max(0, drag.originalOffset + trimDelta), startFrame: drag.originalStartFrame + trimDelta, durationInFrames: drag.originalDuration - trimDelta });
        } else {
          onUpdateClipFromDrag(drag.clipId, { durationInFrames: Math.max(1, Math.min(drag.sourceDuration - drag.originalStartFrame, drag.originalDuration + delta)) });
        }
      }
    };
    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || pinchingRef.current) return;
      if (drag.kind === 'clip' && drag.moved && onClipDragEnd) {
        onClipDragEnd(drag.clipId);
      }
      if (drag.kind === 'transition' && drag.moved && areaRef.current) {
        const rect = areaRef.current.getBoundingClientRect();
        onTransitionDrop(drag.clipId, Math.round(((event.clientX - rect.left) / rect.width) * totalFrames));
      }
      if (drag.kind === 'marquee') setSelectionBox(null);
      setTransitionDragLabel(null);
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [clips, onBeginEdit, onSelectClips, onTransitionDrop, onTransitionResize, onUpdateClipFromDrag, onClipDragEnd, rowHeight, totalFrames, trackCount]);

  const handleMediaDrop = (event: React.DragEvent, trackIndex: number) => {
    event.preventDefault();
    if (trackSettings[trackIndex]?.locked) return;
    const sourceId = event.dataTransfer.getData('application/x-revideeo');
    if (!sourceId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onMediaDrop(sourceId, trackIndex, Math.max(0, Math.round(((event.clientX - rect.left) / rect.width) * totalFrames)));
  };

  return (
    <div className={`${mobile ? 'h-full' : 'shrink-0'} bg-[#18191c] flex flex-col`} style={!mobile && height ? { height } : undefined}>
      {!mobile && (
        <TimelineControls mobile={mobile} playerRef={playerRef} isPlaying={isPlaying} trackCount={trackCount} maxTracks={getMaxTracks()} currentFrame={currentFrame} totalFrames={totalFrames} fps={fps} onSeek={onSeek} onSplit={onSplit} onAddTrack={onAddTrack} />
      )}
      {mobile && <div className="flex shrink-0 items-center gap-2 border-b border-[#222429] bg-[#18191c] px-3 py-1.5"><span className="text-[10px] text-gray-500">Zoom</span><input type="range" min={MIN_ZOOM} max={4} step={0.05} value={timelineZoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-[#2563EB]" aria-label={t('timeline.zoomAria')} /><span className="w-8 text-right font-mono text-[10px] text-gray-500">{timelineZoom.toFixed(1)}x</span></div>}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto bg-[#141517] p-3"
        style={{ touchAction: mobile ? 'pan-x pan-y' : undefined }}
        onTouchStart={mobile ? onTouchStart : undefined}
        onTouchMove={mobile ? onTouchMove : undefined}
        onTouchEnd={mobile ? onTouchEnd : undefined}
      >
        <div className={mobile ? 'flex min-w-0 w-full' : 'flex min-w-[560px]'} style={{ height: trackCount * rowHeight + 32 }}>
          <div className={`flex flex-col gap-1.5 shrink-0 ${mobile ? 'w-12 mr-1' : 'w-40 mr-1.5'}`}>
            <div className="h-8 shrink-0 flex items-center justify-end"><button type="button" onClick={onQuickTransition} title={t('timeline.insertTransition')} className="h-7 w-8 flex items-center justify-center rounded bg-[#202124] text-gray-400 hover:bg-[#2a2b30] hover:text-blue-300"><ArrowRightLeft size={14} /></button></div>
            {tracks.map((track) => <TrackHeader key={track} trackIndex={track} mobile={mobile} showControls={!mobile} settings={trackSettings[track]} selected={selectedTrack === track} onSelect={() => onSelectTrack(track)} onToggle={(key) => onToggleTrackSetting(track, key)} onRename={(name) => onRenameTrack(track, name)} onContextMenu={(event) => onContextMenuTrack(event, track)} />)}
          </div>
          <div className="relative min-w-0 flex-1">
            <TimelineRuler totalFrames={totalFrames} fps={fps} zoom={timelineZoom} onPointerDown={() => onClearSelection()} onDoubleClick={(event) => { seekFromEvent(event); onClearSelection(); }} />
            <div ref={areaRef} className="relative" style={{ height: trackCount * rowHeight, minWidth: mobile ? undefined : `${timelineZoom * 100}%`, width: mobile && timelineZoom < 1 ? `${timelineZoom * 100}%` : undefined }} onPointerDown={beginMarquee}>
              <div className="flex flex-col gap-1.5">
                {tracks.map((track) => <div key={track} className={`${mobile ? 'h-14' : 'h-20'} border rounded relative overflow-hidden ${selectedTrack === track ? 'border-blue-500 bg-blue-600/15' : 'border-[#2d3037] bg-[#1c1d21]'}`} onPointerDown={beginMarquee} onDoubleClick={(event) => { seekFromEvent(event); if (event.target === event.currentTarget) onClearSelection(); }} onContextMenu={(event) => { if (event.target === event.currentTarget) onContextMenuEmpty(event, track); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }} onDrop={(event) => handleMediaDrop(event, track)}>
                  {(trackClips.get(track) ?? []).map((clip, index) => {
                    const next = (trackClips.get(track) ?? [])[index + 1];
                    const asset = assets.find((item) => item.sourceId === clip.sourceId);
                    const clipWidthPx = (clip.durationInFrames / totalFrames) * areaWidth;
                    const showName = areaWidth > 0 && clipWidthPx > 56;
                    return <TimelineClip key={clip.id} clip={clip} index={index} assetName={asset?.name ?? t('media.videoDefault')} thumbnails={asset?.thumbnails ?? []} showName={showName} trimStart={asset ? Math.max(0, Math.min(1, clip.startFrame / asset.durationInFrames)) : 0} trimEnd={asset ? Math.max(0.001, Math.min(1, (clip.startFrame + clip.durationInFrames) / asset.durationInFrames)) : 1} isSelected={selectedClipIds.includes(clip.id)} locked={Boolean(trackSettings[clip.trackIndex]?.locked)} hasTransition={Boolean(next && next.transitionIn !== 'none')} left={pct(clip.offsetInTimeline)} width={pct(clip.durationInFrames)} transitionLeft={pct(clip.offsetInTimeline + clip.durationInFrames - (next?.transitionDurationInFrames ?? 0))} transitionWidth={pct(next?.transitionDurationInFrames ?? 0)} transitionTitle={`Przejście: ${next?.transitionIn ?? 'none'} — przeciągnij, aby zmienić / przenieść`} transitionLabel={next && next.transitionIn !== 'none' ? `${next.transitionIn} ${next.transitionDurationInFrames}${t('timeline.framesShort')}` : undefined} onContextMenu={(event) => onContextMenuClip(event, clip.id)} onDoubleClick={(event) => { event.stopPropagation(); onSelectClip(clip.id); onSelectTrack(clip.trackIndex); onOpenProperties(); }} onPointerDown={(event) => { event.stopPropagation(); if (event.button !== 0) return; onSelectClip(clip.id, event.ctrlKey || event.metaKey); onSelectTrack(clip.trackIndex); if (trackSettings[clip.trackIndex]?.locked) return; const movingIds = selectedClipIds.includes(clip.id) ? selectedClipIds : clip.groupId ? clips.filter((item) => item.groupId === clip.groupId).map((item) => item.id) : [clip.id]; dragRef.current = { kind: 'clip', clipId: clip.id, clipIds: movingIds, originals: movingIds.map((id) => { const original = clips.find((item) => item.id === id); return { id, offset: original?.offsetInTimeline ?? clip.offsetInTimeline, track: original?.trackIndex ?? clip.trackIndex }; }), startX: event.clientX, startY: event.clientY, originalTrack: clip.trackIndex, moved: false }; }} onClick={(event) => event.stopPropagation()} onTrimLeftPointerDown={(event) => { event.stopPropagation(); dragRef.current = { kind: 'trim-left', clipId: clip.id, startX: event.clientX, originalOffset: clip.offsetInTimeline, originalStartFrame: clip.startFrame, originalDuration: clip.durationInFrames, sourceDuration: asset?.durationInFrames ?? clip.startFrame + clip.durationInFrames, moved: false }; }} onTrimRightPointerDown={(event) => { event.stopPropagation(); dragRef.current = { kind: 'trim-right', clipId: clip.id, startX: event.clientX, originalOffset: clip.offsetInTimeline, originalStartFrame: clip.startFrame, originalDuration: clip.durationInFrames, sourceDuration: asset?.durationInFrames ?? clip.startFrame + clip.durationInFrames, moved: false }; }} onTransitionPointerDown={(event) => { event.stopPropagation(); if (!next) return; onSelectTransition(next.id, next.trackIndex); if (trackSettings[next.trackIndex]?.locked) return; dragRef.current = { kind: 'transition', clipId: next.id, startX: event.clientX, startY: event.clientY, originalTd: next.transitionDurationInFrames, moved: false }; }} onTransitionDoubleClick={(event) => { event.stopPropagation(); if (next) { onSelectTransition(next.id, next.trackIndex); onOpenTransitions(); } }} onTransitionContextMenu={onContextMenuTransition ? (event) => { event.preventDefault(); event.stopPropagation(); onContextMenuTransition(event, next.id, next.trackIndex); } : undefined} />;
                  })}
                </div>)}
              </div>
              {markers.map((marker) => <button key={marker.id} type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onSeek(marker.frame)} title={t('timeline.marker', { frame: String(marker.frame) })} className="absolute top-0 bottom-0 z-20 w-4 -translate-x-1/2" style={{ left: pct(marker.frame) }}><span className="absolute top-0 left-1/2 h-4 w-0.5 -translate-x-1/2 bg-amber-400" /><span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b bg-amber-400 px-1 text-[9px] font-bold text-black">T</span></button>)}
              <div ref={playheadRef} data-testid="timeline-playhead" className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-30 pointer-events-none" />
              {!mobile && selectionBox && <div className="pointer-events-none absolute z-40 border border-blue-400 bg-blue-500/15" style={selectionBox} />}
              {transitionDragLabel && (
                <div
                  className="pointer-events-none fixed z-50 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-white shadow-lg"
                  style={{ left: transitionDragLabel.x + 12, top: transitionDragLabel.y - 20 }}
                >
                  {transitionDragLabel.td} {t('timeline.framesShort')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
