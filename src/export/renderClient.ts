import type { VideoExportFormat, VideoExportInput } from './videoExporter';
import { RENDER_SERVER_BASE_URL as BASE_URL } from './renderServerConfig';
import { createProjectPayload, type ExportFile, readProjectPayload } from '../storage';
import type { StoredProject } from '../types';
import { generateVideoProjectConfig, type ManifestInput, type ManifestClip, type ReVideeoManifest } from '@revideeo/core';

const EXT_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/x-msvideo': 'avi',
};

const extensionForBlob = (blob: Blob): string => EXT_BY_TYPE[blob.type] ?? 'mp4';

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new DOMException('Eksport anulowany', 'AbortError');
};

export const exportVideoViaRenderServer = async (input: VideoExportInput): Promise<Blob> => {
  throwIfAborted(input.signal);

  const format: VideoExportFormat = input.format;
  const form = new FormData();
  const config = {
    clips: input.clips.map((clip) => {
      const { url: _url, ...rest } = clip as unknown as { url?: string };
      return rest;
    }),
    trackSettings: input.trackSettings,
    fps: input.fps,
    width: input.width,
    height: input.height,
    totalFrames: input.renderEndFrame ?? input.durationInFrames,
    startFrame: input.startFrame ?? 1,
    durationInFrames: input.durationInFrames,
    format,
    // Desktop renders the original asset; only mobile (Android/iOS) requests the
    // normalized, Chromium-safe transcode on the render server.
    normalize: input.normalize ?? false,
  };
  form.append('config', JSON.stringify(config));

  for (const asset of input.assets) {
    if (!asset.blob || asset.blob.size <= 0) continue;
    const ext = extensionForBlob(asset.blob);
    form.append(asset.sourceId, asset.blob, `${asset.sourceId}.${ext}`);
  }

  const baseUrl = input.serverUrl?.trim() || BASE_URL;
  const startRes = await fetch(`${baseUrl}/api/render`, { method: 'POST', body: form, signal: input.signal });
  if (!startRes.ok) {
    const message = await startRes.text().catch(() => '');
    throw new Error(`Serwer renderowania zwrócił błąd (${startRes.status}). ${message}`);
  }
  const { jobId } = (await startRes.json()) as { jobId: string };

  await new Promise<void>((resolve, reject) => {
    const es = new EventSource(`${baseUrl}/api/render/${jobId}/events`);
    const cancelJob = () => {
      void fetch(`${baseUrl}/api/render/${jobId}`, { method: 'DELETE', keepalive: true }).catch(() => {});
    };
    const onAbort = () => {
      cancelJob();
      es.close();
      reject(new DOMException('Eksport anulowany', 'AbortError'));
    };
    input.signal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => {
      es.close();
      input.signal?.removeEventListener('abort', onAbort);
    };
    es.onmessage = (event) => {
      let message: { type: string; value?: number; message?: string };
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === 'progress') {
        input.onProgress?.(message.value ?? 0);
      } else if (message.type === 'done') {
        cleanup();
        resolve();
      } else if (message.type === 'error') {
        cleanup();
        reject(new Error(message.message || 'Błąd renderowania'));
      }
    };
    es.onerror = () => {
      cleanup();
      reject(new Error('Utracono połączenie z serwerem renderowania'));
    };
  });

  const fileRes = await fetch(`${baseUrl}/api/render/${jobId}/file`, { signal: input.signal });
  if (!fileRes.ok) {
    throw new Error('Nie udało się pobrać wyrenderowanego pliku z serwera');
  }
  throwIfAborted(input.signal);
  return fileRes.blob();
};

export function buildManifestFromExportInput(input: VideoExportInput): ReVideeoManifest {
  const manifestInput: ManifestInput = {
    projectName: 'revideeo-export',
    resolution: { label: `${input.height}p`, width: input.width, height: input.height },
    fps: input.fps,
    clips: input.clips.map((clip) => ({
      id: clip.id,
      type: (clip.type ?? 'video') as ManifestClip['type'],
      sourceId: clip.sourceId,
      trackIndex: clip.trackIndex,
      offsetInTimeline: clip.offsetInTimeline,
      startFrame: clip.startFrame,
      durationInFrames: clip.durationInFrames,
      scale: clip.scale ?? 1,
      posX: clip.posX ?? 0,
      posY: clip.posY ?? 0,
      width: clip.width,
      height: clip.height,
      rotation: clip.rotation,
      opacity: clip.opacity,
      fitMode: clip.fitMode,
      borderRadius: clip.borderRadius,
      cropLeft: clip.cropLeft,
      cropTop: clip.cropTop,
      cropRight: clip.cropRight,
      cropBottom: clip.cropBottom,
      playbackRate: clip.playbackRate,
      fadeInFrames: clip.fadeInFrames,
      fadeOutFrames: clip.fadeOutFrames,
      volume: clip.volume,
      audioFadeInFrames: clip.audioFadeInFrames,
      audioFadeOutFrames: clip.audioFadeOutFrames,
      displayName: clip.displayName,
      groupId: clip.groupId,
      text: clip.text,
      fontSize: clip.fontSize,
      fontFamily: clip.fontFamily,
      fontWeight: clip.fontWeight,
      textColor: clip.textColor,
      textAlign: clip.textAlign,
      textBackground: clip.textBackground,
      transitionIn: (clip.transitionIn ?? 'none') as ManifestClip['transitionIn'],
      transitionDurationInFrames: clip.transitionDurationInFrames ?? 0,
    })),
    trackSettings: input.trackSettings,
    totalFrames: input.renderEndFrame ?? input.durationInFrames,
    outputFormat: input.format,
    renderRange: input.startFrame !== undefined || input.renderEndFrame !== undefined
      ? { startFrame: input.startFrame ?? 1, endFrame: input.renderEndFrame ?? input.durationInFrames }
      : undefined,
    normalize: input.normalize,
  };
  return generateVideoProjectConfig(manifestInput);
}

export const exportVideoViaManifest = async (input: VideoExportInput): Promise<Blob> => {
  throwIfAborted(input.signal);

  const manifest = buildManifestFromExportInput(input);
  const form = new FormData();
  form.append('manifest', JSON.stringify(manifest));

  for (const asset of input.assets) {
    if (!asset.blob || asset.blob.size <= 0) continue;
    const ext = extensionForBlob(asset.blob);
    form.append(asset.sourceId, asset.blob, `${asset.sourceId}.${ext}`);
  }

  const baseUrl = input.serverUrl?.trim() || BASE_URL;
  const startRes = await fetch(`${baseUrl}/api/render/manifest`, { method: 'POST', body: form, signal: input.signal });
  if (!startRes.ok) {
    const message = await startRes.text().catch(() => '');
    throw new Error(`Serwer renderowania zwrocil blad (${startRes.status}). ${message}`);
  }
  const { jobId } = (await startRes.json()) as { jobId: string };

  await new Promise<void>((resolve, reject) => {
    const es = new EventSource(`${baseUrl}/api/render/${jobId}/events`);
    const cancelJob = () => {
      void fetch(`${baseUrl}/api/render/${jobId}`, { method: 'DELETE', keepalive: true }).catch(() => {});
    };
    const onAbort = () => {
      cancelJob();
      es.close();
      reject(new DOMException('Eksport anulowany', 'AbortError'));
    };
    input.signal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => {
      es.close();
      input.signal?.removeEventListener('abort', onAbort);
    };
    es.onmessage = (event) => {
      let message: { type: string; value?: number; message?: string };
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === 'progress') {
        input.onProgress?.(message.value ?? 0);
      } else if (message.type === 'done') {
        cleanup();
        resolve();
      } else if (message.type === 'error') {
        cleanup();
        reject(new Error(message.message || 'Blad renderowania'));
      }
    };
    es.onerror = () => {
      cleanup();
      reject(new Error('Utracono polaczenie z serwerem renderowania'));
    };
  });

  const fileRes = await fetch(`${baseUrl}/api/render/${jobId}/file`, { signal: input.signal });
  if (!fileRes.ok) {
    throw new Error('Nie udalo sie pobrac wyrenderowanego pliku z serwera');
  }
  throwIfAborted(input.signal);
  return fileRes.blob();
};

export const exportProjectToRenderServer = async (
  project: StoredProject,
  media: Record<string, Blob>,
  serverUrl = BASE_URL,
  remoteProjectId?: string,
): Promise<void> => {
  const payload = await createProjectPayload(project, media);
  const base = serverUrl.replace(/\/$/, '');
  const response = await fetch(`${base}/api/space-render/projects${remoteProjectId ? `/${encodeURIComponent(remoteProjectId)}` : ''}`, {
    method: remoteProjectId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error((await response.text().catch(() => '')) || `Serwer zwrócił błąd (${response.status}).`);
};

export interface RemoteProjectSummary { id: string; name: string; savedAt: number; assets: number }

export const listRemoteProjects = async (serverUrl = BASE_URL): Promise<RemoteProjectSummary[]> => {
  const response = await fetch(`${serverUrl.replace(/\/$/, '')}/api/space-render/projects`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Nie udało się pobrać projektów z serwera renderu.');
  return ((await response.json()) as { projects: RemoteProjectSummary[] }).projects;
};

export const loadRemoteProject = async (id: string, serverUrl = BASE_URL) => {
  const response = await fetch(`${serverUrl.replace(/\/$/, '')}/api/space-render/projects/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('Nie udało się wczytać projektu z serwera renderu.');
  return readProjectPayload((await response.json()) as ExportFile);
};
