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
  const cw = compositionWidth ?? compositionHeight;
  const ch = compositionHeight ?? compositionWidth;
  const isPortrait = ch != null && cw != null && ch > cw;
  if (clips.length === 0) return <AbsoluteFill style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}><p className={`${isPortrait ? 'text-3xl' : 'text-lg'} font-bold text-gray-500`}>{t('media.noVideo')}</p></AbsoluteFill>;
  return <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>{tracks.map(([trackIndex, trackClips]) => <AbsoluteFill key={trackIndex} style={{ zIndex: trackIndex, opacity: trackSettings[trackIndex]?.hidden ? 0 : 1, pointerEvents: trackSettings[trackIndex]?.hidden ? 'none' : undefined }}>{trackClips.map((clip, index) => { const next = trackClips[index + 1]; const outgoing = next && next.offsetInTimeline < clip.offsetInTimeline + clip.durationInFrames ? { transitionIn: next.transitionIn, durationInFrames: next.transitionDurationInFrames } : undefined; return <Sequence key={clip.id} from={clip.offsetInTimeline} durationInFrames={clip.durationInFrames}><ClipLayer clip={clip} outgoing={outgoing} muted={trackSettings[trackIndex]?.muted ?? false} frame={frame - clip.offsetInTimeline} /></Sequence>; })}</AbsoluteFill>)}</AbsoluteFill>;
};
