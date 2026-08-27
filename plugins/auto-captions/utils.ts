import type { TranscriptionSegment, Caption } from './types';

export function segmentsToCaptions(
  segments: TranscriptionSegment[],
  clipOffsetInTimeline: number,
  fps: number,
): Caption[] {
  return segments
    .filter((s) => s.text.trim().length > 0)
    .map((s, i) => ({
      id: `cap-${clipOffsetInTimeline}-${i}`,
      text: s.text.trim(),
      startFrame: clipOffsetInTimeline + Math.round(s.start * fps),
      durationFrames: Math.max(1, Math.round((s.end - s.start) * fps)),
    }));
}

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}
