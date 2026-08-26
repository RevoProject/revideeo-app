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
  return 'image';
}

function assetToInfo(asset: MediaAsset): MediaInfo {
  return {
    id: asset.sourceId,
    name: asset.name,
    kind: inferKind(asset.blob.type),
    durationInFrames: asset.durationInFrames,
    loaded: asset.blob.size > 0,
    thumbnail: asset.thumbnails?.[0],
  };
}

export class AppMediaProvider implements MediaProvider {
  private getAssets: () => MediaAsset[];

  constructor(getAssets: () => MediaAsset[]) {
    this.getAssets = getAssets;
  }

  getById(id: string): MediaInfo | null {
    const asset = this.getAssets().find((a) => a.sourceId === id);
    return asset ? assetToInfo(asset) : null;
  }

  getAll(): readonly MediaInfo[] {
    return this.getAssets().map(assetToInfo);
  }
}
