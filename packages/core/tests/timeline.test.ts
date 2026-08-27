/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { describe, it, expect, vi } from 'vitest';
import { createTimelineContext } from '../src/timeline/context.js';
import type { TimelineProvider } from '../src/timeline/provider.js';
import type { TimelineState, TimelineClipInfo, TimelineTrackInfo } from '../src/timeline/types.js';

const makeState = (overrides: Partial<TimelineState> = {}): TimelineState => ({
  frame: 0,
  time: 0,
  fps: 30,
  durationInFrames: 90,
  durationInSeconds: 3,
  contentDurationInFrames: 90,
  contentDurationInSeconds: 3,
  isPlaying: false,
  ...overrides,
});

const makeClip = (overrides: Partial<TimelineClipInfo> = {}): TimelineClipInfo => ({
  id: 'c1',
  type: 'video',
  sourceId: 's1',
  trackIndex: 0,
  offsetInTimeline: 0,
  startFrame: 0,
  durationInFrames: 60,
  transitionIn: 'none',
  ...overrides,
});

const makeTrack = (overrides: Partial<TimelineTrackInfo> = {}): TimelineTrackInfo => ({
  index: 0,
  name: 'Track 1',
  locked: false,
  muted: false,
  hidden: false,
  ...overrides,
});

function makeProvider(overrides: Partial<TimelineProvider> = {}): TimelineProvider {
  return {
    getState: () => makeState(),
    getClips: () => [makeClip()],
    getTracks: () => [makeTrack()],
    seekTo: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    ...overrides,
  };
}

describe('TimelineContext', () => {
  describe('getState', () => {
    it('returns snapshot from provider', () => {
      const api = createTimelineContext(makeProvider());
      expect(api.getState()).toEqual(makeState());
    });

    it('returns frame 0 state', () => {
      const api = createTimelineContext(makeProvider({
        getState: () => makeState({ frame: 0, time: 0 }),
      }));
      const s = api.getState();
      expect(s.frame).toBe(0);
      expect(s.time).toBe(0);
    });

    it('returns middle frame state', () => {
      const api = createTimelineContext(makeProvider({
        getState: () => makeState({ frame: 45, time: 1.5 }),
      }));
      const s = api.getState();
      expect(s.frame).toBe(45);
      expect(s.time).toBe(1.5);
    });

    it('returns isPlaying state', () => {
      const api = createTimelineContext(makeProvider({
        getState: () => makeState({ isPlaying: true }),
      }));
      expect(api.getState().isPlaying).toBe(true);
    });

    it('calculates durationInSeconds from fps', () => {
      const api = createTimelineContext(makeProvider({
        getState: () => makeState({ durationInFrames: 120, fps: 30, durationInSeconds: 4 }),
      }));
      expect(api.getState().durationInSeconds).toBe(4);
    });

    it('returns content duration', () => {
      const api = createTimelineContext(makeProvider({
        getState: () => makeState({ contentDurationInFrames: 60, contentDurationInSeconds: 2 }),
      }));
      const s = api.getState();
      expect(s.contentDurationInFrames).toBe(60);
      expect(s.contentDurationInSeconds).toBe(2);
    });

    it('different fps produces different time', () => {
      const api24 = createTimelineContext(makeProvider({
        getState: () => makeState({ fps: 24, time: 1.2 }),
      }));
      const api60 = createTimelineContext(makeProvider({
        getState: () => makeState({ fps: 60, time: 0.5 }),
      }));
      expect(api24.getState().time).not.toBe(api60.getState().time);
    });
  });

  describe('seekTo', () => {
    it('delegates to provider', () => {
      const seekTo = vi.fn();
      const api = createTimelineContext(makeProvider({ seekTo }));
      api.seekTo(50);
      expect(seekTo).toHaveBeenCalledWith(50);
    });
  });

  describe('playback control', () => {
    it('play delegates to provider', () => {
      const play = vi.fn();
      const api = createTimelineContext(makeProvider({ play }));
      api.play();
      expect(play).toHaveBeenCalled();
    });

    it('pause delegates to provider', () => {
      const pause = vi.fn();
      const api = createTimelineContext(makeProvider({ pause }));
      api.pause();
      expect(pause).toHaveBeenCalled();
    });

    it('toggle delegates to provider', () => {
      const toggle = vi.fn();
      const api = createTimelineContext(makeProvider({ toggle }));
      api.toggle();
      expect(toggle).toHaveBeenCalled();
    });
  });

  describe('getClips', () => {
    it('returns clips from provider', () => {
      const api = createTimelineContext(makeProvider({
        getClips: () => [makeClip({ id: 'c1' }), makeClip({ id: 'c2', offsetInTimeline: 60 })],
      }));
      expect(api.getClips()).toHaveLength(2);
    });

    it('returns empty array for empty provider', () => {
      const api = createTimelineContext(makeProvider({ getClips: () => [] }));
      expect(api.getClips()).toHaveLength(0);
    });

    it('returns TimelineClipInfo subset', () => {
      const clip = makeClip({ id: 'c1', type: 'video', sourceId: 's1', trackIndex: 0 });
      const api = createTimelineContext(makeProvider({ getClips: () => [clip] }));
      const info = api.getClips()[0];
      expect(info.id).toBe('c1');
      expect(info.type).toBe('video');
      expect(info.sourceId).toBe('s1');
      expect(info.trackIndex).toBe(0);
    });
  });

  describe('getClipById', () => {
    it('returns clip by id', () => {
      const api = createTimelineContext(makeProvider({
        getClips: () => [makeClip({ id: 'c1' }), makeClip({ id: 'c2', offsetInTimeline: 60 })],
      }));
      expect(api.getClipById('c2')!.offsetInTimeline).toBe(60);
    });

    it('returns null for unknown id', () => {
      const api = createTimelineContext(makeProvider({
        getClips: () => [makeClip({ id: 'c1' })],
      }));
      expect(api.getClipById('unknown')).toBeNull();
    });
  });

  describe('getClipsAtFrame', () => {
    it('returns clips visible at frame', () => {
      const api = createTimelineContext(makeProvider({
        getClips: () => [
          makeClip({ id: 'c1', offsetInTimeline: 0, durationInFrames: 60 }),
          makeClip({ id: 'c2', offsetInTimeline: 50, durationInFrames: 60 }),
        ],
      }));
      const at55 = api.getClipsAtFrame(55);
      expect(at55).toHaveLength(2);
    });

    it('returns empty when no clips at frame', () => {
      const api = createTimelineContext(makeProvider({
        getClips: () => [makeClip({ id: 'c1', offsetInTimeline: 0, durationInFrames: 30 })],
      }));
      expect(api.getClipsAtFrame(50)).toHaveLength(0);
    });

    it('handles boundary: clip starts at frame', () => {
      const api = createTimelineContext(makeProvider({
        getClips: () => [makeClip({ offsetInTimeline: 10, durationInFrames: 5 })],
      }));
      expect(api.getClipsAtFrame(10)).toHaveLength(1);
    });

    it('handles boundary: clip ends at frame (exclusive)', () => {
      const api = createTimelineContext(makeProvider({
        getClips: () => [makeClip({ offsetInTimeline: 10, durationInFrames: 5 })],
      }));
      expect(api.getClipsAtFrame(15)).toHaveLength(0);
    });
  });

  describe('getTracks', () => {
    it('returns tracks from provider', () => {
      const api = createTimelineContext(makeProvider({
        getTracks: () => [makeTrack({ index: 0, name: 'Track 1' }), makeTrack({ index: 1, name: 'Track 2' })],
      }));
      expect(api.getTracks()).toHaveLength(2);
    });

    it('returns empty array for empty provider', () => {
      const api = createTimelineContext(makeProvider({ getTracks: () => [] }));
      expect(api.getTracks()).toHaveLength(0);
    });
  });

  describe('getTrack', () => {
    it('returns track by index', () => {
      const api = createTimelineContext(makeProvider({
        getTracks: () => [makeTrack({ index: 0, name: 'A' }), makeTrack({ index: 1, name: 'B' })],
      }));
      expect(api.getTrack(1)!.name).toBe('B');
    });

    it('returns null for unknown index', () => {
      const api = createTimelineContext(makeProvider({
        getTracks: () => [makeTrack({ index: 0 })],
      }));
      expect(api.getTrack(5)).toBeNull();
    });
  });

  describe('determinism', () => {
    it('same inputs produce same state', () => {
      const provider = makeProvider({ getState: () => makeState({ frame: 42 }) });
      const api = createTimelineContext(provider);
      expect(api.getState()).toEqual(api.getState());
    });

    it('getClips is stable across calls', () => {
      const provider = makeProvider({
        getClips: () => [makeClip({ id: 'c1' }), makeClip({ id: 'c2' })],
      });
      const api = createTimelineContext(provider);
      const a = api.getClips();
      const b = api.getClips();
      expect(a).toEqual(b);
    });
  });

  describe('isolation', () => {
    it('does not expose internal provider', () => {
      const api = createTimelineContext(makeProvider());
      expect(api).not.toHaveProperty('provider');
    });
  });
});
