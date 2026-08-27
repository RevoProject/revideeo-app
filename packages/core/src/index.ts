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

export type { FrameContext, ClipFrameInfo } from './frame/types.js';
export type { FrameProvider } from './frame/provider.js';
export type { FrameAPI } from './frame/api.js';
export { createFrameContext } from './frame/context.js';
export type { FrameContextState } from './frame/context.js';

export type { MediaInfo, MediaKind } from './media/types.js';
export type { MediaProvider } from './media/provider.js';
export type { MediaAPI } from './media/api.js';
export { createMediaContext } from './media/context.js';

export type { TimelineState, TimelineClipInfo, TimelineTrackInfo } from './timeline/types.js';
export type { TimelineProvider } from './timeline/provider.js';
export type { TimelineAPI } from './timeline/api.js';
export { createTimelineContext } from './timeline/context.js';
