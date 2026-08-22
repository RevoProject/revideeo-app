import { describe, expect, it } from 'vitest';
import { validateManifest, validateClips, validateTrackSettings } from '../src/manifest/validators.js';
import type { ManifestClip } from '../src/manifest/types.js';

const validClip: ManifestClip = {
  id: 'c1',
  type: 'video',
  sourceId: 'a1',
  trackIndex: 0,
  offsetInTimeline: 0,
  startFrame: 0,
  durationInFrames: 60,
  scale: 1,
  posX: 0,
  posY: 0,
  transitionIn: 'none',
  transitionDurationInFrames: 0,
};

describe('validateClips', () => {
  it('returns no errors for valid clips', () => {
    expect(validateClips([validClip])).toHaveLength(0);
  });

  it('returns error for non-array input', () => {
    const errors = validateClips('not-an-array' as unknown as ManifestClip[]);
    expect(errors).toContain('clips must be an array');
  });

  it('detects duplicate ids', () => {
    const dup = { ...validClip, id: 'c1' };
    const errors = validateClips([validClip, dup]);
    expect(errors.some((e) => e.includes('duplicate id'))).toBe(true);
  });

  it('detects negative trackIndex', () => {
    const bad = { ...validClip, trackIndex: -1 };
    const errors = validateClips([bad]);
    expect(errors.some((e) => e.includes('trackIndex'))).toBe(true);
  });

  it('detects non-positive durationInFrames', () => {
    const bad = { ...validClip, durationInFrames: 0 };
    const errors = validateClips([bad]);
    expect(errors.some((e) => e.includes('durationInFrames'))).toBe(true);
  });
});

describe('validateTrackSettings', () => {
  it('returns no errors for valid settings', () => {
    const errors = validateTrackSettings(
      [{ name: 'Track 1', locked: false, muted: false, hidden: false }],
      [0],
    );
    expect(errors).toHaveLength(0);
  });

  it('detects missing track for clip index', () => {
    const errors = validateTrackSettings(
      [{ name: 'Track 1', locked: false, muted: false, hidden: false }],
      [0, 5],
    );
    expect(errors.some((e) => e.includes('track index 5'))).toBe(true);
  });
});

describe('validateManifest', () => {
  const validInput = {
    projectName: 'Test',
    fps: 30,
    totalFrames: 100,
    clips: [validClip],
    trackSettings: [{ name: 'T1', locked: false, muted: false, hidden: false }],
    resolution: { width: 1280, height: 720 },
  };

  it('returns valid for correct input', () => {
    const result = validateManifest(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects missing projectName', () => {
    const result = validateManifest({ ...validInput, projectName: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('projectName'))).toBe(true);
  });

  it('detects invalid fps', () => {
    const result = validateManifest({ ...validInput, fps: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('fps'))).toBe(true);
  });

  it('detects invalid resolution', () => {
    const result = validateManifest({ ...validInput, resolution: { width: -1, height: 720 } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('resolution.width'))).toBe(true);
  });
});
