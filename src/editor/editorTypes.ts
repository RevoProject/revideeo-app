/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

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
