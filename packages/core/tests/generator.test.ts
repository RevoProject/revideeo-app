import { describe, expect, it } from 'vitest';
import {
  generateVideoProjectConfig,
  computeContentDuration,
  findClipEndFrame,
  getClipsOnTrack,
  sortByOffset,
  computeTrackDuration,
  framesToSeconds,
  secondsToFrames,
} from '../src/manifest/index.js';
import type { ManifestInput, ManifestClip, ManifestTrackSettings } from '../src/manifest/types.js';

const makeClip = (overrides: Partial<ManifestClip> = {}): ManifestClip => ({
  id: 'clip-1',
  type: 'video',
  sourceId: 'asset-1',
  trackIndex: 0,
  offsetInTimeline: 0,
  startFrame: 0,
  durationInFrames: 90,
  scale: 1,
  posX: 0,
  posY: 0,
  transitionIn: 'none',
  transitionDurationInFrames: 0,
  ...overrides,
});

const defaultTracks: ManifestTrackSettings[] = [
  { name: 'Track 1', locked: false, muted: false, hidden: false },
  { name: 'Track 2', locked: false, muted: false, hidden: false },
];

const makeInput = (overrides: Partial<ManifestInput> = {}): ManifestInput => ({
  projectName: 'Test Project',
  resolution: { label: '720p', width: 1280, height: 720 },
  fps: 30,
  clips: [makeClip()],
  trackSettings: defaultTracks,
  totalFrames: 90,
  outputFormat: 'mp4',
  ...overrides,
});

describe('generateVideoProjectConfig', () => {
  it('produces a manifest with version 1.0', () => {
    const manifest = generateVideoProjectConfig(makeInput());
    expect(manifest.manifestVersion).toBe('1.0');
  });

  it('copies project name from input', () => {
    const manifest = generateVideoProjectConfig(makeInput({ projectName: 'My Film' }));
    expect(manifest.projectName).toBe('My Film');
  });

  it('copies resolution dimensions', () => {
    const manifest = generateVideoProjectConfig(
      makeInput({ resolution: { label: '1080p', width: 1920, height: 1080 } }),
    );
    expect(manifest.resolution.width).toBe(1920);
    expect(manifest.resolution.height).toBe(1080);
    expect(manifest.resolution.label).toBe('1080p');
  });

  it('copies fps and totalFrames', () => {
    const manifest = generateVideoProjectConfig(makeInput({ fps: 60, totalFrames: 300 }));
    expect(manifest.fps).toBe(60);
    expect(manifest.totalFrames).toBe(300);
  });

  it('clones clips deeply - mutating original does not affect manifest', () => {
    const clip = makeClip({ id: 'original' });
    const input = makeInput({ clips: [clip] });
    const manifest = generateVideoProjectConfig(input);
    (clip as { id: string }).id = 'mutated';
    expect(manifest.clips[0].id).toBe('original');
  });

  it('clones trackSettings deeply', () => {
    const tracks: ManifestTrackSettings[] = [
      { name: 'V1', locked: false, muted: false, hidden: false },
    ];
    const input = makeInput({ trackSettings: tracks });
    const manifest = generateVideoProjectConfig(input);
    tracks[0].name = 'MUTATED';
    expect(manifest.trackSettings[0].name).toBe('V1');
  });

  it('sets default normalize to false', () => {
    const manifest = generateVideoProjectConfig(makeInput());
    expect(manifest.output.normalize).toBe(false);
  });

  it('respects normalize=true', () => {
    const manifest = generateVideoProjectConfig(makeInput({ normalize: true }));
    expect(manifest.output.normalize).toBe(true);
  });

  it('includes renderRange when provided', () => {
    const manifest = generateVideoProjectConfig(
      makeInput({ renderRange: { startFrame: 10, endFrame: 50 } }),
    );
    expect(manifest.renderRange).toEqual({ startFrame: 10, endFrame: 50 });
  });

  it('omits renderRange when not provided', () => {
    const manifest = generateVideoProjectConfig(makeInput());
    expect(manifest.renderRange).toBeUndefined();
  });

  it('sets metadata.generatorVersion', () => {
    const manifest = generateVideoProjectConfig(makeInput());
    expect(manifest.metadata.generatorVersion).toBe('0.1.0');
  });

  it('sets metadata.createdAt within current time range', () => {
    const before = Date.now();
    const manifest = generateVideoProjectConfig(makeInput());
    const after = Date.now();
    expect(manifest.metadata.createdAt).toBeGreaterThanOrEqual(before);
    expect(manifest.metadata.createdAt).toBeLessThanOrEqual(after);
  });

  it('passes optional metadata.author', () => {
    const manifest = generateVideoProjectConfig(
      makeInput({ metadata: { author: 'tester' } }),
    );
    expect(manifest.metadata.author).toBe('tester');
  });

  it('preserves clip optional fields when provided', () => {
    const clip = makeClip({
      width: 640, height: 480, rotation: 45, opacity: 0.7,
      text: 'Hello', fontSize: 24, fontFamily: 'Arial',
    });
    const manifest = generateVideoProjectConfig(makeInput({ clips: [clip] }));
    const c = manifest.clips[0];
    expect(c.width).toBe(640);
    expect(c.height).toBe(480);
    expect(c.rotation).toBe(45);
    expect(c.opacity).toBe(0.7);
    expect(c.text).toBe('Hello');
    expect(c.fontSize).toBe(24);
    expect(c.fontFamily).toBe('Arial');
  });

  it('sets output format from input', () => {
    expect(generateVideoProjectConfig(makeInput({ outputFormat: 'webm' })).output.format).toBe('webm');
    expect(generateVideoProjectConfig(makeInput({ outputFormat: 'mkv' })).output.format).toBe('mkv');
  });

  it('is deterministic - same input produces identical output', () => {
    const input = makeInput();
    const m1 = generateVideoProjectConfig(input);
    const m2 = generateVideoProjectConfig(input);
    expect(m1).toEqual(m2);
  });
});

describe('computeContentDuration', () => {
  it('returns the max end frame across all visible clips', () => {
    const clips = [
      makeClip({ offsetInTimeline: 0, durationInFrames: 60 }),
      makeClip({ id: 'c2', offsetInTimeline: 30, durationInFrames: 90 }),
    ];
    expect(computeContentDuration(clips, defaultTracks)).toBe(120);
  });

  it('excludes clips on hidden tracks', () => {
    const tracks: ManifestTrackSettings[] = [
      { name: 'Hidden', locked: false, muted: false, hidden: true },
    ];
    const clips = [makeClip({ trackIndex: 0, durationInFrames: 100 })];
    expect(computeContentDuration(clips, tracks)).toBe(1);
  });

  it('returns 1 for empty clips array', () => {
    expect(computeContentDuration([], defaultTracks)).toBe(1);
  });
});

describe('findClipEndFrame', () => {
  it('returns offset + duration', () => {
    const clip = makeClip({ offsetInTimeline: 50, durationInFrames: 30 });
    expect(findClipEndFrame(clip)).toBe(80);
  });
});

describe('getClipsOnTrack', () => {
  it('returns only clips on the specified track', () => {
    const clips = [
      makeClip({ id: 'a', trackIndex: 0 }),
      makeClip({ id: 'b', trackIndex: 1 }),
      makeClip({ id: 'c', trackIndex: 0 }),
    ];
    const result = getClipsOnTrack(clips, 0);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('c');
  });
});

describe('sortByOffset', () => {
  it('sorts clips by offsetInTimeline ascending', () => {
    const clips = [
      makeClip({ id: 'c', offsetInTimeline: 100 }),
      makeClip({ id: 'a', offsetInTimeline: 0 }),
      makeClip({ id: 'b', offsetInTimeline: 50 }),
    ];
    const sorted = sortByOffset(clips);
    expect(sorted.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the original array', () => {
    const clips = [
      makeClip({ id: 'c', offsetInTimeline: 100 }),
      makeClip({ id: 'a', offsetInTimeline: 0 }),
    ];
    sortByOffset(clips);
    expect(clips[0].id).toBe('c');
  });
});

describe('computeTrackDuration', () => {
  it('returns max end frame for the given track', () => {
    const clips = [
      makeClip({ trackIndex: 0, offsetInTimeline: 0, durationInFrames: 60 }),
      makeClip({ id: 'c2', trackIndex: 0, offsetInTimeline: 40, durationInFrames: 50 }),
      makeClip({ id: 'c3', trackIndex: 1, offsetInTimeline: 0, durationInFrames: 200 }),
    ];
    expect(computeTrackDuration(clips, 0)).toBe(90);
  });

  it('returns 0 when no clips on the track', () => {
    const clips = [makeClip({ trackIndex: 1 })];
    expect(computeTrackDuration(clips, 0)).toBe(0);
  });
});

describe('framesToSeconds', () => {
  it('converts frames to seconds', () => {
    expect(framesToSeconds(90, 30)).toBe(3);
    expect(framesToSeconds(60, 30)).toBe(2);
  });

  it('returns 0 for zero fps', () => {
    expect(framesToSeconds(90, 0)).toBe(0);
  });
});

describe('secondsToFrames', () => {
  it('converts seconds to frames', () => {
    expect(secondsToFrames(3, 30)).toBe(90);
    expect(secondsToFrames(2, 30)).toBe(60);
  });

  it('returns minimum 1 frame', () => {
    expect(secondsToFrames(0, 30)).toBe(1);
  });
});
