/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { MediaProvider, MediaInfo, MediaKind } from '@revideeo/core/media';
import type { MediaAsset } from '../editor/editorTypes';

function inferKind(mimeType: string): MediaKind {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  return 'image';
}

export class AppMediaProvider implements MediaProvider {
  private getAssets: () => MediaAsset[];
  private cache: MediaInfo[] = [];
  private cacheKey = '';

  constructor(getAssets: () => MediaAsset[]) {
    this.getAssets = getAssets;
  }

  private snapshot(): MediaInfo[] {
    const assets = this.getAssets();
    const key = assets.map((a) => a.sourceId).join(',');
    if (key !== this.cacheKey) {
      this.cacheKey = key;
      this.cache = assets.map((a) => ({
        id: a.sourceId,
        name: a.name,
        kind: inferKind(a.blob.type),
        durationInFrames: a.durationInFrames,
        loaded: a.blob.size > 0,
      }));
    }
    return this.cache;
  }

  getById(id: string): MediaInfo | null {
    return this.snapshot().find((m) => m.id === id) ?? null;
  }

  getAll(): readonly MediaInfo[] {
    return this.snapshot();
  }
}
