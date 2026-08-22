export type {
  ReVideeoManifest,
  ManifestInput,
  ManifestClip,
  ManifestClipType,
  ManifestTransitionType,
  ManifestOutputFormat,
  ManifestResolution,
  ManifestTrackSettings,
  ManifestMetadata,
  ManifestRenderRange,
  ManifestOutputOptions,
  RendererAdapter,
} from './types.js';

export { generateVideoProjectConfig } from './generator.js';
export { RESOLUTION_PRESETS, DEFAULT_RESOLUTION_LABEL, DEFAULT_FPS, resolveResolution } from './resolutions.js';
export type { ResolutionPreset } from './resolutions.js';
export {
  computeContentDuration,
  findClipEndFrame,
  getClipsOnTrack,
  sortByOffset,
  computeTrackDuration,
  framesToSeconds,
  secondsToFrames,
} from './timeline.js';
export { validateManifest, validateClips, validateTrackSettings } from './validators.js';
export type { ValidationResult } from './validators.js';
