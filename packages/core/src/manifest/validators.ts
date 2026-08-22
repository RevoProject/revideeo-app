import type { ManifestClip, ManifestTrackSettings } from './types.js';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateClips(clips: readonly ManifestClip[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(clips)) {
    errors.push('clips must be an array');
    return errors;
  }
  const ids = new Set<string>();
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const prefix = `clips[${i}]`;
    if (!clip.id) errors.push(`${prefix}: id is required`);
    if (ids.has(clip.id)) errors.push(`${prefix}: duplicate id "${clip.id}"`);
    ids.add(clip.id);
    if (!clip.sourceId) errors.push(`${prefix}: sourceId is required`);
    if (clip.trackIndex < 0) errors.push(`${prefix}: trackIndex must be >= 0`);
    if (clip.offsetInTimeline < 0) errors.push(`${prefix}: offsetInTimeline must be >= 0`);
    if (clip.durationInFrames <= 0) errors.push(`${prefix}: durationInFrames must be > 0`);
    if (clip.scale <= 0) errors.push(`${prefix}: scale must be > 0`);
  }
  return errors;
}

export function validateTrackSettings(
  trackSettings: readonly ManifestTrackSettings[],
  clipTrackIndices: readonly number[],
): string[] {
  const errors: string[] = [];
  if (!Array.isArray(trackSettings)) {
    errors.push('trackSettings must be an array');
    return errors;
  }
  for (let i = 0; i < trackSettings.length; i++) {
    const ts = trackSettings[i];
    if (!ts.name) errors.push(`trackSettings[${i}]: name is required`);
  }
  const maxTrack = Math.max(...clipTrackIndices, -1);
  if (maxTrack >= trackSettings.length) {
    errors.push(
      `trackSettings has ${trackSettings.length} entries but clips reference track index ${maxTrack}`,
    );
  }
  return errors;
}

export function validateManifest(input: {
  projectName?: unknown;
  fps?: unknown;
  totalFrames?: unknown;
  clips?: unknown;
  trackSettings?: unknown;
  resolution?: unknown;
}): ValidationResult {
  const errors: string[] = [];
  if (!input.projectName || typeof input.projectName !== 'string') {
    errors.push('projectName must be a non-empty string');
  }
  if (typeof input.fps !== 'number' || input.fps <= 0) {
    errors.push('fps must be a positive number');
  }
  if (typeof input.totalFrames !== 'number' || input.totalFrames <= 0) {
    errors.push('totalFrames must be a positive number');
  }
  if (!input.resolution || typeof input.resolution !== 'object') {
    errors.push('resolution must be an object');
  } else {
    const res = input.resolution as Record<string, unknown>;
    if (typeof res.width !== 'number' || (res.width as number) <= 0) {
      errors.push('resolution.width must be a positive number');
    }
    if (typeof res.height !== 'number' || (res.height as number) <= 0) {
      errors.push('resolution.height must be a positive number');
    }
  }
  if (Array.isArray(input.clips)) {
    errors.push(...validateClips(input.clips as readonly ManifestClip[]));
  }
  if (Array.isArray(input.trackSettings) && Array.isArray(input.clips)) {
    const clipTracks = (input.clips as readonly ManifestClip[]).map((c) => c.trackIndex);
    errors.push(
      ...validateTrackSettings(
        input.trackSettings as readonly ManifestTrackSettings[],
        clipTracks,
      ),
    );
  }
  return { valid: errors.length === 0, errors };
}
