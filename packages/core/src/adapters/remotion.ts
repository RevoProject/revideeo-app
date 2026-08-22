import type { ReVideeoManifest, RendererAdapter } from '../manifest/types.js';

export interface RemotionCompositionProps {
  clips: readonly Record<string, unknown>[];
  trackSettings: readonly Record<string, unknown>[];
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
}

export interface RemotionRenderConfig {
  inputProps: RemotionCompositionProps;
  compositionId: string;
  frameRange: [number, number];
  codec: string;
  outputExtension: string;
}

const CODEC_MAP: Record<string, { codec: string; ext: string }> = {
  mp4: { codec: 'h264', ext: 'mp4' },
  webm: { codec: 'vp9', ext: 'webm' },
  mkv: { codec: 'h264', ext: 'mkv' },
};

function mapClipToRemotion(clip: ReVideeoManifest['clips'][number]): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
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

  if (clip.width !== undefined) mapped.width = clip.width;
  if (clip.height !== undefined) mapped.height = clip.height;
  if (clip.rotation !== undefined) mapped.rotation = clip.rotation;
  if (clip.opacity !== undefined) mapped.opacity = clip.opacity;
  if (clip.fitMode !== undefined) mapped.fitMode = clip.fitMode;
  if (clip.borderRadius !== undefined) mapped.borderRadius = clip.borderRadius;
  if (clip.cropLeft !== undefined) mapped.cropLeft = clip.cropLeft;
  if (clip.cropTop !== undefined) mapped.cropTop = clip.cropTop;
  if (clip.cropRight !== undefined) mapped.cropRight = clip.cropRight;
  if (clip.cropBottom !== undefined) mapped.cropBottom = clip.cropBottom;
  if (clip.playbackRate !== undefined) mapped.playbackRate = clip.playbackRate;
  if (clip.fadeInFrames !== undefined) mapped.fadeInFrames = clip.fadeInFrames;
  if (clip.fadeOutFrames !== undefined) mapped.fadeOutFrames = clip.fadeOutFrames;
  if (clip.volume !== undefined) mapped.volume = clip.volume;
  if (clip.audioFadeInFrames !== undefined) mapped.audioFadeInFrames = clip.audioFadeInFrames;
  if (clip.audioFadeOutFrames !== undefined) mapped.audioFadeOutFrames = clip.audioFadeOutFrames;
  if (clip.displayName !== undefined) mapped.displayName = clip.displayName;
  if (clip.groupId !== undefined) mapped.groupId = clip.groupId;
  if (clip.text !== undefined) mapped.text = clip.text;
  if (clip.fontSize !== undefined) mapped.fontSize = clip.fontSize;
  if (clip.fontFamily !== undefined) mapped.fontFamily = clip.fontFamily;
  if (clip.fontWeight !== undefined) mapped.fontWeight = clip.fontWeight;
  if (clip.textColor !== undefined) mapped.textColor = clip.textColor;
  if (clip.textAlign !== undefined) mapped.textAlign = clip.textAlign;
  if (clip.textBackground !== undefined) mapped.textBackground = clip.textBackground;

  return mapped;
}

function mapTrackSettingsToRemotion(
  ts: ReVideeoManifest['trackSettings'][number],
): Record<string, unknown> {
  return {
    name: ts.name,
    locked: ts.locked,
    muted: ts.muted,
    hidden: ts.hidden,
  };
}

export class RemotionAdapter implements RendererAdapter {
  readonly name = 'remotion';

  toRendererPayload(manifest: ReVideeoManifest): RemotionRenderConfig {
    const inputProps: RemotionCompositionProps = {
      clips: manifest.clips.map(mapClipToRemotion),
      trackSettings: manifest.trackSettings.map(mapTrackSettingsToRemotion),
      fps: manifest.fps,
      width: manifest.resolution.width,
      height: manifest.resolution.height,
      totalFrames: manifest.totalFrames,
    };

    const codecInfo = CODEC_MAP[manifest.output.format] ?? CODEC_MAP.mp4;

    const startFrame = manifest.renderRange?.startFrame ?? 1;
    const endFrame = manifest.renderRange?.endFrame ?? manifest.totalFrames;

    return {
      inputProps,
      compositionId: 'VideoComposition',
      frameRange: [startFrame - 1, endFrame - 1],
      codec: codecInfo.codec,
      outputExtension: codecInfo.ext,
    };
  }
}
