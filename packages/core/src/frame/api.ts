/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { FrameContext, ClipFrameInfo } from './types.js';

export interface FrameAPI {
  getClipFrame(clipId: string, frame?: number): Promise<ImageBitmap | null>;
  getContext(): FrameContext;
  getClipInfo(clipId: string, frame?: number): ClipFrameInfo | null;
  getVisibleClips(frame?: number): readonly ClipFrameInfo[];
}
