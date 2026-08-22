import type { ManifestClip, ManifestTrackSettings } from './types.js';

export function computeContentDuration(
  clips: readonly ManifestClip[],
  trackSettings: readonly ManifestTrackSettings[],
): number {
  let latestFrame = 0;
  for (const clip of clips) {
    const track = trackSettings[clip.trackIndex];
    if (track?.hidden) continue;
    const clipEnd = clip.offsetInTimeline + clip.durationInFrames;
    if (clipEnd > latestFrame) {
      latestFrame = clipEnd;
    }
  }
  return Math.max(latestFrame, 1);
}

export function findClipEndFrame(clip: ManifestClip): number {
  return clip.offsetInTimeline + clip.durationInFrames;
}

export function getClipsOnTrack(
  clips: readonly ManifestClip[],
  trackIndex: number,
): readonly ManifestClip[] {
  const result: ManifestClip[] = [];
  for (const clip of clips) {
    if (clip.trackIndex === trackIndex) {
      result.push(clip);
    }
  }
  return result;
}

export function sortByOffset(clips: readonly ManifestClip[]): ManifestClip[] {
  return [...clips].sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
}

export function computeTrackDuration(
  clips: readonly ManifestClip[],
  trackIndex: number,
): number {
  let latest = 0;
  for (const clip of clips) {
    if (clip.trackIndex !== trackIndex) continue;
    const end = clip.offsetInTimeline + clip.durationInFrames;
    if (end > latest) latest = end;
  }
  return latest;
}

export function framesToSeconds(frames: number, fps: number): number {
  if (fps <= 0) return 0;
  return Math.round((frames / fps) * 1000) / 1000;
}

export function secondsToFrames(seconds: number, fps: number): number {
  if (fps <= 0) return 0;
  return Math.max(1, Math.round(seconds * fps));
}
