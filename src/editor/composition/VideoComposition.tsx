/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { useMemo } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import type { OutgoingTransition, RenderClip } from '../editorTypes';
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

const useOutgoingMap = (tracks: [number, RenderClip[]][]) => {
  return useMemo(() => {
    const map = new Map<string, OutgoingTransition | undefined>();
    for (const [, trackClips] of tracks) {
      for (let i = 0; i < trackClips.length; i++) {
        const clip = trackClips[i];
        const next = trackClips[i + 1];
        const outgoing: OutgoingTransition | undefined =
          next && next.offsetInTimeline < clip.offsetInTimeline + clip.durationInFrames
            ? { transitionIn: next.transitionIn, durationInFrames: next.transitionDurationInFrames }
            : undefined;
        map.set(clip.id, outgoing);
      }
    }
    return map;
  }, [tracks]);
};

export const VideoComposition = ({ clips, trackSettings, compositionWidth, compositionHeight }: { clips: RenderClip[]; trackSettings: TrackSettings[]; compositionWidth?: number; compositionHeight?: number }) => {
  const { t } = useTranslation();
  const frame = useCurrentFrame();
  const tracks = useMemo(() => groupByTrack(clips), [clips]);
  const outgoingMap = useOutgoingMap(tracks);
  const cw = compositionWidth ?? compositionHeight;
  const ch = compositionHeight ?? compositionWidth;
  const isPortrait = ch != null && cw != null && ch > cw;
  if (clips.length === 0) return <AbsoluteFill style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}><p className={`${isPortrait ? 'text-3xl' : 'text-lg'} font-bold text-gray-500`}>{t('media.noVideo')}</p></AbsoluteFill>;
  return <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>{tracks.map(([trackIndex, trackClips]) => <AbsoluteFill key={trackIndex} style={{ zIndex: trackIndex, opacity: trackSettings[trackIndex]?.hidden ? 0 : 1, pointerEvents: trackSettings[trackIndex]?.hidden ? 'none' : undefined }}>{trackClips.map((clip) => <Sequence key={clip.id} from={clip.offsetInTimeline} durationInFrames={clip.durationInFrames}><ClipLayer clip={clip} outgoing={outgoingMap.get(clip.id)} muted={trackSettings[trackIndex]?.muted ?? false} frame={frame - clip.offsetInTimeline} /></Sequence>)}</AbsoluteFill>)}</AbsoluteFill>;
};
