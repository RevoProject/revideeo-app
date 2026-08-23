/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export type TimelineDrag =
  | { kind: 'clip'; clipId: string; clipIds: string[]; originals: { id: string; offset: number; track: number }[]; startX: number; startY: number; originalTrack: number; moved: boolean }
  | { kind: 'marquee'; startX: number; startY: number; moved: boolean }
  | { kind: 'trim-left' | 'trim-right'; clipId: string; startX: number; originalOffset: number; originalStartFrame: number; originalDuration: number; sourceDuration: number; moved: boolean }
  | { kind: 'transition'; clipId: string; startX: number; startY: number; originalTd: number; moved: boolean };
