import { describe, expect, it } from 'vitest';
import { rippleDeleteClips } from '../src/editor/timeline/utils/timelineMutations';
import type { StoredClip } from '../src/types';

const clip = (id: string, offsetInTimeline: number, durationInFrames: number, overrides: Partial<StoredClip> = {}): StoredClip => ({
  id,
  sourceId: id,
  trackIndex: 0,
  offsetInTimeline,
  startFrame: 0,
  durationInFrames,
  scale: 1,
  posX: 0,
  transitionIn: 'none',
  transitionDurationInFrames: 0,
  ...overrides,
});

describe('rippleDeleteClips', () => {
  it('deletes a middle clip and shifts every later clip on the same track', () => {
    const result = rippleDeleteClips([
      clip('a', 0, 10),
      clip('b', 10, 5),
      clip('c', 20, 5),
      clip('d', 30, 5),
    ], ['b'], new Set());

    expect(result.map(({ id, offsetInTimeline }) => [id, offsetInTimeline])).toEqual([
      ['a', 0],
      ['c', 15],
      ['d', 25],
    ]);
  });

  it('keeps clips on other tracks unchanged', () => {
    const otherTrack = clip('other', 20, 5, { trackIndex: 1 });
    const result = rippleDeleteClips([clip('delete', 10, 5), otherTrack], ['delete'], new Set());
    expect(result).toContain(otherTrack);
  });

  it('merges adjacent selected ranges before shifting', () => {
    const result = rippleDeleteClips([
      clip('a', 0, 5),
      clip('b', 5, 5),
      clip('c', 10, 5),
      clip('d', 20, 5),
    ], ['b', 'c'], new Set());
    expect(result.find((item) => item.id === 'd')?.offsetInTimeline).toBe(10);
  });

  it('applies discontiguous deleted ranges cumulatively', () => {
    const result = rippleDeleteClips([
      clip('a', 0, 5),
      clip('b', 5, 5),
      clip('c', 15, 5),
      clip('d', 20, 5),
      clip('e', 30, 5),
    ], ['b', 'd'], new Set());
    expect(result.find((item) => item.id === 'c')?.offsetInTimeline).toBe(10);
    expect(result.find((item) => item.id === 'e')?.offsetInTimeline).toBe(20);
  });

  it('deletes every member of a selected group', () => {
    const result = rippleDeleteClips([
      clip('video', 5, 5, { groupId: 'g' }),
      clip('audio', 5, 5, { groupId: 'g', trackIndex: 1 }),
      clip('later-video', 15, 5),
      clip('later-audio', 15, 5, { trackIndex: 1 }),
    ], ['video'], new Set());
    expect(result.map((item) => item.id)).toEqual(['later-video', 'later-audio']);
    expect(result.map((item) => item.offsetInTimeline)).toEqual([10, 10]);
  });

  it('does nothing when the selection includes a locked track', () => {
    const input = [clip('a', 0, 5), clip('b', 5, 5, { trackIndex: 1 })];
    expect(rippleDeleteClips(input, ['b'], new Set([1]))).toBe(input);
  });

  it('repairs a transition on the shifted successor', () => {
    const result = rippleDeleteClips([
      clip('a', 0, 10),
      clip('delete', 10, 5),
      clip('c', 15, 10, { transitionIn: 'fade', transitionDurationInFrames: 2 }),
    ], ['delete'], new Set());
    expect(result.find((item) => item.id === 'c')?.offsetInTimeline).toBe(8);
  });
});
