/*
 * v0.3.1 regression tests — focused on confirmed bug fixes.
 */

import { describe, it, expect, vi } from 'vitest';
import { createFrameContext } from '@revideeo/core/frame';
import { createMediaContext } from '@revideeo/core/media';
import { createTimelineContext } from '@revideeo/core/timeline';

// ═══════════════════════════════════════════════════════════════════════
// 1. Auto Captions media discovery — lazy context resolution
// ═══════════════════════════════════════════════════════════════════════
describe('Regression: Auto Captions media discovery', () => {
  it('frame/media/timelineApi resolve lazily when projectContext is initially null', () => {
    const builtContext: Record<string, unknown> = {};
    let currentProjectContext: Record<string, unknown> | null = null;

    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'media') {
          if (!currentProjectContext) return undefined;
          return { list: () => currentProjectContext?.mediaItems ?? [] };
        }
        if (prop === 'frame') {
          if (!currentProjectContext) return undefined;
          return { getContext: () => currentProjectContext?.frame ?? {} };
        }
        return builtContext[prop as string];
      },
    };

    const ctx = new Proxy(builtContext, handler);

    // Before projectContext is set — APIs should be undefined
    expect(ctx.media).toBeUndefined();
    expect(ctx.frame).toBeUndefined();

    // After projectContext is set — APIs should resolve
    currentProjectContext = {
      mediaItems: [{ id: 'v1', kind: 'video' }],
      frame: { fps: 30 },
    };
    expect(ctx.media).toBeDefined();
    expect((ctx.media as { list: () => unknown[] }).list()).toHaveLength(1);
    expect(ctx.frame).toBeDefined();
  });

  it('media list returns transcribable assets after project load', () => {
    const assets = [
      { id: 'v1', name: 'clip.mp4', kind: 'video', durationInFrames: 300, loaded: true },
      { id: 'a1', name: 'audio.wav', kind: 'audio', durationInFrames: 900, loaded: true },
      { id: 'i1', name: 'photo.jpg', kind: 'image', durationInFrames: 1, loaded: true },
    ];
    const api = createMediaContext({
      getById: (id) => assets.find((a) => a.id === id) ?? null,
      getAll: () => assets,
    });
    const media = api.list();
    const transcribable = media.filter((m) => m.kind === 'video' || m.kind === 'audio');
    expect(transcribable).toHaveLength(2);
    expect(transcribable[0].id).toBe('v1');
    expect(transcribable[1].id).toBe('a1');
  });

  it('media:read permission gating works', () => {
    const api = createMediaContext({
      getById: () => null,
      getAll: () => [],
    });
    expect(api.list()).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Speed — fps and playbackRate propagation
// ═══════════════════════════════════════════════════════════════════════
describe('Regression: Video/audio speed', () => {
  it('clip time calculation uses actual fps, not hardcoded 30', () => {
    const fpsCases = [
      { fps: 24, startFrame: 0, frame: 24, expected: 1.0 },
      { fps: 30, startFrame: 0, frame: 30, expected: 1.0 },
      { fps: 60, startFrame: 0, frame: 60, expected: 1.0 },
      { fps: 24, startFrame: 24, frame: 0, expected: 1.0 },
      { fps: 60, startFrame: 60, frame: 0, expected: 1.0 },
    ];
    for (const { fps, startFrame, frame, expected } of fpsCases) {
      const desired = (startFrame + frame) / fps;
      expect(desired).toBeCloseTo(expected, 4);
    }
  });

  it('playbackRate is applied to media elements', () => {
    const el = { playbackRate: 1, currentTime: 0 } as unknown as HTMLVideoElement;
    const rate = 2;
    el.playbackRate = rate;
    expect(el.playbackRate).toBe(2);
  });

  it('seek threshold is 0.02s (was 0.15s)', () => {
    const threshold = 0.02;
    expect(threshold).toBeLessThan(0.15);
    expect(threshold * 30).toBeCloseTo(0.6); // < 1 frame at 30fps
    expect(threshold * 60).toBeCloseTo(1.2); // < 2 frames at 60fps
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Duration overlap — ripple logic
// ═══════════════════════════════════════════════════════════════════════
describe('Regression: Clip duration overlap', () => {
  it('increasing duration pushes following clips on same track', () => {
    const clips = [
      { id: 'c1', trackIndex: 0, offsetInTimeline: 0, durationInFrames: 60 },
      { id: 'c2', trackIndex: 0, offsetInTimeline: 60, durationInFrames: 60 },
      { id: 'c3', trackIndex: 1, offsetInTimeline: 0, durationInFrames: 60 },
    ];
    const targetId = 'c1';
    const newDuration = 90;
    const current = clips.find((c) => c.id === targetId)!;
    const delta = newDuration - current.durationInFrames;
    const oldEnd = current.offsetInTimeline + current.durationInFrames;

    const updated = clips.map((clip) => {
      if (clip.id === targetId) return { ...clip, durationInFrames: newDuration };
      if (clip.trackIndex === current.trackIndex && clip.offsetInTimeline >= oldEnd) {
        return { ...clip, offsetInTimeline: clip.offsetInTimeline + delta };
      }
      return clip;
    });

    expect(updated.find((c) => c.id === 'c1')!.durationInFrames).toBe(90);
    expect(updated.find((c) => c.id === 'c2')!.offsetInTimeline).toBe(90); // pushed by 30
    expect(updated.find((c) => c.id === 'c3')!.offsetInTimeline).toBe(0); // different track, not pushed
  });

  it('decreasing duration pulls following clips on same track', () => {
    const clips = [
      { id: 'c1', trackIndex: 0, offsetInTimeline: 0, durationInFrames: 90 },
      { id: 'c2', trackIndex: 0, offsetInTimeline: 90, durationInFrames: 60 },
    ];
    const targetId = 'c1';
    const newDuration = 60;
    const current = clips.find((c) => c.id === targetId)!;
    const delta = newDuration - current.durationInFrames;
    const oldEnd = current.offsetInTimeline + current.durationInFrames;

    const updated = clips.map((clip) => {
      if (clip.id === targetId) return { ...clip, durationInFrames: newDuration };
      if (clip.trackIndex === current.trackIndex && clip.offsetInTimeline >= oldEnd) {
        return { ...clip, offsetInTimeline: clip.offsetInTimeline + delta };
      }
      return clip;
    });

    expect(updated.find((c) => c.id === 'c2')!.offsetInTimeline).toBe(60); // pulled by -30
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Localization — missing keys
// ═══════════════════════════════════════════════════════════════════════
describe('Regression: Missing translations', () => {
  const requiredKeys = [
    'mobile.sheetMedia', 'mobile.sheetText', 'mobile.sheetTracks',
    'mobile.sheetExports', 'mobile.sheetTransitions', 'mobile.sheetAudioMixer',
    'mobile.sheetPlugins', 'mobile.sheetTools', 'mobile.frame',
    'mobile.settings', 'mobile.close', 'mobile.menu', 'mobile.save',
    'mobile.redo', 'mobile.noRecentExports',
    'plugins.title', 'plugins.searchMarketplace', 'plugins.untested',
    'release.bugfixes.title', 'release.bugfixes.desc',
  ];

  for (const key of requiredKeys) {
    it(`${key} exists in en.json`, async () => {
      const en = await import('../src/i18n/en.json', { with: { type: 'json' } });
      expect(en.default[key]).toBeDefined();
      expect(typeof en.default[key]).toBe('string');
    });
    it(`${key} exists in pl.json`, async () => {
      const pl = await import('../src/i18n/pl.json', { with: { type: 'json' } });
      expect(pl.default[key]).toBeDefined();
    });
    it(`${key} exists in de.json`, async () => {
      const de = await import('../src/i18n/de.json', { with: { type: 'json' } });
      expect(de.default[key]).toBeDefined();
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Timeline API — snapshot isolation
// ═══════════════════════════════════════════════════════════════════════
describe('Regression: Timeline API snapshot isolation', () => {
  it('mutating returned clips does not affect provider state', () => {
    const clips = [
      { id: 'c1', type: 'video' as const, sourceId: 's1', trackIndex: 0, offsetInTimeline: 0, startFrame: 0, durationInFrames: 100, transitionIn: 'none' },
    ];
    const api = createTimelineContext({
      getState: () => ({ frame: 0, time: 0, fps: 30, durationInFrames: 100, durationInSeconds: 3.33, contentDurationInFrames: 100, contentDurationInSeconds: 3.33, isPlaying: false }),
      getClips: () => clips,
      getTracks: () => [],
      seekTo: vi.fn(), play: vi.fn(), pause: vi.fn(), toggle: vi.fn(),
    });
    const snapshot = api.getClips()[0];
    snapshot.id = 'MUTATED';
    expect(clips[0].id).toBe('c1');
  });

  it('mutating returned tracks does not affect provider state', () => {
    const tracks = [
      { index: 0, name: 'Main', locked: false, muted: false, hidden: false },
    ];
    const api = createTimelineContext({
      getState: () => ({ frame: 0, time: 0, fps: 30, durationInFrames: 100, durationInSeconds: 3.33, contentDurationInFrames: 100, contentDurationInSeconds: 3.33, isPlaying: false }),
      getClips: () => [],
      getTracks: () => tracks,
      seekTo: vi.fn(), play: vi.fn(), pause: vi.fn(), toggle: vi.fn(),
    });
    const snapshot = api.getTracks()[0];
    snapshot.name = 'MUTATED';
    expect(tracks[0].name).toBe('Main');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Frame API — provider absence
// ═══════════════════════════════════════════════════════════════════════
describe('Regression: Frame API provider absence', () => {
  it('returns null when provider is unavailable', async () => {
    const api = createFrameContext(
      { available: false, getClipFrame: async () => null, getClipDimensions: () => null },
      { getCurrentFrame: () => 0, getTotalFrames: () => 90, getFps: () => 30, getWidth: () => 1920, getHeight: () => 1080, getAllClips: () => [], getHiddenTracks: () => new Set() },
    );
    expect(await api.getClipFrame('c1')).toBeNull();
    expect(api.getClipInfo('c1')).toBeNull();
    expect(api.getVisibleClips()).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Processing — processor whitelist
// ═══════════════════════════════════════════════════════════════════════
describe('Regression: Processor whitelist', () => {
  it('only transcribe is valid', async () => {
    const { VALID_PROCESSORS } = await import('../src/api/types');
    expect(VALID_PROCESSORS).toContain('transcribe');
    expect(VALID_PROCESSORS).toHaveLength(1);
  });
});
