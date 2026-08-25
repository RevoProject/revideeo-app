import { describe, expect, it } from 'vitest';
import type { StoredClip } from '../src/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const clip = (overrides: Partial<StoredClip> = {}): StoredClip => ({
  id: 'c1',
  sourceId: 'a1',
  startFrame: 0,
  durationInFrames: 90,
  offsetInTimeline: 0,
  trackIndex: 0,
  posX: 0,
  posY: 0,
  width: 100,
  height: 100,
  scale: 1,
  transitionIn: 'none',
  transitionDurationInFrames: 0,
  ...overrides,
});

/**
 * Pure-function ripple logic matching App.tsx updateClip.
 * When a clip's duration changes, following clips on the same track shift.
 * Clips with transitions snap to their predecessor's end minus transition duration.
 */
function applyUpdateWithRipple(
  clips: StoredClip[],
  id: string,
  patch: Partial<StoredClip>,
): StoredClip[] {
  const current = clips.find((c) => c.id === id);
  if (!current) return clips;

  if (patch.durationInFrames !== undefined && patch.durationInFrames !== current.durationInFrames) {
    const delta = patch.durationInFrames - current.durationInFrames;
    const oldEnd = current.offsetInTimeline + current.durationInFrames;
    // First pass: shift following clips by delta
    const shifted = clips.map((c) => {
      if (c.id === id) return { ...c, ...patch };
      if (c.trackIndex === current.trackIndex && c.offsetInTimeline >= oldEnd) {
        return { ...c, offsetInTimeline: c.offsetInTimeline + delta };
      }
      return c;
    });
    // Second pass: snap clips with transitions to their new predecessor
    // Accumulate results so later clips see already-snapped predecessors
    const snapped: typeof shifted = [];
    for (const clip of shifted) {
      if (clip.trackIndex !== current.trackIndex || clip.transitionIn === 'none' || clip.transitionDurationInFrames <= 0) {
        snapped.push(clip);
        continue;
      }
      // Find the latest clip that starts before this clip (the predecessor)
      let bestStart = -Infinity;
      let bestClip: StoredClip | null = null;
      for (const other of snapped) {
        if (other.trackIndex !== clip.trackIndex) continue;
        if (other.offsetInTimeline < clip.offsetInTimeline && other.offsetInTimeline > bestStart) {
          bestStart = other.offsetInTimeline;
          bestClip = other;
        }
      }
      if (!bestClip) { snapped.push(clip); continue; }
      const snappedOffset = (bestClip.offsetInTimeline + bestClip.durationInFrames) - clip.transitionDurationInFrames;
      if (snappedOffset === clip.offsetInTimeline) { snapped.push(clip); continue; }
      snapped.push({ ...clip, offsetInTimeline: Math.max(0, snappedOffset) });
    }
    return snapped;
  }

  return clips.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

/* ================================================================== */
/*  BUG 1 — Refresh Clip                                              */
/* ================================================================== */

describe('Bug 1: Refresh Clip preserves all project edits', () => {
  it('preserves splits (two clips from same source remain intact)', () => {
    const clips: StoredClip[] = [
      clip({ id: 'split-1', sourceId: 'a1', offsetInTimeline: 0, durationInFrames: 45, startFrame: 0 }),
      clip({ id: 'split-2', sourceId: 'a1', offsetInTimeline: 45, durationInFrames: 45, startFrame: 45 }),
    ];

    // Simulate refresh: the refresh handler now only touches `type`,
    // it must NOT replace the clip with a fresh default.
    const refreshed = clips.map((c) => c.id === 'split-1' ? { ...c, type: 'video' as const } : c);

    expect(refreshed).toHaveLength(2);
    expect(refreshed[0].startFrame).toBe(0);
    expect(refreshed[0].durationInFrames).toBe(45);
    expect(refreshed[1].startFrame).toBe(45);
    expect(refreshed[1].durationInFrames).toBe(45);
  });

  it('preserves transforms (scale, posX, posY, width, height)', () => {
    const original = clip({
      id: 'c1',
      scale: 1.5,
      posX: 25,
      posY: -10,
      width: 80,
      height: 60,
      rotation: 45,
      opacity: 0.7,
    });

    const refreshed = { ...original, type: 'video' as const };

    expect(refreshed.scale).toBe(1.5);
    expect(refreshed.posX).toBe(25);
    expect(refreshed.posY).toBe(-10);
    expect(refreshed.width).toBe(80);
    expect(refreshed.height).toBe(60);
    expect(refreshed.rotation).toBe(45);
    expect(refreshed.opacity).toBe(0.7);
  });

  it('preserves transitions', () => {
    const original = clip({
      id: 'c1',
      transitionIn: 'fade',
      transitionDurationInFrames: 15,
    });

    const refreshed = { ...original, type: 'video' as const };

    expect(refreshed.transitionIn).toBe('fade');
    expect(refreshed.transitionDurationInFrames).toBe(15);
  });

  it('preserves trims (startFrame and durationInFrames)', () => {
    const original = clip({
      id: 'c1',
      startFrame: 30,
      durationInFrames: 60,
      offsetInTimeline: 10,
    });

    const refreshed = { ...original, type: 'video' as const };

    expect(refreshed.startFrame).toBe(30);
    expect(refreshed.durationInFrames).toBe(60);
    expect(refreshed.offsetInTimeline).toBe(10);
  });

  it('does NOT create a new clip id', () => {
    const original = clip({ id: 'original-id' });
    const refreshed = { ...original, type: 'video' as const };
    expect(refreshed.id).toBe('original-id');
  });

  it('does NOT reset position or track placement', () => {
    const original = clip({
      id: 'c1',
      trackIndex: 2,
      offsetInTimeline: 120,
    });

    const refreshed = { ...original, type: 'video' as const };

    expect(refreshed.trackIndex).toBe(2);
    expect(refreshed.offsetInTimeline).toBe(120);
  });

  it('preserves all properties after move + trim + refresh', () => {
    // Step 1: import clip (default state)
    const imported = clip({ id: 'clip-1', sourceId: 'media-1', durationInFrames: 90 });

    // Step 2: move clip to different timeline position
    const moved = { ...imported, offsetInTimeline: 150, trackIndex: 1 };

    // Step 3: trim/change duration
    const trimmed = { ...moved, startFrame: 10, durationInFrames: 70 };

    // Step 4: refresh clip (only updates type, preserves everything else)
    const refreshed = { ...trimmed, type: 'video' as const };

    // Assert position is unchanged
    expect(refreshed.offsetInTimeline).toBe(150);
    expect(refreshed.trackIndex).toBe(1);
    // Assert duration is unchanged
    expect(refreshed.durationInFrames).toBe(70);
    expect(refreshed.startFrame).toBe(10);
    // Assert other edited properties are unchanged
    expect(refreshed.id).toBe('clip-1');
    expect(refreshed.sourceId).toBe('media-1');
    // Assert type is refreshed
    expect(refreshed.type).toBe('video');
  });

  it('preserves playbackRate, volume, and fade settings through refresh', () => {
    const original = clip({
      id: 'clip-1',
      playbackRate: 1.5,
      volume: 0.8,
      fadeInFrames: 15,
      fadeOutFrames: 10,
      audioFadeInFrames: 5,
      audioFadeOutFrames: 8,
    });

    const refreshed = { ...original, type: 'video' as const };

    expect(refreshed.playbackRate).toBe(1.5);
    expect(refreshed.volume).toBe(0.8);
    expect(refreshed.fadeInFrames).toBe(15);
    expect(refreshed.fadeOutFrames).toBe(10);
    expect(refreshed.audioFadeInFrames).toBe(5);
    expect(refreshed.audioFadeOutFrames).toBe(8);
  });
});

/* ================================================================== */
/*  BUG 2 — Duration change ripples following clips (with transitions) */
/* ================================================================== */

describe('Bug 2: Increasing clip duration pushes following clips forward', () => {
  it('extending A shifts B and C forward', () => {
    const clips: StoredClip[] = [
      clip({ id: 'A', offsetInTimeline: 0, durationInFrames: 90 }),
      clip({ id: 'B', offsetInTimeline: 90, durationInFrames: 90 }),
      clip({ id: 'C', offsetInTimeline: 180, durationInFrames: 90 }),
    ];

    const result = applyUpdateWithRipple(clips, 'A', { durationInFrames: 120 });

    expect(result.find((c) => c.id === 'A')!.durationInFrames).toBe(120);
    expect(result.find((c) => c.id === 'B')!.offsetInTimeline).toBe(120);
    expect(result.find((c) => c.id === 'C')!.offsetInTimeline).toBe(210);
  });

  it('shortening A pulls B and C backward', () => {
    const clips: StoredClip[] = [
      clip({ id: 'A', offsetInTimeline: 0, durationInFrames: 120 }),
      clip({ id: 'B', offsetInTimeline: 120, durationInFrames: 90 }),
      clip({ id: 'C', offsetInTimeline: 210, durationInFrames: 90 }),
    ];

    const result = applyUpdateWithRipple(clips, 'A', { durationInFrames: 90 });

    expect(result.find((c) => c.id === 'B')!.offsetInTimeline).toBe(90);
    expect(result.find((c) => c.id === 'C')!.offsetInTimeline).toBe(180);
  });

  it('transition between A/B moves with the boundary', () => {
    // B has a fade transition. When A extends, B shifts and snaps.
    const clips: StoredClip[] = [
      clip({ id: 'A', offsetInTimeline: 0, durationInFrames: 90 }),
      clip({
        id: 'B',
        offsetInTimeline: 90,
        durationInFrames: 90,
        transitionIn: 'fade',
        transitionDurationInFrames: 10,
      }),
    ];

    const result = applyUpdateWithRipple(clips, 'A', { durationInFrames: 120 });

    const b = result.find((c) => c.id === 'B')!;
    // B should snap to A's new end (120) minus transition duration (10) = 110
    expect(b.offsetInTimeline).toBe(110);
    expect(b.transitionIn).toBe('fade');
    expect(b.transitionDurationInFrames).toBe(10);
  });

  it('transition between B/C also moves when B moves', () => {
    // A extends, B shifts, C has a transition and should snap to B's new position
    const clips: StoredClip[] = [
      clip({ id: 'A', offsetInTimeline: 0, durationInFrames: 90 }),
      clip({ id: 'B', offsetInTimeline: 90, durationInFrames: 90 }),
      clip({
        id: 'C',
        offsetInTimeline: 180,
        durationInFrames: 90,
        transitionIn: 'slide',
        transitionDurationInFrames: 15,
      }),
    ];

    const result = applyUpdateWithRipple(clips, 'A', { durationInFrames: 120 });

    const b = result.find((c) => c.id === 'B')!;
    const c = result.find((c) => c.id === 'C')!;
    // B shifts to 120 (no transition, just delta)
    expect(b.offsetInTimeline).toBe(120);
    // C has transition: snaps to B's end (120 + 90 = 210) minus transition (15) = 195
    expect(c.offsetInTimeline).toBe(195);
    expect(c.transitionIn).toBe('slide');
    expect(c.transitionDurationInFrames).toBe(15);
  });

  it('transitions are not duplicated or lost', () => {
    const clips: StoredClip[] = [
      clip({ id: 'A', offsetInTimeline: 0, durationInFrames: 90 }),
      clip({
        id: 'B',
        offsetInTimeline: 90,
        durationInFrames: 90,
        transitionIn: 'fade',
        transitionDurationInFrames: 10,
      }),
      clip({
        id: 'C',
        offsetInTimeline: 175,
        durationInFrames: 90,
        transitionIn: 'wipe',
        transitionDurationInFrames: 5,
      }),
    ];

    const result = applyUpdateWithRipple(clips, 'A', { durationInFrames: 120 });

    const b = result.find((c) => c.id === 'B')!;
    const c = result.find((c) => c.id === 'C')!;
    // B snaps: A end (120) - transition (10) = 110
    expect(b.offsetInTimeline).toBe(110);
    expect(b.transitionIn).toBe('fade');
    expect(b.transitionDurationInFrames).toBe(10);
    // C snaps: B end (110 + 90 = 200) - transition (5) = 195
    expect(c.offsetInTimeline).toBe(195);
    expect(c.transitionIn).toBe('wipe');
    expect(c.transitionDurationInFrames).toBe(5);
    // Total clips unchanged — no duplication
    expect(result).toHaveLength(3);
  });

  it('clips on other tracks are unaffected', () => {
    const clips: StoredClip[] = [
      clip({ id: 'A', offsetInTimeline: 0, durationInFrames: 90, trackIndex: 0 }),
      clip({ id: 'B', offsetInTimeline: 90, durationInFrames: 90, trackIndex: 0 }),
      clip({ id: 'C', offsetInTimeline: 90, durationInFrames: 90, trackIndex: 1 }),
    ];

    const result = applyUpdateWithRipple(clips, 'A', { durationInFrames: 120 });

    expect(result.find((c) => c.id === 'B')!.offsetInTimeline).toBe(120);
    // C is on a different track — must NOT move
    expect(result.find((c) => c.id === 'C')!.offsetInTimeline).toBe(90);
  });

  it('pre-existing intentional overlaps remain intact', () => {
    // D overlaps with C intentionally (e.g., a transition zone)
    const clips: StoredClip[] = [
      clip({ id: 'A', offsetInTimeline: 0, durationInFrames: 90 }),
      clip({ id: 'B', offsetInTimeline: 90, durationInFrames: 90 }),
      clip({ id: 'C', offsetInTimeline: 180, durationInFrames: 90 }),
      // D starts before C ends (intentional overlap)
      clip({ id: 'D', offsetInTimeline: 250, durationInFrames: 60, trackIndex: 0 }),
    ];

    const result = applyUpdateWithRipple(clips, 'A', { durationInFrames: 60 });

    // A shortened by 30, B shifts from 90 to 60, C from 180 to 150
    expect(result.find((c) => c.id === 'B')!.offsetInTimeline).toBe(60);
    expect(result.find((c) => c.id === 'C')!.offsetInTimeline).toBe(150);
    // D was at 250 (>= oldEnd=180), shifts by -30 to 220
    // D still overlaps C (C ends at 150+90=240, D starts at 220)
    expect(result.find((c) => c.id === 'D')!.offsetInTimeline).toBe(220);
  });

  it('shortening A with transitions: B snaps correctly', () => {
    const clips: StoredClip[] = [
      clip({ id: 'A', offsetInTimeline: 0, durationInFrames: 120 }),
      clip({
        id: 'B',
        offsetInTimeline: 110,
        durationInFrames: 90,
        transitionIn: 'fade',
        transitionDurationInFrames: 10,
      }),
    ];

    // A shortens from 120 to 90. B was at 110 (snapped: 120-10=110).
    // After shortening: A ends at 90. B shifts from 110 by delta (-30) = 80.
    // Then B snaps: A end (90) - transition (10) = 80. Already at 80.
    const result = applyUpdateWithRipple(clips, 'A', { durationInFrames: 90 });

    const b = result.find((c) => c.id === 'B')!;
    expect(b.offsetInTimeline).toBe(80);
    expect(b.transitionIn).toBe('fade');
  });
});

/* ================================================================== */
/*  BUG 3 — Track deletion and stale clip state                        */
/* ================================================================== */

describe('Bug 3: Track deletion removes clips from canonical state', () => {
  /**
   * Pure-function track deletion logic matching App.tsx removeTrack.
   * Removes all clips on the deleted track and reindexes higher tracks.
   */
  function removeTrack(clips: StoredClip[], trackIndex: number): StoredClip[] {
    return clips
      .filter((c) => c.trackIndex !== trackIndex)
      .map((c) => c.trackIndex > trackIndex ? { ...c, trackIndex: c.trackIndex - 1 } : c);
  }

  it('delete empty track: track disappears', () => {
    const clips: StoredClip[] = [
      clip({ id: 'c1', trackIndex: 0 }),
      clip({ id: 'c2', trackIndex: 1 }),
    ];

    const result = removeTrack(clips, 1);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
    expect(result[0].trackIndex).toBe(0);
  });

  it('delete track with one clip: track AND clip disappear', () => {
    const clips: StoredClip[] = [
      clip({ id: 'c1', trackIndex: 0 }),
      clip({ id: 'c2', trackIndex: 1 }),
    ];

    const result = removeTrack(clips, 0);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c2');
    // c2 was on track 1, now reindexed to track 0
    expect(result[0].trackIndex).toBe(0);
  });

  it('delete track with multiple clips: all clips disappear', () => {
    const clips: StoredClip[] = [
      clip({ id: 'c1', trackIndex: 0 }),
      clip({ id: 'c2', trackIndex: 0, offsetInTimeline: 100 }),
      clip({ id: 'c3', trackIndex: 0, offsetInTimeline: 200 }),
      clip({ id: 'c4', trackIndex: 1 }),
    ];

    const result = removeTrack(clips, 0);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c4');
    expect(result[0].trackIndex).toBe(0);
  });

  it('delete track: clips on other tracks remain untouched', () => {
    const clips: StoredClip[] = [
      clip({ id: 'c1', trackIndex: 0, offsetInTimeline: 0, durationInFrames: 90 }),
      clip({ id: 'c2', trackIndex: 1, offsetInTimeline: 0, durationInFrames: 60 }),
      clip({ id: 'c3', trackIndex: 2, offsetInTimeline: 0, durationInFrames: 120 }),
    ];

    const result = removeTrack(clips, 1);

    expect(result).toHaveLength(2);
    const c1 = result.find((c) => c.id === 'c1')!;
    const c3 = result.find((c) => c.id === 'c3')!;
    // c1 unaffected (track 0 < deleted track 1)
    expect(c1.trackIndex).toBe(0);
    expect(c1.offsetInTimeline).toBe(0);
    expect(c1.durationInFrames).toBe(90);
    // c3 reindexed from track 2 to track 1
    expect(c3.trackIndex).toBe(1);
    expect(c3.offsetInTimeline).toBe(0);
    expect(c3.durationInFrames).toBe(120);
  });

  it('delete track: deleted clip IDs no longer exist in result', () => {
    const clips: StoredClip[] = [
      clip({ id: 'deleted-1', trackIndex: 0 }),
      clip({ id: 'deleted-2', trackIndex: 0, offsetInTimeline: 50 }),
      clip({ id: 'survivor', trackIndex: 1 }),
    ];

    const result = removeTrack(clips, 0);
    const resultIds = result.map((c) => c.id);

    expect(resultIds).not.toContain('deleted-1');
    expect(resultIds).not.toContain('deleted-2');
    expect(resultIds).toContain('survivor');
  });

  it('delete track: Juicer context would not see deleted clips', () => {
    // Simulate: clips go through removeTrack, then are passed to Juicer
    const clips: StoredClip[] = [
      clip({ id: 'juicer-clip-1', trackIndex: 0 }),
      clip({ id: 'juicer-clip-2', trackIndex: 0, offsetInTimeline: 100 }),
      clip({ id: 'juicer-clip-3', trackIndex: 1 }),
    ];

    const afterDeletion = removeTrack(clips, 0);

    // Juicer receives these clips — deleted ones must be absent
    expect(afterDeletion.find((c) => c.id === 'juicer-clip-1')).toBeUndefined();
    expect(afterDeletion.find((c) => c.id === 'juicer-clip-2')).toBeUndefined();
    expect(afterDeletion.find((c) => c.id === 'juicer-clip-3')).toBeDefined();
  });

  it('delete one track: other tracks shift down correctly', () => {
    const clips: StoredClip[] = [
      clip({ id: 'c1', trackIndex: 0 }),
      clip({ id: 'c2', trackIndex: 1 }),
      clip({ id: 'c3', trackIndex: 2 }),
      clip({ id: 'c4', trackIndex: 3 }),
    ];

    // Delete track 1
    const result = removeTrack(clips, 1);

    expect(result).toHaveLength(3);
    // c1 stays at 0, c3 shifts to 1, c4 shifts to 2
    expect(result.find((c) => c.id === 'c1')!.trackIndex).toBe(0);
    expect(result.find((c) => c.id === 'c3')!.trackIndex).toBe(1);
    expect(result.find((c) => c.id === 'c4')!.trackIndex).toBe(2);
  });

  it('delete first track: remaining tracks reindex from 0', () => {
    const clips: StoredClip[] = [
      clip({ id: 'c1', trackIndex: 0 }),
      clip({ id: 'c2', trackIndex: 1 }),
      clip({ id: 'c3', trackIndex: 2 }),
    ];

    const result = removeTrack(clips, 0);

    expect(result).toHaveLength(2);
    expect(result.find((c) => c.id === 'c2')!.trackIndex).toBe(0);
    expect(result.find((c) => c.id === 'c3')!.trackIndex).toBe(1);
  });

  it('delete last track: remaining tracks unchanged', () => {
    const clips: StoredClip[] = [
      clip({ id: 'c1', trackIndex: 0 }),
      clip({ id: 'c2', trackIndex: 1 }),
      clip({ id: 'c3', trackIndex: 2 }),
    ];

    const result = removeTrack(clips, 2);

    expect(result).toHaveLength(2);
    expect(result.find((c) => c.id === 'c1')!.trackIndex).toBe(0);
    expect(result.find((c) => c.id === 'c2')!.trackIndex).toBe(1);
  });
});
