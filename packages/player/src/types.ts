export type ClipType = 'video' | 'text' | 'audio' | 'image';

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

export interface PlayerClip {
  readonly id: string;
  readonly type?: ClipType;
  readonly sourceId: string;
  readonly trackIndex: number;
  readonly offsetInTimeline: number;
  readonly startFrame: number;
  readonly durationInFrames: number;
  readonly scale: number;
  readonly posX: number;
  readonly posY?: number;
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
  readonly url?: string;
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly fontWeight?: number;
  readonly textColor?: string;
  readonly textAlign?: 'left' | 'center' | 'right';
  readonly textBackground?: string;
  readonly transitionIn: TransitionType;
  readonly transitionDurationInFrames: number;
}

export interface PlayerTrackSettings {
  readonly name: string;
  readonly locked: boolean;
  readonly muted: boolean;
  readonly hidden: boolean;
}

export interface NativePlayerHandle {
  toggle(): void;
  seekTo(frame: number): void;
  getCurrentFrame(): number;
  isPlaying(): boolean;
}

export interface NativePlayerProps {
  clips: readonly PlayerClip[];
  trackSettings: readonly PlayerTrackSettings[];
  compositionWidth: number;
  compositionHeight: number;
  durationInFrames: number;
  fps: number;
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  onPlayStateChange: (playing: boolean) => void;
  style?: React.CSSProperties;
}

export interface OutgoingTransition {
  transitionIn: TransitionType;
  durationInFrames: number;
}
