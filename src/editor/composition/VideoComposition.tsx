import { useMemo } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import type { RenderClip } from '../editorTypes';
import type { TrackSettings } from '../../types';
import { ClipLayer } from './ClipLayer';
import { useTranslation } from '../../i18n';

const groupByTrack = (clips: RenderClip[]) => {
  const grouped = new Map<number, RenderClip[]>();
  clips.forEach((clip) => {
    const track = grouped.get(clip.trackIndex);
    if (track) track.push(clip);
    else grouped.set(clip.trackIndex, [clip]);
  });
  grouped.forEach((items) => items.sort((a, b) => a.offsetInTimeline - b.offsetInTimeline));
  return [...grouped.entries()].sort(([a], [b]) => a - b);
};

export const VideoComposition = ({ clips, trackSettings, compositionWidth, compositionHeight }: { clips: RenderClip[]; trackSettings: TrackSettings[]; compositionWidth?: number; compositionHeight?: number }) => {
  const { t } = useTranslation();
  const frame = useCurrentFrame();
  const tracks = useMemo(() => groupByTrack(clips), [clips]);
  const isPortrait = compositionHeight && compositionWidth && compositionHeight > compositionWidth;
  const clipScale = isPortrait ? 1.2 : 1.15;
  if (clips.length === 0) return <AbsoluteFill style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}><p className={`${isPortrait ? 'text-3xl' : 'text-lg'} font-bold text-gray-500`}>{t('media.noVideo')}</p></AbsoluteFill>;
  return <AbsoluteFill style={{ backgroundColor: '#000' }}>{tracks.map(([trackIndex, trackClips]) => <AbsoluteFill key={trackIndex} style={{ zIndex: trackIndex, opacity: trackSettings[trackIndex]?.hidden ? 0 : 1, pointerEvents: trackSettings[trackIndex]?.hidden ? 'none' : undefined }}>{trackClips.map((clip, index) => { const next = trackClips[index + 1]; const outgoing = next && next.offsetInTimeline < clip.offsetInTimeline + clip.durationInFrames ? { transitionIn: next.transitionIn, durationInFrames: next.transitionDurationInFrames } : undefined; const scaledClip = clip.type !== 'text' && clip.type !== 'audio' ? { ...clip, scale: (clip.scale ?? 1) * clipScale } : clip; return <Sequence key={clip.id} from={clip.offsetInTimeline} durationInFrames={clip.durationInFrames}><ClipLayer clip={scaledClip} outgoing={outgoing} muted={trackSettings[trackIndex]?.muted ?? false} frame={frame - clip.offsetInTimeline} /></Sequence>; })}</AbsoluteFill>)}</AbsoluteFill>;
};
