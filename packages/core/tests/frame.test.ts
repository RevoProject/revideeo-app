/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { describe, it, expect } from 'vitest';
import { createFrameContext, type FrameContextState } from '../src/frame/context.js';
import type { FrameProvider } from '../src/frame/provider.js';

function makeProvider(overrides: Partial<FrameProvider> = {}): FrameProvider {
  return {
    available: true,
    getClipFrame: async () => null,
    getClipDimensions: () => null,
    ...overrides,
  };
}

function makeState(overrides: Partial<FrameContextState> = {}): FrameContextState {
  return {
    getCurrentFrame: () => 0,
    getTotalFrames: () => 90,
    getFps: () => 30,
    getWidth: () => 1920,
    getHeight: () => 1080,
    getAllClips: () => [],
    getHiddenTracks: () => new Set(),
    ...overrides,
  };
}

describe('FrameContext', () => {
  describe('getContext', () => {
    it('returns frame 0 context', () => {
      const api = createFrameContext(makeProvider(), makeState());
      expect(api.getContext()).toEqual({
        frame: 0,
        time: 0,
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 90,
      });
    });

    it('returns middle frame context', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 45,
      }));
      const ctx = api.getContext();
      expect(ctx.frame).toBe(45);
      expect(ctx.time).toBe(1.5);
    });

    it('returns final frame context', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 89,
      }));
      const ctx = api.getContext();
      expect(ctx.frame).toBe(89);
      expect(ctx.time).toBeCloseTo(89 / 30, 4);
    });

    it('handles 24fps', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 24,
        getFps: () => 24,
      }));
      expect(api.getContext().time).toBe(1.0);
    });

    it('handles 60fps', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 60,
        getFps: () => 60,
      }));
      expect(api.getContext().time).toBe(1.0);
    });

    it('returns correct 720p dimensions', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getWidth: () => 1280,
        getHeight: () => 720,
      }));
      expect(api.getContext().width).toBe(1280);
      expect(api.getContext().height).toBe(720);
    });

    it('returns correct 4K dimensions', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getWidth: () => 3840,
        getHeight: () => 2160,
      }));
      expect(api.getContext().width).toBe(3840);
      expect(api.getContext().height).toBe(2160);
    });
  });

  describe('getClipInfo', () => {
    const clipAt = (offset: number, start: number, dur: number, type = 'video') => ({
      id: 'c1', type, offsetInTimeline: offset, startFrame: start, durationInFrames: dur, trackIndex: 0,
    });

    it('returns info at clip start', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 100,
        getAllClips: () => [clipAt(100, 0, 60)],
      }));
      const info = api.getClipInfo('c1');
      expect(info).not.toBeNull();
      expect(info!.localFrame).toBe(0);
      expect(info!.sourceFrame).toBe(0);
      expect(info!.visible).toBe(true);
    });

    it('returns info at clip middle', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 130,
        getAllClips: () => [clipAt(100, 0, 60)],
      }));
      const info = api.getClipInfo('c1');
      expect(info!.localFrame).toBe(30);
      expect(info!.sourceFrame).toBe(30);
    });

    it('returns info at clip end', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 159,
        getAllClips: () => [clipAt(100, 0, 60)],
      }));
      const info = api.getClipInfo('c1');
      expect(info!.localFrame).toBe(59);
      expect(info!.visible).toBe(true);
    });

    it('returns not visible before clip', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 50,
        getAllClips: () => [clipAt(100, 0, 60)],
      }));
      const info = api.getClipInfo('c1');
      expect(info!.visible).toBe(false);
    });

    it('returns not visible after clip', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 160,
        getAllClips: () => [clipAt(100, 0, 60)],
      }));
      const info = api.getClipInfo('c1');
      expect(info!.visible).toBe(false);
    });

    it('handles startFrame offset', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 110,
        getAllClips: () => [clipAt(100, 30, 60)],
      }));
      const info = api.getClipInfo('c1');
      expect(info!.localFrame).toBe(10);
      expect(info!.sourceFrame).toBe(40);
    });

    it('returns correct type for image clips', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 0,
        getAllClips: () => [clipAt(0, 0, 60, 'image')],
      }));
      expect(api.getClipInfo('c1')!.type).toBe('image');
    });

    it('returns correct type for audio clips', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 0,
        getAllClips: () => [clipAt(0, 0, 60, 'audio')],
      }));
      expect(api.getClipInfo('c1')!.type).toBe('audio');
    });

    it('returns correct type for text clips', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 0,
        getAllClips: () => [clipAt(0, 0, 60, 'text')],
      }));
      expect(api.getClipInfo('c1')!.type).toBe('text');
    });

    it('returns null for unknown clip', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 0,
        getAllClips: () => [clipAt(0, 0, 60)],
      }));
      expect(api.getClipInfo('unknown')).toBeNull();
    });

    it('includes source dimensions from provider', () => {
      const provider = makeProvider({
        getClipDimensions: (id) => id === 'c1' ? { width: 1920, height: 1080 } : null,
      });
      const api = createFrameContext(provider, makeState({
        getCurrentFrame: () => 0,
        getAllClips: () => [clipAt(0, 0, 60)],
      }));
      const info = api.getClipInfo('c1');
      expect(info!.sourceWidth).toBe(1920);
      expect(info!.sourceHeight).toBe(1080);
    });

    it('uses specified frame parameter', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 0,
        getAllClips: () => [clipAt(100, 0, 60)],
      }));
      const info = api.getClipInfo('c1', 130);
      expect(info!.localFrame).toBe(30);
      expect(info!.visible).toBe(true);
    });
  });

  describe('getVisibleClips', () => {
    it('returns empty array when no clips', () => {
      const api = createFrameContext(makeProvider(), makeState());
      expect(api.getVisibleClips()).toEqual([]);
    });

    it('returns single visible clip', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 50,
        getAllClips: () => [
          { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
        ],
      }));
      expect(api.getVisibleClips()).toHaveLength(1);
      expect(api.getVisibleClips()[0].clipId).toBe('c1');
    });

    it('returns overlapping clips during transition', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 55,
        getAllClips: () => [
          { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
          { id: 'c2', type: 'video', offsetInTimeline: 50, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
        ],
      }));
      expect(api.getVisibleClips()).toHaveLength(2);
    });

    it('excludes clips on hidden tracks', () => {
      const state = makeState({
        getCurrentFrame: () => 10,
        getAllClips: () => [
          { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
          { id: 'c2', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 1 },
        ],
        getHiddenTracks: () => new Set([1]),
      });
      const api = createFrameContext(makeProvider(), state);
      const visible = api.getVisibleClips();
      expect(visible).toHaveLength(1);
      expect(visible[0].clipId).toBe('c1');
    });

    it('returns empty when frame is between clips', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 80,
        getAllClips: () => [
          { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
          { id: 'c2', type: 'video', offsetInTimeline: 100, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
        ],
      }));
      expect(api.getVisibleClips()).toHaveLength(0);
    });

    it('uses specified frame parameter', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 0,
        getAllClips: () => [
          { id: 'c1', type: 'video', offsetInTimeline: 50, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
        ],
      }));
      expect(api.getVisibleClips(55)).toHaveLength(1);
    });
  });

  describe('getClipFrame', () => {
    it('returns null when provider is not available', () => {
      const provider = makeProvider({ available: false });
      const api = createFrameContext(provider, makeState({
        getCurrentFrame: () => 0,
        getAllClips: () => [
          { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
        ],
      }));
      return expect(api.getClipFrame('c1')).resolves.toBeNull();
    });

    it('returns null for unknown clip', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 0,
        getAllClips: () => [],
      }));
      return expect(api.getClipFrame('unknown')).resolves.toBeNull();
    });

    it('returns null when frame is outside clip range', () => {
      const api = createFrameContext(makeProvider(), makeState({
        getCurrentFrame: () => 100,
        getAllClips: () => [
          { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
        ],
      }));
      return expect(api.getClipFrame('c1')).resolves.toBeNull();
    });

    it('delegates to provider with correct source frame', () => {
      let capturedClipId = '';
      let capturedSourceFrame = -1;
      const provider = makeProvider({
        getClipFrame: async (clipId, sourceFrame) => {
          capturedClipId = clipId;
          capturedSourceFrame = sourceFrame;
          return null;
        },
      });
      const api = createFrameContext(provider, makeState({
        getCurrentFrame: () => 110,
        getAllClips: () => [
          { id: 'c1', type: 'video', offsetInTimeline: 100, startFrame: 30, durationInFrames: 60, trackIndex: 0 },
        ],
      }));
      return api.getClipFrame('c1').then(() => {
        expect(capturedClipId).toBe('c1');
        expect(capturedSourceFrame).toBe(40);
      });
    });

    it('uses specified frame parameter', () => {
      let capturedSourceFrame = -1;
      const provider = makeProvider({
        getClipFrame: async (_id, sourceFrame) => {
          capturedSourceFrame = sourceFrame;
          return null;
        },
      });
      const api = createFrameContext(provider, makeState({
        getCurrentFrame: () => 0,
        getAllClips: () => [
          { id: 'c1', type: 'video', offsetInTimeline: 100, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
        ],
      }));
      return api.getClipFrame('c1', 120).then(() => {
        expect(capturedSourceFrame).toBe(20);
      });
    });
  });

  describe('determinism', () => {
    it('same inputs produce same context', () => {
      const state = makeState({ getCurrentFrame: () => 42, getFps: () => 30 });
      const api = createFrameContext(makeProvider(), state);
      const a = api.getContext();
      const b = api.getContext();
      expect(a).toEqual(b);
    });

    it('clip ordering is stable', () => {
      const clips = [
        { id: 'c2', type: 'video', offsetInTimeline: 50, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
        { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
      ];
      const state = makeState({ getCurrentFrame: () => 55, getAllClips: () => clips });
      const api = createFrameContext(makeProvider(), state);
      const a = api.getVisibleClips();
      const b = api.getVisibleClips();
      expect(a.map((c) => c.clipId)).toEqual(b.map((c) => c.clipId));
    });

    it('different fps produces different time', () => {
      const api30 = createFrameContext(makeProvider(), makeState({ getCurrentFrame: () => 30, getFps: () => 30 }));
      const api60 = createFrameContext(makeProvider(), makeState({ getCurrentFrame: () => 30, getFps: () => 60 }));
      expect(api30.getContext().time).not.toBe(api60.getContext().time);
    });
  });
});
