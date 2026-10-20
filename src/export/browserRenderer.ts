/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { canRenderMediaOnWeb, renderMediaOnWeb, type WebRendererContainer, type WebRendererVideoCodec } from '@remotion/web-renderer';
import { VideoComposition } from '../editor/composition/VideoComposition';
import type { RenderClip } from '../editor/editorTypes';
import type { VideoExportInput } from './videoExporter';

const browserFormat = (format: VideoExportInput['format']): { container: WebRendererContainer; videoCodec: WebRendererVideoCodec } => {
  if (format === 'mp4') return { container: 'mp4', videoCodec: 'h264' };
  if (format === 'webm') return { container: 'webm', videoCodec: 'vp8' };
  throw new Error('Renderowanie bez serwera nie obsługuje formatu MKV.');
};

export const exportVideoInBrowser = async (input: VideoExportInput): Promise<Blob> => {
  if (input.signal?.aborted) throw new DOMException('Eksport anulowany', 'AbortError');
  const { container, videoCodec } = browserFormat(input.format);
  const support = await canRenderMediaOnWeb({ container, videoCodec, width: input.width, height: input.height });
  if (!support.canRender) {
    throw new Error(support.issues.map((issue) => issue.message).join(' ') || 'Ta przeglądarka nie obsługuje renderowania lokalnego.');
  }

  const urls = new Map<string, string>();
  for (const asset of input.assets) urls.set(asset.sourceId, URL.createObjectURL(asset.blob));
  const clips = input.clips.map((clip) => ({ ...clip, url: urls.get(clip.sourceId) })) as RenderClip[];
  const durationInFrames = Math.max(1, Math.round(input.renderEndFrame ?? input.durationInFrames));
  const startFrame = Math.min(Math.max(1, Math.round(input.startFrame ?? 1)), durationInFrames);
  const props = { clips, trackSettings: input.trackSettings, compositionWidth: input.width, compositionHeight: input.height };

  try {
    const result = await renderMediaOnWeb({
      composition: {
        id: 'VideoComposition',
        component: VideoComposition,
        durationInFrames,
        fps: input.fps,
        width: input.width,
        height: input.height,
        defaultProps: props,
      },
      inputProps: props,
      frameRange: [startFrame - 1, durationInFrames - 1],
      container,
      videoCodec,
      videoBitrate: 'high',
      audioBitrate: 'high',
      pageResponsiveness: 'medium',
      delayRenderTimeoutInMilliseconds: 120000,
      signal: input.signal,
      onProgress: ({ progress }) => input.onProgress?.(progress),
    });
    return await result.getBlob();
  } finally {
    for (const url of urls.values()) URL.revokeObjectURL(url);
  }
};
