import type { ProjectConfig, StoredClip, TrackSettings, TransitionType } from '../types';

export interface RenderClip extends StoredClip {
  url?: string;
}

export interface OpenProject {
  id: string;
  name: string;
  config: ProjectConfig;
  trackCount: number;
  trackSettings: TrackSettings[];
}

export interface MediaAsset {
  sourceId: string;
  name: string;
  durationInFrames: number;
  blob: Blob;
  thumbnails?: string[];
}

export interface OutgoingTransition {
  transitionIn: TransitionType;
  durationInFrames: number;
}

export type ContextMenuTarget =
  | { kind: 'clip'; clipId: string }
  | { kind: 'asset'; sourceId: string }
  | { kind: 'track'; trackIndex: number }
  | { kind: 'empty'; trackIndex: number }
  | { kind: 'transition'; clipId: string; trackIndex: number };

export type ContextMenuState = (ContextMenuTarget & { x: number; y: number }) | null;
