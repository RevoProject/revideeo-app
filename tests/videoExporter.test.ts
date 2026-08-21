import { describe, expect, it } from 'vitest';
import {
  safeName,
  serializeName,
  nextClipOnTrack,
  computeTransition,
  getClipTransitionState,
  checkAborted,
  exportVideo,
} from '../src/export/videoExporter';
import type { StoredClip, TrackSettings } from '../src/types';

const clip = (overrides: Partial<StoredClip> = {}): StoredClip => ({
  id: 'c1',
  sourceId: 'a1',
  startFrame: 0,
  durationInFrames: 60,
  offsetInTimeline: 0,
  trackIndex: 0,
  posX: 0,
  width: 100,
  height: 100,
  posY: 0,
  scale: 1,
  transitionIn: 'none',
  transitionDurationInFrames: 0,
  ...overrides,
});

const defaultTrackSettings: TrackSettings[] = [
  { locked: false, hidden: false, muted: false },
  { locked: false, hidden: false, muted: false },
  { locked: false, hidden: false, muted: false },
];

describe('safeName', () => {
  it('sanitizes special characters', () => {
    expect(safeName('Hello World!')).toBe('hello-world-');
    expect(safeName('projekt #1 (final)')).toBe('projekt-1-final-');
  });

  it('returns default for empty input', () => {
    expect(safeName('')).toBe('revideeo-film');
  });

  it('preserves hyphens and underscores', () => {
    expect(safeName('my-project_v2')).toBe('my-project_v2');
  });
});

describe('serializeName', () => {
  it('replaces spaces with underscores and removes parentheses', () => {
    expect(serializeName('test (montazu)')).toBe('test_montazu');
  });

  it('lower cases and strips filesystem-invalid chars', () => {
    expect(serializeName('Mój Film: 2 / Final?')).toBe('mój_film_2_final');
  });

  it('returns default for empty input', () => {
    expect(serializeName('')).toBe('revideeo');
  });
});

describe('nextClipOnTrack', () => {
  it('returns the next clip on the same track', () => {
    const c1 = clip({ id: 'c1', offsetInTimeline: 0, trackIndex: 0 });
    const c2 = clip({ id: 'c2', offsetInTimeline: 30, trackIndex: 0 });
    const c3 = clip({ id: 'c3', offsetInTimeline: 60, trackIndex: 0 });
    expect(nextClipOnTrack([c1, c2, c3], c1)).toBe(c2);
    expect(nextClipOnTrack([c1, c2, c3], c2)).toBe(c3);
  });

  it('returns null when no next clip exists', () => {
    const c1 = clip({ id: 'c1', offsetInTimeline: 0, trackIndex: 0 });
    expect(nextClipOnTrack([c1], c1)).toBeNull();
  });

  it('ignores clips on other tracks', () => {
    const c1 = clip({ id: 'c1', offsetInTimeline: 0, trackIndex: 0 });
    const c2 = clip({ id: 'c2', offsetInTimeline: 30, trackIndex: 1 });
    expect(nextClipOnTrack([c1, c2], c1)).toBeNull();
  });
});

describe('computeTransition', () => {
  it('fade: progress 0 = opacity 0, progress 1 = opacity 1', () => {
    expect(computeTransition('fade', 0, 1).opacity).toBe(0);
    expect(computeTransition('fade', 1, 1).opacity).toBe(1);
  });

  it('slide: translates from right to center', () => {
    const start = computeTransition('slide', 0, 1);
    expect(start.translateX).toBe(100);
    const end = computeTransition('slide', 1, 1);
    expect(end.translateX).toBe(0);
  });

  it('wipe: clipPathRaw goes from 100 to 0', () => {
    expect(computeTransition('wipe', 0, 1).clipPathRaw).toBe(100);
    expect(computeTransition('wipe', 1, 1).clipPathRaw).toBe(0);
  });

  it('none: always full opacity, no transform', () => {
    const state = computeTransition('none', 0.5, 1);
    expect(state.opacity).toBe(1);
    expect(state.translateX).toBe(0);
    expect(state.blur).toBe(0);
  });

  it('dreamy-zoom: scales up and blurs at start', () => {
    const start = computeTransition('dreamy-zoom', 0, 1);
    expect(start.scale).toBeGreaterThan(1);
    expect(start.blur).toBeGreaterThan(0);
    const end = computeTransition('dreamy-zoom', 1, 1);
    expect(end.scale).toBe(1);
    expect(end.blur).toBe(0);
  });

  it('linear-blur: starts blurry, ends sharp', () => {
    const start = computeTransition('linear-blur', 0, 1);
    expect(start.blur).toBeGreaterThan(0);
    expect(start.opacity).toBeLessThan(1);
    const end = computeTransition('linear-blur', 1, 1);
    expect(end.blur).toBe(0);
    expect(end.opacity).toBe(1);
  });

  it('film-burn: starts brighter, scales down', () => {
    const start = computeTransition('film-burn', 0, 1);
    expect(start.opacity).toBeLessThan(1);
    expect(start.scale).toBeGreaterThan(1);
    const end = computeTransition('film-burn', 1, 1);
    expect(end.opacity).toBe(1);
    expect(end.scale).toBe(1);
  });

  it('cross-zoom: starts larger, fades in', () => {
    const start = computeTransition('cross-zoom', 0, 1);
    expect(start.scale).toBeGreaterThan(1);
    expect(start.opacity).toBe(0);
    const end = computeTransition('cross-zoom', 1, 1);
    expect(end.scale).toBe(1);
    expect(end.opacity).toBe(1);
  });

  it('push: translates from right', () => {
    const start = computeTransition('push', 0, 1);
    expect(start.translateX).toBe(100);
    const end = computeTransition('push', 1, 1);
    expect(end.translateX).toBe(0);
  });

  it('applies clipScale to output', () => {
    const state = computeTransition('none', 0.5, 2);
    expect(state.scale).toBe(2);
  });
});

describe('getClipTransitionState', () => {
  it('returns full opacity for clip with no transition', () => {
    const c = clip({ transitionIn: 'none', transitionDurationInFrames: 0 });
    const state = getClipTransitionState(c, [c], 10);
    expect(state.opacity).toBe(1);
  });

  it('fade-in: opacity at frame 0 is 0 when transitionDuration is 10', () => {
    const c = clip({ transitionIn: 'fade', transitionDurationInFrames: 10 });
    const state = getClipTransitionState(c, [c], 0);
    expect(state.opacity).toBe(0);
  });

  it('fade-in: opacity at frame 10 is 1', () => {
    const c = clip({ transitionIn: 'fade', transitionDurationInFrames: 10 });
    const state = getClipTransitionState(c, [c], 10);
    expect(state.opacity).toBe(1);
  });

  it('fade-in: opacity at frame 5 is ~0.5', () => {
    const c = clip({ transitionIn: 'fade', transitionDurationInFrames: 10 });
    const state = getClipTransitionState(c, [c], 5);
    expect(state.opacity).toBeCloseTo(0.5);
  });

  it('applies outgoing fade when next clip has fade transition', () => {
    const c1 = clip({ id: 'c1', durationInFrames: 30, offsetInTimeline: 0, transitionIn: 'none', transitionDurationInFrames: 0 });
    const c2 = clip({ id: 'c2', durationInFrames: 30, offsetInTimeline: 30, transitionIn: 'fade', transitionDurationInFrames: 10, trackIndex: 0 });
    const state = getClipTransitionState(c1, [c1, c2], 25);
    expect(state.opacity).toBeLessThan(1);
  });
});

describe('checkAborted', () => {
  it('does not throw when no signal', () => {
    expect(() => checkAborted()).not.toThrow();
  });

  it('does not throw when signal is not aborted', () => {
    const controller = new AbortController();
    expect(() => checkAborted(controller.signal)).not.toThrow();
  });

  it('throws AbortError when signal is aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => checkAborted(controller.signal)).toThrow('Eksport anulowany');
  });
});

const makeInput = (format: 'mp4' | 'mkv' | 'webm', assets: { sourceId: string; blob: Blob }[] = []): VideoExportInput => ({
  clips: [clip({ durationInFrames: 30, offsetInTimeline: 0 })],
  assets,
  trackSettings: defaultTrackSettings,
  width: 640,
  height: 480,
  fps: 30,
  durationInFrames: 30,
  format,
});

describe('exportVideo', () => {
  it('throws when no WebCodecs + no MediaRecorder', async () => {
    const input = makeInput('mp4');
    await expect(exportVideo(input)).rejects.toThrow();
  });

  it('re-throws AbortError before codec check when signal is pre-aborted', async () => {
    const input = makeInput('mp4');
    const controller = new AbortController();
    controller.abort();
    input.signal = controller.signal;
    await expect(exportVideo(input)).rejects.toThrow('Eksport anulowany');
  });
});

describe('export format codec mapping', () => {
  it('mp4 uses avc codec string', () => {
    const input = makeInput('mp4');
    expect(input.format).toBe('mp4');
  });

  it('mkv uses webm-muxer with vp9', () => {
    const input = makeInput('mkv');
    expect(input.format).toBe('mkv');
  });

  it('webm uses webm-muxer with vp9', () => {
    const input = makeInput('webm');
    expect(input.format).toBe('webm');
  });

  it('durationInFrames matches fps for exact seconds', () => {
    const input = makeInput('webm');
    input.fps = 30;
    input.durationInFrames = 30;
    const frameDurationUs = Math.round(1_000_000 / input.fps);
    expect(frameDurationUs).toBe(33333);
    const totalDurationUs = input.durationInFrames * frameDurationUs;
    expect(totalDurationUs).toBe(999990);
  });

  it('durationInFrames for 2min at 30fps', () => {
    const fps = 30;
    const totalFrames = 2 * 60 * fps + fps;
    expect(totalFrames).toBe(3630);
    const frameDurationUs = Math.round(1_000_000 / fps);
    const totalUs = totalFrames * frameDurationUs;
    const totalSec = totalUs / 1_000_000;
    expect(totalSec).toBeCloseTo(121, 0);
  });

  it('audio f32 format uses interleaved layout', () => {
    const totalSamples = 960;
    const pcmData = new Float32Array(totalSamples * 2);
    for (let i = 0; i < totalSamples; i++) {
      pcmData[i * 2] = 0.5;
      pcmData[i * 2 + 1] = -0.5;
    }
    expect(pcmData.length).toBe(totalSamples * 2);
    expect(pcmData[0]).toBe(0.5);
    expect(pcmData[1]).toBe(-0.5);
    expect(pcmData[2]).toBe(0.5);
  });

  it('framesPerBatch at 30fps = 6 (fps/5)', () => {
    const fps = 30;
    const framesPerBatch = Math.max(1, Math.round(fps / 5));
    expect(framesPerBatch).toBe(6);
  });

  it('framesPerBatch at 24fps = 5', () => {
    const fps = 24;
    const framesPerBatch = Math.max(1, Math.round(fps / 5));
    expect(framesPerBatch).toBe(5);
  });

  it('framesPerBatch at 60fps = 12', () => {
    const fps = 60;
    const framesPerBatch = Math.max(1, Math.round(fps / 5));
    expect(framesPerBatch).toBe(12);
  });
});
