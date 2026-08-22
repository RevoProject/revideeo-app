export type ManifestClipType = 'video' | 'text' | 'audio' | 'image';

export type ManifestTransitionType =
  | 'none'
  | 'fade'
  | 'slide'
  | 'wipe'
  | 'push'
  | 'cross-zoom'
  | 'dreamy-zoom'
  | 'linear-blur'
  | 'film-burn';

export type ManifestOutputFormat = 'mp4' | 'webm' | 'mkv';

export interface ManifestResolution {
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

export interface ManifestClip {
  readonly id: string;
  readonly type: ManifestClipType;
  readonly sourceId: string;
  readonly trackIndex: number;
  readonly offsetInTimeline: number;
  readonly startFrame: number;
  readonly durationInFrames: number;
  readonly scale: number;
  readonly posX: number;
  readonly posY: number;
  readonly width?: number;
  readonly height?: number;
  readonly rotation?: number;
  readonly opacity?: number;
  readonly fitMode?: 'contain' | 'cover';
  readonly borderRadius?: number;
  readonly cropLeft?: number;
  readonly cropTop?: number;
  readonly cropRight?: number;
  readonly cropBottom?: number;
  readonly playbackRate?: number;
  readonly fadeInFrames?: number;
  readonly fadeOutFrames?: number;
  readonly volume?: number;
  readonly audioFadeInFrames?: number;
  readonly audioFadeOutFrames?: number;
  readonly displayName?: string;
  readonly groupId?: string;
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly fontWeight?: number;
  readonly textColor?: string;
  readonly textAlign?: 'left' | 'center' | 'right';
  readonly textBackground?: string;
  readonly transitionIn: ManifestTransitionType;
  readonly transitionDurationInFrames: number;
}

export interface ManifestTrackSettings {
  readonly name: string;
  readonly locked: boolean;
  readonly muted: boolean;
  readonly hidden: boolean;
}

export interface ManifestMetadata {
  readonly generatorVersion: string;
  readonly createdAt?: number;
  readonly author?: string;
}

export interface ManifestRenderRange {
  readonly startFrame: number;
  readonly endFrame: number;
}

export interface ManifestOutputOptions {
  readonly format: ManifestOutputFormat;
  readonly normalize: boolean;
}

export interface ReVideeoManifest {
  readonly manifestVersion: '1.0';
  readonly projectName: string;
  readonly resolution: ManifestResolution;
  readonly fps: number;
  readonly totalFrames: number;
  readonly clips: readonly ManifestClip[];
  readonly trackSettings: readonly ManifestTrackSettings[];
  readonly output: ManifestOutputOptions;
  readonly renderRange?: ManifestRenderRange;
  readonly metadata: ManifestMetadata;
}

export interface ManifestInput {
  readonly projectName: string;
  readonly resolution: ManifestResolution;
  readonly fps: number;
  readonly clips: readonly ManifestClip[];
  readonly trackSettings: readonly ManifestTrackSettings[];
  readonly totalFrames: number;
  readonly outputFormat: ManifestOutputFormat;
  readonly renderRange?: ManifestRenderRange;
  readonly normalize?: boolean;
  readonly metadata?: Partial<ManifestMetadata>;
}

export interface RendererAdapter {
  readonly name: string;
  toRendererPayload(manifest: ReVideeoManifest): unknown;
}
