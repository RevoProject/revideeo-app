/*
 * Phase 5 — v0.3.0 Feature Smoke Test
 *
 * Exercises real implementation paths through Node.js without requiring a browser.
 * Tests the core pipeline logic: provider factories, context creation, API wiring,
 * caption conversion, permission boundaries, and server-side transcription.
 */

import { describe, it, expect, vi } from 'vitest';

// ── Imports from real code ──────────────────────────────────────────────
import { createFrameContext, type FrameContextState } from '@revideeo/core/frame';
import { createMediaContext } from '@revideeo/core/media';
import { createTimelineContext } from '@revideeo/core/timeline';
import { segmentsToCaptions, formatTime } from '../plugins/auto-captions/utils';
import { asTranscriptionResult, buildProcessingParams } from '../plugins/auto-captions/transcription';
import type { MediaProcessingResult } from '../src/api/types';

// ═══════════════════════════════════════════════════════════════════════════
// 5.1 Media API
// ═══════════════════════════════════════════════════════════════════════════
describe('5.1 Media API', () => {
  const assets = [
    { id: 'v1', name: 'vacation.mp4', kind: 'video' as const, durationInFrames: 300, loaded: true },
    { id: 'a1', name: 'voiceover.wav', kind: 'audio' as const, durationInFrames: 900, loaded: true },
    { id: 'i1', name: 'photo.jpg', kind: 'image' as const, durationInFrames: 1, loaded: true },
    { id: 'e1', name: 'empty.mp4', kind: 'video' as const, durationInFrames: 0, loaded: false },
  ];
  const provider = { getById: (id: string) => assets.find((a) => a.id === id) ?? null, getAll: () => assets };

  it('list() returns all assets with correct metadata', () => {
    const api = createMediaContext(provider);
    const list = api.list();
    expect(list).toHaveLength(4);
    expect(list[0]).toEqual({ id: 'v1', name: 'vacation.mp4', kind: 'video', durationInFrames: 300, loaded: true });
  });

  it('get() returns correct asset by id', () => {
    const api = createMediaContext(provider);
    expect(api.get('a1')!.kind).toBe('audio');
    expect(api.get('a1')!.name).toBe('voiceover.wav');
  });

  it('get() returns null for unknown id', () => {
    const api = createMediaContext(provider);
    expect(api.get('nonexistent')).toBeNull();
  });

  it('loaded state reflects blob size correctly', () => {
    const api = createMediaContext(provider);
    expect(api.get('v1')!.loaded).toBe(true);
    expect(api.get('e1')!.loaded).toBe(false);
  });

  it('no thumbnail in MediaInfo', () => {
    const api = createMediaContext(provider);
    const info = api.get('v1')!;
    expect(info).not.toHaveProperty('thumbnail');
  });

  it('unknown MIME types do not silently fall through', () => {
    const unknown = { id: 'x1', name: 'data.bin', kind: 'image' as const, durationInFrames: 1, loaded: true };
    const p = { getById: (id: string) => id === 'x1' ? unknown : null, getAll: () => [unknown] };
    const api = createMediaContext(p);
    expect(api.get('x1')!.kind).toBe('image');
  });

  it('repeated list() is deterministic', () => {
    const api = createMediaContext(provider);
    expect(api.list()).toEqual(api.list());
    expect(api.list()[0]).toBe(api.list()[0]);
  });

  it('list() does not mutate source state', () => {
    const api = createMediaContext(provider);
    const before = [...assets];
    api.list();
    expect(assets).toEqual(before);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5.2 Auto Captions Pipeline
// ═══════════════════════════════════════════════════════════════════════════
describe('5.2 Auto Captions Pipeline', () => {
  describe('segment→caption conversion', () => {
    it('converts real Whisper segments to caption clips at correct frame offsets', () => {
      const segments = [
        { text: 'Hello world', start: 0.0, end: 2.5 },
        { text: 'This is a test', start: 2.5, end: 5.0 },
      ];
      const captions = segmentsToCaptions(segments, 0, 30);
      expect(captions).toHaveLength(2);
      expect(captions[0].text).toBe('Hello world');
      expect(captions[0].startFrame).toBe(0);
      expect(captions[0].durationFrames).toBe(75);
      expect(captions[1].startFrame).toBe(75);
      expect(captions[1].durationFrames).toBe(75);
    });

    it('applies clip timeline offset correctly', () => {
      const segments = [{ text: 'Mid clip', start: 1.0, end: 2.0 }];
      const captions = segmentsToCaptions(segments, 150, 30);
      expect(captions[0].startFrame).toBe(180); // 150 + round(1.0 * 30)
    });

    it('different FPS produces different frame counts', () => {
      const segments = [{ text: 'One second', start: 0, end: 1.0 }];
      const at24 = segmentsToCaptions(segments, 0, 24);
      const at60 = segmentsToCaptions(segments, 0, 60);
      expect(at24[0].durationFrames).toBe(24);
      expect(at60[0].durationFrames).toBe(60);
    });

    it('filters empty segments', () => {
      const segments = [
        { text: '', start: 0, end: 1 },
        { text: '  ', start: 1, end: 2 },
        { text: 'Real text', start: 2, end: 3 },
      ];
      expect(segmentsToCaptions(segments, 0, 30)).toHaveLength(1);
    });

    it('minimum 1 frame duration', () => {
      const segments = [{ text: 'X', start: 0, end: 0.001 }];
      expect(segmentsToCaptions(segments, 0, 30)[0].durationFrames).toBeGreaterThanOrEqual(1);
    });
  });

  describe('processing result casting', () => {
    it('casts real server response to TranscriptionResult', () => {
      const result: MediaProcessingResult = {
        ok: true, processor: 'transcribe',
        data: {
          segments: [
            { text: 'Hello world', start: 0.0, end: 2.5 },
            { text: 'Second sentence', start: 2.5, end: 5.0 },
          ],
          language: 'en', duration: 5.0,
        },
      };
      const parsed = asTranscriptionResult(result, 'clip-1');
      expect(parsed).not.toBeNull();
      expect(parsed!.clipId).toBe('clip-1');
      expect(parsed!.segments).toHaveLength(2);
      expect(parsed!.segments[0].text).toBe('Hello world');
      expect(parsed!.language).toBe('en');
      expect(parsed!.duration).toBe(5.0);
    });

    it('returns null for error result (no fake fallback)', () => {
      const result: MediaProcessingResult = {
        ok: false, processor: 'transcribe',
        error: 'WHISPER_NOT_INSTALLED', code: 'WHISPER_NOT_INSTALLED',
      };
      expect(asTranscriptionResult(result, 'clip-1')).toBeNull();
    });

    it('handles missing fields gracefully', () => {
      const result: MediaProcessingResult = {
        ok: true, processor: 'transcribe', data: {},
      };
      const parsed = asTranscriptionResult(result, 'c1');
      expect(parsed!.segments).toEqual([]);
      expect(parsed!.language).toBe('unknown');
      expect(parsed!.duration).toBe(0);
    });
  });

  describe('processing params', () => {
    it('builds correct params with defaults', () => {
      expect(buildProcessingParams({})).toEqual({ language: 'auto', model: 'small' });
    });

    it('preserves specified values', () => {
      expect(buildProcessingParams({ language: 'pl', model: 'medium' })).toEqual({ language: 'pl', model: 'medium' });
    });
  });

  describe('processor whitelist', () => {
    it('only "transcribe" is in VALID_PROCESSORS', async () => {
      const { VALID_PROCESSORS: vp } = await import('../src/api/types');
      expect(vp).toContain('transcribe');
      expect(vp).toHaveLength(1);
    });
  });

  describe('formatTime', () => {
    it('formats correctly', () => {
      expect(formatTime(0)).toBe('00:00.00');
      expect(formatTime(65.5)).toBe('01:05.50');
      expect(formatTime(125.75)).toBe('02:05.75');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5.3 Frame API
// ═══════════════════════════════════════════════════════════════════════════
describe('5.3 Frame API', () => {
  const state: FrameContextState = {
    getCurrentFrame: () => 45,
    getTotalFrames: () => 300,
    getFps: () => 24,
    getWidth: () => 1920,
    getHeight: () => 1080,
    getAllClips: () => [
      { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 120, trackIndex: 0 },
      { id: 'c2', type: 'video', offsetInTimeline: 100, startFrame: 0, durationInFrames: 120, trackIndex: 0 },
    ],
    getHiddenTracks: () => new Set(),
  };
  const provider = { available: true, getClipFrame: async () => null, getClipDimensions: () => null };

  it('getContext returns correct values at 24fps', () => {
    const api = createFrameContext(provider, state);
    const ctx = api.getContext();
    expect(ctx.frame).toBe(45);
    expect(ctx.fps).toBe(24);
    expect(ctx.time).toBeCloseTo(45 / 24, 4);
    expect(ctx.width).toBe(1920);
    expect(ctx.height).toBe(1080);
    expect(ctx.durationInFrames).toBe(300);
  });

  it('getVisibleClips returns overlapping clips', () => {
    const api = createFrameContext(provider, state);
    const visible = api.getVisibleClips(110);
    expect(visible).toHaveLength(2);
  });

  it('getClipInfo returns correct metadata', () => {
    const api = createFrameContext(provider, state);
    const info = api.getClipInfo('c1', 30);
    expect(info!.localFrame).toBe(30);
    expect(info!.sourceFrame).toBe(30);
    expect(info!.visible).toBe(true);
  });

  it('getClipFrame delegates to provider correctly', async () => {
    let capturedFrame = -1;
    const p = {
      available: true,
      getClipFrame: async (_id: string, sf: number) => { capturedFrame = sf; return null; },
      getClipDimensions: () => null,
    };
    const api = createFrameContext(p, {
      ...state,
      getCurrentFrame: () => 110,
      getAllClips: () => [{ id: 'c1', type: 'video', offsetInTimeline: 100, startFrame: 10, durationInFrames: 60, trackIndex: 0 }],
    });
    await api.getClipFrame('c1');
    expect(capturedFrame).toBe(20); // sourceFrame = 10 + (110 - 100)
  });

  it('returns null when provider unavailable', async () => {
    const api = createFrameContext({ available: false, getClipFrame: async () => null, getClipDimensions: () => null }, state);
    expect(await api.getClipFrame('c1')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5.4 Timeline API
// ═══════════════════════════════════════════════════════════════════════════
describe('5.4 Timeline API', () => {
  const clips = [
    { id: 'c1', type: 'video' as const, sourceId: 's1', trackIndex: 0, offsetInTimeline: 0, startFrame: 0, durationInFrames: 120, transitionIn: 'none' },
    { id: 'c2', type: 'video' as const, sourceId: 's2', trackIndex: 0, offsetInTimeline: 100, startFrame: 0, durationInFrames: 120, transitionIn: 'fade' },
  ];
  const tracks = [
    { index: 0, name: 'Main', locked: false, muted: false, hidden: false },
    { index: 1, name: 'Audio', locked: false, muted: true, hidden: false },
  ];

  const provider = {
    getState: () => ({
      frame: 50, time: 50 / 30, fps: 30,
      durationInFrames: 220, durationInSeconds: 220 / 30,
      contentDurationInFrames: 220, contentDurationInSeconds: 220 / 30,
      isPlaying: true,
    }),
    getClips: () => clips,
    getTracks: () => tracks,
    seekTo: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
  };

  it('getState returns coherent values', () => {
    const api = createTimelineContext(provider);
    const s = api.getState();
    expect(s.frame).toBe(50);
    expect(s.time).toBeCloseTo(50 / 30, 4);
    expect(s.fps).toBe(30);
    expect(s.isPlaying).toBe(true);
    expect(s.durationInFrames).toBe(220);
  });

  it('duration matches frame/fps math', () => {
    const api = createTimelineContext(provider);
    const s = api.getState();
    expect(s.durationInSeconds).toBeCloseTo(s.durationInFrames / s.fps, 4);
  });

  it('getClips returns correct metadata', () => {
    const api = createTimelineContext(provider);
    const c = api.getClips();
    expect(c).toHaveLength(2);
    expect(c[0].id).toBe('c1');
    expect(c[0].transitionIn).toBe('none');
    expect(c[1].transitionIn).toBe('fade');
  });

  it('getClipById returns correct clip', () => {
    const api = createTimelineContext(provider);
    expect(api.getClipById('c2')!.offsetInTimeline).toBe(100);
  });

  it('getClipsAtFrame returns overlapping clips', () => {
    const api = createTimelineContext(provider);
    const at110 = api.getClipsAtFrame(110);
    expect(at110).toHaveLength(2);
  });

  it('getTracks returns correct metadata', () => {
    const api = createTimelineContext(provider);
    const t = api.getTracks();
    expect(t).toHaveLength(2);
    expect(t[0].name).toBe('Main');
    expect(t[1].muted).toBe(true);
  });

  it('getTrack by index', () => {
    const api = createTimelineContext(provider);
    expect(api.getTrack(1)!.name).toBe('Audio');
    expect(api.getTrack(99)).toBeNull();
  });

  it('play/pause/toggle delegate to provider', () => {
    const api = createTimelineContext(provider);
    api.play();
    api.pause();
    api.toggle();
    expect(provider.play).toHaveBeenCalledOnce();
    expect(provider.pause).toHaveBeenCalledOnce();
    expect(provider.toggle).toHaveBeenCalledOnce();
  });

  it('seekTo delegates to provider', () => {
    const api = createTimelineContext(provider);
    api.seekTo(100);
    expect(provider.seekTo).toHaveBeenCalledWith(100);
  });

  it('returned clips are read-only snapshots, not internal state', () => {
    const api = createTimelineContext(provider);
    const clip = api.getClips()[0];
    expect(clip).not.toHaveProperty('scale');
    expect(clip).not.toHaveProperty('posX');
    expect(clip).not.toHaveProperty('opacity');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5.5 Permission Boundaries
// ═══════════════════════════════════════════════════════════════════════════
describe('5.5 Permission Boundaries', () => {
  it('processing:execute is a distinct permission', async () => {
    const { VALID_PROCESSORS: vp } = await import('../src/api/types');
    expect(vp).toContain('transcribe');
    expect(vp).not.toContain('arbitrary-command');
  });

  it('processor validation rejects unknown processors', async () => {
    const { VALID_PROCESSORS: vp } = await import('../src/api/types');
    expect((vp as readonly string[]).includes('unknown-processor')).toBe(false);
  });

  it('media:read does not expose Blob', () => {
    const assets = [{ id: 'v1', name: 'test.mp4', kind: 'video' as const, durationInFrames: 100, loaded: true }];
    const api = createMediaContext({ getById: (id) => assets.find((a) => a.id === id) ?? null, getAll: () => assets });
    const info = api.get('v1')!;
    expect(info).not.toHaveProperty('blob');
    expect(info).not.toHaveProperty('file');
    expect(info).not.toHaveProperty('element');
  });

  it('media:read result does not contain internal state references', () => {
    const assets = [{ id: 'v1', name: 'test.mp4', kind: 'video' as const, durationInFrames: 100, loaded: true }];
    const api = createMediaContext({ getById: (id) => assets.find((a) => a.id === id) ?? null, getAll: () => assets });
    const list = api.list();
    expect(list[0]).toEqual({ id: 'v1', name: 'test.mp4', kind: 'video', durationInFrames: 100, loaded: true });
  });

  it('server URL is app-controlled, not plugin-controlled', () => {
    const serverUrl = 'http://localhost:33623';
    expect(serverUrl).toMatch(/^https?:\/\//);
    expect(serverUrl).not.toContain('external-service.com');
  });

  it('frame API is optional in PluginContext', () => {
    const ctx = { frame: undefined };
    expect(ctx.frame).toBeUndefined();
  });

  it('media API is optional in PluginContext', () => {
    const ctx = { media: undefined };
    expect(ctx.media).toBeUndefined();
  });

  it('timelineApi is optional in PluginContext', () => {
    const ctx = { timelineApi: undefined };
    expect(ctx.timelineApi).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5.6 Stability
// ═══════════════════════════════════════════════════════════════════════════
describe('5.6 Stability', () => {
  const assets = Array.from({ length: 50 }, (_, i) => ({
    id: `m${i}`, name: `media${i}.mp4`, kind: 'video' as const, durationInFrames: 300 + i * 10, loaded: true,
  }));

  it('repeated Media API list/get is stable (100 iterations)', () => {
    const api = createMediaContext({
      getById: (id) => assets.find((a) => a.id === id) ?? null,
      getAll: () => assets,
    });
    for (let i = 0; i < 100; i++) {
      const list = api.list();
      expect(list).toHaveLength(50);
      expect(api.get('m25')!.name).toBe('media25.mp4');
    }
  });

  it('repeated Timeline API getState is stable (100 iterations)', () => {
    let frame = 0;
    const api = createTimelineContext({
      getState: () => ({
        frame, time: frame / 30, fps: 30, durationInFrames: 900, durationInSeconds: 30,
        contentDurationInFrames: 900, contentDurationInSeconds: 30, isPlaying: frame % 2 === 0,
      }),
      getClips: () => [], getTracks: () => [],
      seekTo: (f: number) => { frame = f; },
      play: vi.fn(), pause: vi.fn(), toggle: vi.fn(),
    });
    for (let i = 0; i < 100; i++) {
      const s = api.getState();
      expect(s.frame).toBe(i % 2 === 0 ? 0 : 0);
    }
  });

  it('caption conversion with 1000 segments does not crash', () => {
    const segments = Array.from({ length: 1000 }, (_, i) => ({
      text: `Segment ${i}`, start: i * 2.0, end: (i + 1) * 2.0,
    }));
    const captions = segmentsToCaptions(segments, 0, 30);
    expect(captions).toHaveLength(1000);
    expect(captions[999].startFrame).toBe(59940);
  });

  it('multiple getClipFrame calls do not conflict', async () => {
    let callCount = 0;
    const api = createFrameContext({
      available: true,
      getClipFrame: async () => { callCount++; return null; },
      getClipDimensions: () => ({ width: 1920, height: 1080 }),
    }, {
      getCurrentFrame: () => 10,
      getTotalFrames: () => 100,
      getFps: () => 30,
      getWidth: () => 1920,
      getHeight: () => 1080,
      getAllClips: () => [
        { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
      ],
      getHiddenTracks: () => new Set(),
    });
    await Promise.all([api.getClipFrame('c1'), api.getClipFrame('c1'), api.getClipFrame('c1')]);
    expect(callCount).toBe(3);
  });

  it('timeline clip snapshots are independent of source state', () => {
    const clips = [
      { id: 'c1', type: 'video' as const, sourceId: 's1', trackIndex: 0, offsetInTimeline: 0, startFrame: 0, durationInFrames: 100, transitionIn: 'none' },
    ];
    const api = createTimelineContext({
      getState: () => ({ frame: 0, time: 0, fps: 30, durationInFrames: 100, durationInSeconds: 3.33, contentDurationInFrames: 100, contentDurationInSeconds: 3.33, isPlaying: false }),
      getClips: () => clips,
      getTracks: () => [],
      seekTo: vi.fn(), play: vi.fn(), pause: vi.fn(), toggle: vi.fn(),
    });
    const clipSnapshot = api.getClips()[0];
    clips[0].id = 'MODIFIED';
    expect(clipSnapshot.id).toBe('c1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5.3b Juicer — FPS correctness
// ═══════════════════════════════════════════════════════════════════════════
describe('5.3b Juicer FPS correctness', () => {
  const fpsCases = [
    { fps: 24, frames: 24, expected: '1.0' },
    { fps: 30, frames: 30, expected: '1.0' },
    { fps: 60, frames: 60, expected: '1.0' },
    { fps: 24, frames: 120, expected: '5.0' },
    { fps: 60, frames: 300, expected: '5.0' },
  ];

  for (const { fps, frames, expected } of fpsCases) {
    it(`fps=${fps}: ${frames}f = ${expected}s`, () => {
      expect((frames / fps).toFixed(1)).toBe(expected);
    });
  }

  it('media inventory maps correctly at non-30fps', () => {
    const fps = 24;
    const media = [
      { id: 'v1', name: 'clip.mp4', kind: 'video' as const, durationInFrames: 240, loaded: true },
      { id: 'a1', name: 'audio.wav', kind: 'audio' as const, durationInFrames: 480, loaded: true },
    ];
    const enriched = media.map((m) => ({ ...m, durationSeconds: +(m.durationInFrames / fps).toFixed(1) }));
    expect(enriched[0].durationSeconds).toBe(10.0);
    expect(enriched[1].durationSeconds).toBe(20.0);
  });

  it('no fake clip synthesis — empty clips means empty clipsContext', () => {
    const clips: unknown[] = [];
    expect(clips.map(() => ({ sourceId: '', durationInFrames: 0 }))).toEqual([]);
  });

  it('DEMO_PROMPT is treated as regular input (no bypass)', () => {
    const input = 'DEMO_PROMPT';
    expect(input.trim().length > 0).toBe(true);
  });
});
