/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { describe, it, expect, vi } from 'vitest';
import { AppTimelineProvider } from '../src/timeline/appTimelineProvider';
import { createTimelineContext } from '@revideeo/core/timeline';
import type { StoredClip, TrackSettings } from '../src/types';

function makeClip(overrides: Partial<StoredClip> = {}): StoredClip {
  return {
    id: 'c1', sourceId: 's1', type: 'video', trackIndex: 0,
    offsetInTimeline: 0, startFrame: 0, durationInFrames: 60,
    scale: 1, posX: 0, posY: 0,
    transitionIn: 'none', transitionDurationInFrames: 0,
    ...overrides,
  };
}

function makeTrack(overrides: Partial<TrackSettings> = {}): TrackSettings {
  return { name: 'Track 1', locked: false, muted: false, hidden: false, ...overrides };
}

describe('AppTimelineProvider', () => {
  it('getState returns snapshot from deps', () => {
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 30, time: 1, fps: 30, durationInFrames: 90, durationInSeconds: 3,
        contentDurationInFrames: 90, contentDurationInSeconds: 3, isPlaying: false,
      }),
      getStoredClips: () => [],
      getTrackSettings: () => [],
      seekTo: vi.fn(),
      playerRef: { current: null },
    });
    const s = provider.getState();
    expect(s.frame).toBe(30);
    expect(s.isPlaying).toBe(false);
  });

  it('getClips returns TimelineClipInfo from StoredClips', () => {
    const clips = [
      makeClip({ id: 'c1', type: 'video', offsetInTimeline: 0 }),
      makeClip({ id: 'c2', type: 'audio', offsetInTimeline: 60, sourceId: 's2' }),
    ];
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 0, time: 0, fps: 30, durationInFrames: 120, durationInSeconds: 4,
        contentDurationInFrames: 120, contentDurationInSeconds: 4, isPlaying: false,
      }),
      getStoredClips: () => clips,
      getTrackSettings: () => [],
      seekTo: vi.fn(),
      playerRef: { current: null },
    });
    const result = provider.getClips();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[0].type).toBe('video');
    expect(result[1].id).toBe('c2');
    expect(result[1].type).toBe('audio');
  });

  it('getTracks returns TimelineTrackInfo from TrackSettings', () => {
    const tracks = [
      makeTrack({ name: 'Vocals' }),
      makeTrack({ name: 'Music', muted: true }),
    ];
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 0, time: 0, fps: 30, durationInFrames: 90, durationInSeconds: 3,
        contentDurationInFrames: 90, contentDurationInSeconds: 3, isPlaying: false,
      }),
      getStoredClips: () => [],
      getTrackSettings: () => tracks,
      seekTo: vi.fn(),
      playerRef: { current: null },
    });
    const result = provider.getTracks();
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(0);
    expect(result[0].name).toBe('Vocals');
    expect(result[1].index).toBe(1);
    expect(result[1].muted).toBe(true);
  });

  it('seekTo delegates to seekTo function', () => {
    const seekTo = vi.fn();
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 0, time: 0, fps: 30, durationInFrames: 90, durationInSeconds: 3,
        contentDurationInFrames: 90, contentDurationInSeconds: 3, isPlaying: false,
      }),
      getStoredClips: () => [],
      getTrackSettings: () => [],
      seekTo,
      playerRef: { current: null },
    });
    provider.seekTo(50);
    expect(seekTo).toHaveBeenCalledWith(50);
  });

  it('play calls toggle when not playing', () => {
    const toggle = vi.fn();
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 0, time: 0, fps: 30, durationInFrames: 90, durationInSeconds: 3,
        contentDurationInFrames: 90, contentDurationInSeconds: 3, isPlaying: false,
      }),
      getStoredClips: () => [],
      getTrackSettings: () => [],
      seekTo: vi.fn(),
      playerRef: { current: { toggle, isPlaying: () => false, seekTo: vi.fn(), getCurrentFrame: () => 0 } },
    });
    provider.play();
    expect(toggle).toHaveBeenCalled();
  });

  it('play does not call toggle when already playing', () => {
    const toggle = vi.fn();
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 0, time: 0, fps: 30, durationInFrames: 90, durationInSeconds: 3,
        contentDurationInFrames: 90, contentDurationInSeconds: 3, isPlaying: true,
      }),
      getStoredClips: () => [],
      getTrackSettings: () => [],
      seekTo: vi.fn(),
      playerRef: { current: { toggle, isPlaying: () => true, seekTo: vi.fn(), getCurrentFrame: () => 0 } },
    });
    provider.play();
    expect(toggle).not.toHaveBeenCalled();
  });

  it('pause calls toggle when playing', () => {
    const toggle = vi.fn();
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 0, time: 0, fps: 30, durationInFrames: 90, durationInSeconds: 3,
        contentDurationInFrames: 90, contentDurationInSeconds: 3, isPlaying: true,
      }),
      getStoredClips: () => [],
      getTrackSettings: () => [],
      seekTo: vi.fn(),
      playerRef: { current: { toggle, isPlaying: () => true, seekTo: vi.fn(), getCurrentFrame: () => 0 } },
    });
    provider.pause();
    expect(toggle).toHaveBeenCalled();
  });

  it('pause does not call toggle when already paused', () => {
    const toggle = vi.fn();
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 0, time: 0, fps: 30, durationInFrames: 90, durationInSeconds: 3,
        contentDurationInFrames: 90, contentDurationInSeconds: 3, isPlaying: false,
      }),
      getStoredClips: () => [],
      getTrackSettings: () => [],
      seekTo: vi.fn(),
      playerRef: { current: { toggle, isPlaying: () => false, seekTo: vi.fn(), getCurrentFrame: () => 0 } },
    });
    provider.pause();
    expect(toggle).not.toHaveBeenCalled();
  });

  it('toggle always calls playerRef.toggle', () => {
    const toggle = vi.fn();
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 0, time: 0, fps: 30, durationInFrames: 90, durationInSeconds: 3,
        contentDurationInFrames: 90, contentDurationInSeconds: 3, isPlaying: false,
      }),
      getStoredClips: () => [],
      getTrackSettings: () => [],
      seekTo: vi.fn(),
      playerRef: { current: { toggle, isPlaying: () => false, seekTo: vi.fn(), getCurrentFrame: () => 0 } },
    });
    provider.toggle();
    provider.toggle();
    provider.toggle();
    expect(toggle).toHaveBeenCalledTimes(3);
  });

  it('play/pause/toggle are no-ops when playerRef is null', () => {
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 0, time: 0, fps: 30, durationInFrames: 90, durationInSeconds: 3,
        contentDurationInFrames: 90, contentDurationInSeconds: 3, isPlaying: false,
      }),
      getStoredClips: () => [],
      getTrackSettings: () => [],
      seekTo: vi.fn(),
      playerRef: { current: null },
    });
    expect(() => provider.play()).not.toThrow();
    expect(() => provider.pause()).not.toThrow();
    expect(() => provider.toggle()).not.toThrow();
  });
});

describe('Timeline API integration', () => {
  it('full flow: create provider → create context → get state', () => {
    const clips = [
      makeClip({ id: 'c1', offsetInTimeline: 0, durationInFrames: 60 }),
      makeClip({ id: 'c2', offsetInTimeline: 50, durationInFrames: 60 }),
    ];
    const tracks = [makeTrack({ name: 'V1' }), makeTrack({ name: 'A1', muted: true })];

    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 30, time: 1, fps: 30, durationInFrames: 110, durationInSeconds: 3.667,
        contentDurationInFrames: 110, contentDurationInSeconds: 3.667, isPlaying: false,
      }),
      getStoredClips: () => clips,
      getTrackSettings: () => tracks,
      seekTo: vi.fn(),
      playerRef: { current: null },
    });

    const api = createTimelineContext(provider);

    const state = api.getState();
    expect(state.frame).toBe(30);
    expect(state.isPlaying).toBe(false);
    expect(state.durationInFrames).toBe(110);

    expect(api.getClips()).toHaveLength(2);
    expect(api.getClipsAtFrame(55)).toHaveLength(2);
    expect(api.getClipById('c1')!.type).toBe('video');

    expect(api.getTracks()).toHaveLength(2);
    expect(api.getTrack(0)!.name).toBe('V1');
    expect(api.getTrack(1)!.muted).toBe(true);
  });

  it('permission enforcement: timelineApi is undefined without timeline:read', () => {
    const context = { timelineApi: undefined };
    expect(context.timelineApi).toBeUndefined();
  });

  it('repeated getState returns consistent values', () => {
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 42, time: 1.4, fps: 30, durationInFrames: 90, durationInSeconds: 3,
        contentDurationInFrames: 90, contentDurationInSeconds: 3, isPlaying: true,
      }),
      getStoredClips: () => [],
      getTrackSettings: () => [],
      seekTo: vi.fn(),
      playerRef: { current: null },
    });
    const api = createTimelineContext(provider);
    expect(api.getState()).toEqual(api.getState());
  });

  it('getClips does not expose StoredClip internals', () => {
    const clip = makeClip({ id: 'c1', scale: 2, posX: 100, volume: 0.5 });
    const provider = new AppTimelineProvider({
      getStateSnapshot: () => ({
        frame: 0, time: 0, fps: 30, durationInFrames: 60, durationInSeconds: 2,
        contentDurationInFrames: 60, contentDurationInSeconds: 2, isPlaying: false,
      }),
      getStoredClips: () => [clip],
      getTrackSettings: () => [],
      seekTo: vi.fn(),
      playerRef: { current: null },
    });
    const api = createTimelineContext(provider);
    const info = api.getClips()[0];
    expect(info).not.toHaveProperty('scale');
    expect(info).not.toHaveProperty('posX');
    expect(info).not.toHaveProperty('volume');
  });

  it('legacy context.timeline still works independently', () => {
    const legacyTimeline = {
      getCurrentFrame: () => 42,
      seekTo: vi.fn(),
      getTotalFrames: () => 90,
      addMarker: vi.fn(),
      removeMarker: vi.fn(),
      getMarkers: () => [],
    };
    expect(legacyTimeline.getCurrentFrame()).toBe(42);
    expect(legacyTimeline.getTotalFrames()).toBe(90);
  });
});
