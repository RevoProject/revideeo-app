/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export type MediaElement = HTMLVideoElement | HTMLImageElement;

class MediaRegistryImpl {
  private elements = new Map<string, MediaElement>();

  register(clipId: string, element: MediaElement): void {
    this.elements.set(clipId, element);
  }

  unregister(clipId: string): void {
    this.elements.delete(clipId);
  }

  get(clipId: string): MediaElement | undefined {
    return this.elements.get(clipId);
  }

  has(clipId: string): boolean {
    return this.elements.has(clipId);
  }

  clear(): void {
    this.elements.clear();
  }
}

export const mediaRegistry = new MediaRegistryImpl();
