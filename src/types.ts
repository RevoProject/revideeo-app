export type Orientation = '16:9' | '9:16';

export type TransitionType =
  | 'none'
  | 'fade'
  | 'slide'
  | 'wipe'
  | 'push'
  | 'cross-zoom'
  | 'dreamy-zoom'
  | 'linear-blur'
  | 'film-burn';

export interface ProjectConfig {
  resolutionLabel: string;
  orientation: Orientation;
  fps: number;
}

export interface StoredClip {
  id: string;
  type?: 'video' | 'text' | 'audio' | 'image';
  sourceId: string;
  trackIndex: number;
  offsetInTimeline: number;
  startFrame: number;
  durationInFrames: number;
  scale: number;
  posX: number;
  posY?: number;
  width?: number;
  height?: number;
  groupId?: string;
  rotation?: number;
  opacity?: number;
  displayName?: string;
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
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  textBackground?: string;
  transitionIn: TransitionType;
  transitionDurationInFrames: number;
}

export interface MediaAssetMeta {
  sourceId: string;
  name: string;
  durationInFrames: number;
}

export interface TimelineMarker {
  id: string;
  frame: number;
}

export interface TrackSettings {
  name: string;
  locked: boolean;
  muted: boolean;
  hidden: boolean;
}

export interface StoredProject {
  id: string;
  name: string;
  savedAt: number;
  config: ProjectConfig;
  clips: StoredClip[];
  assets: MediaAssetMeta[];
  trackCount: number;
  markers?: TimelineMarker[];
  trackSettings?: TrackSettings[];
}

export type AppLanguage = 'pl' | 'en' | 'de';

export interface RenderServer {
  id: string;
  url: string;
  alias?: string;
}

export interface AppSettings {
  autoSaveIntervalMinutes: number; // 0 = wyłączony
  language: AppLanguage;
  renderServers: RenderServer[];
  mobileRenderEnabled: boolean;
}
