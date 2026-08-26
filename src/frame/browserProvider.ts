/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { FrameProvider } from '@revideeo/core/frame';
import { mediaRegistry } from '@revideeo/player';

function drawToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement | OffscreenCanvas {
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(width, height)
    : (() => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; })();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

async function canvasToImageBitmap(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<ImageBitmap> {
  if (canvas instanceof OffscreenCanvas) {
    return createImageBitmap(canvas);
  }
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png');
  });
  return createImageBitmap(blob);
}

export class BrowserFrameProvider implements FrameProvider {
  readonly available = true;

  async getClipFrame(
    clipId: string,
    _sourceFrame: number,
    _width: number,
    _height: number,
  ): Promise<ImageBitmap | null> {
    const element = mediaRegistry.get(clipId);
    if (!element) return null;

    try {
      if (element instanceof HTMLVideoElement) {
        if (!element.videoWidth || !element.videoHeight) return null;
        const canvas = drawToCanvas(element, element.videoWidth, element.videoHeight);
        return canvasToImageBitmap(canvas);
      }
      if (element instanceof HTMLImageElement) {
        if (!element.naturalWidth || !element.naturalHeight) return null;
        const canvas = drawToCanvas(element, element.naturalWidth, element.naturalHeight);
        return canvasToImageBitmap(canvas);
      }
    } catch {
      return null;
    }
    return null;
  }

  getClipDimensions(clipId: string): { width: number; height: number } | null {
    const element = mediaRegistry.get(clipId);
    if (!element) return null;
    if (element instanceof HTMLVideoElement) {
      if (!element.videoWidth || !element.videoHeight) return null;
      return { width: element.videoWidth, height: element.videoHeight };
    }
    if (element instanceof HTMLImageElement) {
      if (!element.naturalWidth || !element.naturalHeight) return null;
      return { width: element.naturalWidth, height: element.naturalHeight };
    }
    return null;
  }
}
