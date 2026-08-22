import type {
  ManifestInput,
  ManifestClip,
  ManifestTrackSettings,
  ManifestMetadata,
  ReVideeoManifest,
} from './types.js';

const GENERATOR_VERSION = '0.1.0';

function cloneClip(clip: ManifestClip): ManifestClip {
  const cloned: MutableManifestClip = {
    id: clip.id,
    type: clip.type,
    sourceId: clip.sourceId,
    trackIndex: clip.trackIndex,
    offsetInTimeline: clip.offsetInTimeline,
    startFrame: clip.startFrame,
    durationInFrames: clip.durationInFrames,
    scale: clip.scale,
    posX: clip.posX,
    posY: clip.posY,
    transitionIn: clip.transitionIn,
    transitionDurationInFrames: clip.transitionDurationInFrames,
  };

  if (clip.width !== undefined) cloned.width = clip.width;
  if (clip.height !== undefined) cloned.height = clip.height;
  if (clip.rotation !== undefined) cloned.rotation = clip.rotation;
  if (clip.opacity !== undefined) cloned.opacity = clip.opacity;
  if (clip.fitMode !== undefined) cloned.fitMode = clip.fitMode;
  if (clip.borderRadius !== undefined) cloned.borderRadius = clip.borderRadius;
  if (clip.cropLeft !== undefined) cloned.cropLeft = clip.cropLeft;
  if (clip.cropTop !== undefined) cloned.cropTop = clip.cropTop;
  if (clip.cropRight !== undefined) cloned.cropRight = clip.cropRight;
  if (clip.cropBottom !== undefined) cloned.cropBottom = clip.cropBottom;
  if (clip.playbackRate !== undefined) cloned.playbackRate = clip.playbackRate;
  if (clip.fadeInFrames !== undefined) cloned.fadeInFrames = clip.fadeInFrames;
  if (clip.fadeOutFrames !== undefined) cloned.fadeOutFrames = clip.fadeOutFrames;
  if (clip.volume !== undefined) cloned.volume = clip.volume;
  if (clip.audioFadeInFrames !== undefined) cloned.audioFadeInFrames = clip.audioFadeInFrames;
  if (clip.audioFadeOutFrames !== undefined) cloned.audioFadeOutFrames = clip.audioFadeOutFrames;
  if (clip.displayName !== undefined) cloned.displayName = clip.displayName;
  if (clip.groupId !== undefined) cloned.groupId = clip.groupId;
  if (clip.text !== undefined) cloned.text = clip.text;
  if (clip.fontSize !== undefined) cloned.fontSize = clip.fontSize;
  if (clip.fontFamily !== undefined) cloned.fontFamily = clip.fontFamily;
  if (clip.fontWeight !== undefined) cloned.fontWeight = clip.fontWeight;
  if (clip.textColor !== undefined) cloned.textColor = clip.textColor;
  if (clip.textAlign !== undefined) cloned.textAlign = clip.textAlign;
  if (clip.textBackground !== undefined) cloned.textBackground = clip.textBackground;

  return cloned;
}

interface MutableManifestClip {
  id: string;
  type: import('./types.js').ManifestClipType;
  sourceId: string;
  trackIndex: number;
  offsetInTimeline: number;
  startFrame: number;
  durationInFrames: number;
  scale: number;
  posX: number;
  posY: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  fitMode?: 'contain' | 'cover';
  borderRadius?: number;
  cropLeft?: number;
  cropTop?: number;
  cropRight?: number;
  cropBottom?: number;
  playbackRate?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  volume?: number;
  audioFadeInFrames?: number;
  audioFadeOutFrames?: number;
  displayName?: string;
  groupId?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  textBackground?: string;
  transitionIn: import('./types.js').ManifestTransitionType;
  transitionDurationInFrames: number;
}

function cloneTrackSettings(settings: ManifestTrackSettings): ManifestTrackSettings {
  return {
    name: settings.name,
    locked: settings.locked,
    muted: settings.muted,
    hidden: settings.hidden,
  };
}

function buildMetadata(partial?: Partial<ManifestMetadata>): ManifestMetadata {
  return {
    generatorVersion: GENERATOR_VERSION,
    createdAt: partial?.createdAt ?? Date.now(),
    author: partial?.author,
  };
}

export function generateVideoProjectConfig(input: ManifestInput): ReVideeoManifest {
  const clonedClips = input.clips.map(cloneClip);
  const clonedTracks = input.trackSettings.map(cloneTrackSettings);

  const manifest: ReVideeoManifest = {
    manifestVersion: '1.0',
    projectName: input.projectName,
    resolution: {
      label: input.resolution.label,
      width: input.resolution.width,
      height: input.resolution.height,
    },
    fps: input.fps,
    totalFrames: input.totalFrames,
    clips: clonedClips,
    trackSettings: clonedTracks,
    output: {
      format: input.outputFormat,
      normalize: input.normalize ?? false,
    },
    metadata: buildMetadata(input.metadata),
  };

  if (input.renderRange) {
    (manifest as { renderRange?: import('./types.js').ManifestRenderRange }).renderRange = {
      startFrame: input.renderRange.startFrame,
      endFrame: input.renderRange.endFrame,
    };
  }

  return manifest;
}
