/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export type MediaKind = 'video' | 'audio' | 'image';

export interface MediaInfo {
  readonly id: string;
  readonly name: string;
  readonly kind: MediaKind;
  readonly durationInFrames: number;
  readonly loaded: boolean;
}
