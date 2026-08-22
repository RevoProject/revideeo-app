import type { ReVideeoManifest, RendererAdapter } from '../manifest/types.js';

export interface RevideoCompositionConfig {
  readonly composition: {
    readonly id: string;
    readonly width: number;
    readonly height: number;
    readonly fps: number;
    readonly durationInFrames: number;
  };
  readonly tracks: readonly RevideoTrackDescriptor[];
  readonly outputFormat: string;
}

export interface RevideoTrackDescriptor {
  readonly id: string;
  readonly clips: readonly RevideoClipDescriptor[];
  readonly muted: boolean;
  readonly hidden: boolean;
}

export interface RevideoClipDescriptor {
  readonly id: string;
  readonly type: string;
  readonly sourceId: string;
  readonly fromFrame: number;
  readonly durationInFrames: number;
  readonly startFrame: number;
  readonly transform: {
    readonly scale: number;
    readonly x: number;
    readonly y: number;
    readonly opacity: number;
  };
  readonly transition: {
    readonly type: string;
    readonly durationInFrames: number;
  };
}

function mapClipToRevideo(
  clip: ReVideeoManifest['clips'][number],
): RevideoClipDescriptor {
  return {
    id: clip.id,
    type: clip.type,
    sourceId: clip.sourceId,
    fromFrame: clip.offsetInTimeline,
    durationInFrames: clip.durationInFrames,
    startFrame: clip.startFrame,
    transform: {
      scale: clip.scale,
      x: clip.posX,
      y: clip.posY,
      opacity: clip.opacity ?? 1.0,
    },
    transition: {
      type: clip.transitionIn,
      durationInFrames: clip.transitionDurationInFrames,
    },
  };
}

type ManifestClipItem = ReVideeoManifest['clips'][number];

function groupClipsByTrack(
  clips: readonly ManifestClipItem[],
): Map<number, ManifestClipItem[]> {
  const groups = new Map<number, ManifestClipItem[]>();
  for (const clip of clips) {
    const existing = groups.get(clip.trackIndex);
    if (existing) {
      existing.push(clip);
    } else {
      groups.set(clip.trackIndex, [clip]);
    }
  }
  return groups;
}

export class RevideoAdapter implements RendererAdapter {
  readonly name = 'revideo';

  toRendererPayload(manifest: ReVideeoManifest): RevideoCompositionConfig {
    const trackGroups = groupClipsByTrack(manifest.clips);

    const tracks: RevideoTrackDescriptor[] = [];
    for (const [trackIndex, trackClips] of trackGroups) {
      const trackSettings = manifest.trackSettings[trackIndex];
      tracks.push({
        id: `track-${trackIndex}`,
        clips: trackClips.map(mapClipToRevideo),
        muted: trackSettings?.muted ?? false,
        hidden: trackSettings?.hidden ?? false,
      });
    }

    return {
      composition: {
        id: `revideeo-${manifest.projectName}`,
        width: manifest.resolution.width,
        height: manifest.resolution.height,
        fps: manifest.fps,
        durationInFrames: manifest.totalFrames,
      },
      tracks,
      outputFormat: manifest.output.format,
    };
  }
}
