/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { TimelineState, TimelineClipInfo, TimelineTrackInfo } from './types.js';

export interface TimelineAPI {
  getState(): TimelineState;
  seekTo(frame: number): void;
  play(): void;
  pause(): void;
  toggle(): void;
  getClips(): readonly TimelineClipInfo[];
  getClipById(id: string): TimelineClipInfo | null;
  getClipsAtFrame(frame: number): readonly TimelineClipInfo[];
  getTracks(): readonly TimelineTrackInfo[];
  getTrack(index: number): TimelineTrackInfo | null;
}
