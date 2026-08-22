import { describe, expect, it } from 'vitest';
import { RemotionAdapter } from '../src/adapters/remotion.js';
import { FFmpegAdapter } from '../src/adapters/ffmpeg.js';
import { RevideoAdapter } from '../src/adapters/revideo.js';
import { generateVideoProjectConfig } from '../src/manifest/index.js';
import type { ManifestInput, ManifestClip } from '../src/manifest/types.js';

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
  transitionIn: 'fade',
  transitionDurationInFrames: 15,
  ...overrides,
});

const sampleInput: ManifestInput = {
  projectName: 'Adapter Test',
  resolution: { label: '1080p', width: 1920, height: 1080 },
  fps: 30,
  clips: [
    makeClip({ id: 'c1', trackIndex: 0, offsetInTimeline: 0, durationInFrames: 90 }),
    makeClip({ id: 'c2', trackIndex: 1, offsetInTimeline: 30, durationInFrames: 60, transitionIn: 'slide' }),
  ],
  trackSettings: [
    { name: 'Video', locked: false, muted: false, hidden: false },
    { name: 'Audio', locked: false, muted: true, hidden: false },
  ],
  totalFrames: 150,
  outputFormat: 'mp4',
  renderRange: { startFrame: 10, endFrame: 100 },
};

describe('RemotionAdapter', () => {
  const adapter = new RemotionAdapter();

  it('has name "remotion"', () => {
    expect(adapter.name).toBe('remotion');
  });

  it('maps manifest to RemotionRenderConfig', () => {
    const manifest = generateVideoProjectConfig(sampleInput);
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;

    expect(payload.compositionId).toBe('VideoComposition');
    expect(payload.codec).toBe('h264');
    expect(payload.outputExtension).toBe('mp4');
    expect(payload.frameRange).toEqual([9, 99]);
  });

  it('maps clips to Remotion inputProps format', () => {
    const manifest = generateVideoProjectConfig(sampleInput);
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;
    const inputProps = payload.inputProps as Record<string, unknown>;

    expect(inputProps.fps).toBe(30);
    expect(inputProps.width).toBe(1920);
    expect(inputProps.height).toBe(1080);
    expect(inputProps.totalFrames).toBe(150);
    expect((inputProps.clips as unknown[])).toHaveLength(2);
  });

  it('maps trackSettings', () => {
    const manifest = generateVideoProjectConfig(sampleInput);
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;
    const inputProps = payload.inputProps as Record<string, unknown>;
    const tracks = inputProps.trackSettings as Record<string, unknown>[];

    expect(tracks).toHaveLength(2);
    expect(tracks[0].name).toBe('Video');
    expect(tracks[1].muted).toBe(true);
  });

  it('uses frameRange from manifest renderRange', () => {
    const manifest = generateVideoProjectConfig(sampleInput);
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;
    const range = payload.frameRange as [number, number];
    expect(range[0]).toBe(9);
    expect(range[1]).toBe(99);
  });

  it('uses totalFrames when no renderRange', () => {
    const manifest = generateVideoProjectConfig({ ...sampleInput, renderRange: undefined });
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;
    const range = payload.frameRange as [number, number];
    expect(range[0]).toBe(0);
    expect(range[1]).toBe(149);
  });

  it('maps webm format to vp9 codec', () => {
    const manifest = generateVideoProjectConfig({ ...sampleInput, outputFormat: 'webm' });
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;
    expect(payload.codec).toBe('vp9');
    expect(payload.outputExtension).toBe('webm');
  });
});

describe('FFmpegAdapter', () => {
  const adapter = new FFmpegAdapter();

  it('has name "ffmpeg"', () => {
    expect(adapter.name).toBe('ffmpeg');
  });

  it('maps manifest to FFmpegFilterInput', () => {
    const manifest = generateVideoProjectConfig(sampleInput);
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;

    expect(payload.width).toBe(1920);
    expect(payload.height).toBe(1080);
    expect(payload.fps).toBe(30);
    expect(payload.totalFrames).toBe(150);
    expect(payload.outputFormat).toBe('mp4');
  });

  it('maps clips with defaults for optional fields', () => {
    const manifest = generateVideoProjectConfig(sampleInput);
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;
    const clips = payload.clips as Record<string, unknown>[];

    expect(clips).toHaveLength(2);
    expect(clips[0].opacity).toBe(1.0);
    expect(clips[0].volume).toBe(1.0);
    expect(clips[1].transitionIn).toBe('slide');
  });
});

describe('RevideoAdapter', () => {
  const adapter = new RevideoAdapter();

  it('has name "revideo"', () => {
    expect(adapter.name).toBe('revideo');
  });

  it('maps manifest to RevideoCompositionConfig', () => {
    const manifest = generateVideoProjectConfig(sampleInput);
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;
    const composition = payload.composition as Record<string, unknown>;

    expect(composition.width).toBe(1920);
    expect(composition.height).toBe(1080);
    expect(composition.fps).toBe(30);
    expect(composition.durationInFrames).toBe(150);
    expect(composition.id).toBe('revideeo-Adapter Test');
    expect(payload.outputFormat).toBe('mp4');
  });

  it('groups clips by track into RevideoTrackDescriptor', () => {
    const manifest = generateVideoProjectConfig(sampleInput);
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;
    const tracks = payload.tracks as Record<string, unknown>[];

    expect(tracks).toHaveLength(2);
    expect(tracks[0].id).toBe('track-0');
    expect((tracks[0].clips as unknown[])).toHaveLength(1);
    expect((tracks[1].clips as unknown[])).toHaveLength(1);
  });

  it('maps clip transform fields', () => {
    const manifest = generateVideoProjectConfig(sampleInput);
    const payload = adapter.toRendererPayload(manifest) as Record<string, unknown>;
    const tracks = payload.tracks as Record<string, unknown>[];
    const clip = (tracks[0].clips as Record<string, unknown>[])[0] as Record<string, unknown>;
    const transform = clip.transform as Record<string, unknown>;

    expect(transform.scale).toBe(1);
    expect(transform.x).toBe(0);
    expect(transform.y).toBe(0);
    expect(transform.opacity).toBe(1);
    expect(clip.fromFrame).toBe(0);
  });
});
