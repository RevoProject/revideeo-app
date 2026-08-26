/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export interface FrameContext {
  readonly frame: number;
  readonly time: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly durationInFrames: number;
}

export interface ClipFrameInfo {
  readonly clipId: string;
  readonly localFrame: number;
  readonly sourceFrame: number;
  readonly localTime: number;
  readonly sourceTime: number;
  readonly type: 'video' | 'image' | 'audio' | 'text';
  readonly visible: boolean;
  readonly sourceWidth?: number;
  readonly sourceHeight?: number;
}
