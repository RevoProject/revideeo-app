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
} from './manifest/types.js';

export {
  generateVideoProjectConfig,
  RESOLUTION_PRESETS,
  DEFAULT_RESOLUTION_LABEL,
  DEFAULT_FPS,
  resolveResolution,
  computeContentDuration,
  findClipEndFrame,
  getClipsOnTrack,
  sortByOffset,
  computeTrackDuration,
  framesToSeconds,
  secondsToFrames,
  validateManifest,
  validateClips,
  validateTrackSettings,
} from './manifest/index.js';

export type { ResolutionPreset, ValidationResult } from './manifest/index.js';

export { RemotionAdapter } from './adapters/remotion.js';
export { FFmpegAdapter } from './adapters/ffmpeg.js';
export { RevideoAdapter } from './adapters/revideo.js';
