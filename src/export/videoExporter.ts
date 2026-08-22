import type { StoredClip, TrackSettings } from '../types';
import { detectTrueVideoDuration } from '../utils/videoDuration';

export type VideoExportFormat = 'mp4' | 'mkv' | 'webm';

interface ExportAsset {
  sourceId: string;
  blob: Blob;
}

export interface VideoExportInput {
  clips: StoredClip[];
  assets: ExportAsset[];
  trackSettings: TrackSettings[];
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  renderEndFrame?: number;
  startFrame?: number;
  format: VideoExportFormat;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
  serverUrl?: string;
  normalize?: boolean;
}

export const safeName = (name: string): string => name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'revideeo-film';

export const serializeName = (name: string): string => {
  const serialized = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim();
  return serialized || 'revideeo';
};

export const checkAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new DOMException('Eksport anulowany', 'AbortError');
};

export const correctAssetDurationsBeforeExport = async (
  assets: ExportAsset[],
  fps: number,
  signal?: AbortSignal,
): Promise<Map<string, number>> => {
  const corrected = new Map<string, number>();
  for (const asset of assets) {
    checkAborted(signal);
    if (asset.blob.size <= 0) continue;
    const frames = await detectTrueVideoDuration(asset.blob, fps);
    corrected.set(asset.sourceId, frames);
  }
  return corrected;
};

import { exportVideoViaRenderServer, exportVideoViaManifest } from './renderClient';

export const exportVideo = async (input: VideoExportInput): Promise<Blob> => {
  checkAborted(input.signal);
  try {
    return await exportVideoViaManifest(input);
  } catch {
    return exportVideoViaRenderServer(input);
  }
};

export const downloadVideoBlob = (blob: Blob, name: string, format: VideoExportFormat): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName(name)}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
