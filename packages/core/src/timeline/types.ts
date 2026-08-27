/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export interface TimelineState {
  readonly frame: number;
  readonly time: number;
  readonly fps: number;
  readonly durationInFrames: number;
  readonly durationInSeconds: number;
  readonly contentDurationInFrames: number;
  readonly contentDurationInSeconds: number;
  readonly isPlaying: boolean;
}

export interface TimelineClipInfo {
  readonly id: string;
  readonly type: 'video' | 'text' | 'audio' | 'image';
  readonly sourceId: string;
  readonly trackIndex: number;
  readonly offsetInTimeline: number;
  readonly startFrame: number;
  readonly durationInFrames: number;
  readonly transitionIn: string;
}

export interface TimelineTrackInfo {
  readonly index: number;
  readonly name: string;
  readonly locked: boolean;
  readonly muted: boolean;
  readonly hidden: boolean;
}
