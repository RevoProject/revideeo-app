import type { ReVideeoManifest, RendererAdapter } from '../manifest/types.js';

export interface FFmpegFilterInput {
  readonly clips: readonly FFmpegClipDescriptor[];
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly totalFrames: number;
  readonly outputFormat: string;
}

export interface FFmpegClipDescriptor {
  readonly sourceId: string;
  readonly type: string;
  readonly trackIndex: number;
  readonly startFrame: number;
  readonly durationInFrames: number;
  readonly offsetInTimeline: number;
  readonly scale: number;
  readonly posX: number;
  readonly posY: number;
  readonly opacity: number;
  readonly volume: number;
  readonly transitionIn: string;
  readonly transitionDurationInFrames: number;
}

const CLIP_TYPE_MAP: Record<string, string> = {
  video: 'video',
  audio: 'audio',
  image: 'image',
  text: 'text',
};

function mapClipToFFmpeg(
  clip: ReVideeoManifest['clips'][number],
): FFmpegClipDescriptor {
  return {
    sourceId: clip.sourceId,
    type: CLIP_TYPE_MAP[clip.type] ?? clip.type,
    trackIndex: clip.trackIndex,
    startFrame: clip.startFrame,
    durationInFrames: clip.durationInFrames,
    offsetInTimeline: clip.offsetInTimeline,
    scale: clip.scale,
    posX: clip.posX,
    posY: clip.posY,
    opacity: clip.opacity ?? 1.0,
    volume: clip.volume ?? 1.0,
    transitionIn: clip.transitionIn,
    transitionDurationInFrames: clip.transitionDurationInFrames,
  };
}

export class FFmpegAdapter implements RendererAdapter {
  readonly name = 'ffmpeg';

  toRendererPayload(manifest: ReVideeoManifest): FFmpegFilterInput {
    return {
      clips: manifest.clips.map(mapClipToFFmpeg),
      width: manifest.resolution.width,
      height: manifest.resolution.height,
      fps: manifest.fps,
      totalFrames: manifest.totalFrames,
      outputFormat: manifest.output.format,
    };
  }
}
