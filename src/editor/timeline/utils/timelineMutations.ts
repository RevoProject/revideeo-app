/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { StoredClip } from '../../../types';

interface Interval {
  start: number;
  end: number;
}

const mergeIntervals = (intervals: Interval[]): Interval[] => {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (!previous || interval.start > previous.end) merged.push({ ...interval });
    else previous.end = Math.max(previous.end, interval.end);
  }
  return merged;
};

const snapTransitions = (clips: StoredClip[], affectedTracks: ReadonlySet<number>): StoredClip[] => {
  const result = [...clips];
  for (const trackIndex of affectedTracks) {
    const trackClips = result
      .filter((clip) => clip.trackIndex === trackIndex)
      .sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
    for (let index = 1; index < trackClips.length; index += 1) {
      const clip = trackClips[index];
      if (clip.transitionIn === 'none' || clip.transitionDurationInFrames <= 0) continue;
      const previous = trackClips[index - 1];
      const offsetInTimeline = Math.max(0, previous.offsetInTimeline + previous.durationInFrames - clip.transitionDurationInFrames);
      if (offsetInTimeline === clip.offsetInTimeline) continue;
      const updated = { ...clip, offsetInTimeline };
      trackClips[index] = updated;
      result[result.findIndex((item) => item.id === clip.id)] = updated;
    }
  }
  return result;
};

export const rippleDeleteClips = (
  clips: StoredClip[],
  selectedIds: readonly string[],
  lockedTracks: ReadonlySet<number>,
): StoredClip[] => {
  if (selectedIds.length === 0) return clips;

  const deleteIds = new Set(selectedIds);
  const selectedGroups = new Set(
    clips.filter((clip) => deleteIds.has(clip.id) && clip.groupId).map((clip) => clip.groupId),
  );
  for (const clip of clips) {
    if (clip.groupId && selectedGroups.has(clip.groupId)) deleteIds.add(clip.id);
  }

  const deleted = clips.filter((clip) => deleteIds.has(clip.id));
  if (deleted.length === 0 || deleted.some((clip) => lockedTracks.has(clip.trackIndex))) return clips;

  const intervalsByTrack = new Map<number, Interval[]>();
  for (const clip of deleted) {
    const intervals = intervalsByTrack.get(clip.trackIndex) ?? [];
    intervals.push({ start: clip.offsetInTimeline, end: clip.offsetInTimeline + clip.durationInFrames });
    intervalsByTrack.set(clip.trackIndex, intervals);
  }
  for (const [trackIndex, intervals] of intervalsByTrack) {
    intervalsByTrack.set(trackIndex, mergeIntervals(intervals));
  }

  const remaining = clips
    .filter((clip) => !deleteIds.has(clip.id))
    .map((clip) => {
      const intervals = intervalsByTrack.get(clip.trackIndex);
      if (!intervals) return clip;
      const shift = intervals.reduce((sum, interval) => (
        clip.offsetInTimeline >= interval.end ? sum + interval.end - interval.start : sum
      ), 0);
      return shift > 0 ? { ...clip, offsetInTimeline: Math.max(0, clip.offsetInTimeline - shift) } : clip;
    });

  return snapTransitions(remaining, new Set(intervalsByTrack.keys()));
};
