/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { NativePlayer, type NativePlayerHandle } from '@revideeo/player';
import {
  ArrowRightLeft,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clapperboard,
  ClipboardPaste,
  Combine,
  Copy,
  Edit3,
  FileUp,
  Layers,
  Plus,
  Scissors,
  Settings2,
  Trash2,
  Ungroup,
  RefreshCw,
} from 'lucide-react';
import type {
  AppLanguage,
  AppSettings,
  Orientation,
  ProjectConfig,
  RenderServer,
  StoredClip,
  StoredProject,
  TimelineMarker,
  TrackSettings,
  TransitionType,
} from './types';
import {
  deleteProject,
  deleteProjectMedia,
  exportProjectFile,
  generateId,
  getMedia,
  getSettings,
  listProjects,
  listRecentExports,
  putMedia,
  readProjectFile,
  saveSettings,
  deleteRecentExport,
  addRecentExport,
  updateRecentExport,
  type RecentExport,
  upsertProject,
} from './storage';
import { downloadVideoBlob, exportVideo, correctAssetDurationsBeforeExport, serializeName, type VideoExportFormat } from './export/videoExporter';
import { type ToolView } from './editor/tools/ToolsMenu';
import { ContextMenu } from './components/shared/ContextMenu';
import { Timeline as TimelineView } from './editor/timeline/Timeline';
import type { ContextMenuState, ContextMenuTarget, MediaAsset, OpenProject, RenderClip } from './editor/editorTypes';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { ExportFilmModal } from './components/modals/ExportFilmModal';
import { ExportReadyModal } from './components/modals/ExportReadyModal';
import { ExportProjectModal } from './components/modals/ExportProjectModal';
import { ReplaceAssetModal } from './components/modals/ReplaceAssetModal';
import { StartModal as StartModalView } from './components/modals/StartModal';
import { LibraryModal as LibraryModalView } from './components/modals/LibraryModal';
import { NewProjectModal as NewProjectModalView } from './components/modals/NewProjectModal';
import { SettingsModal as SettingsModalView } from './components/modals/SettingsModal';
import { AppSettingsModal as AppSettingsModalView } from './components/modals/AppSettingsModal';
import { PluginsModal } from './components/modals/PluginsModal';
import { JuicerModal, type JuicerSnapshot } from './components/modals/JuicerModal';
import { MediaPanel as MediaPanelView } from './editor/media/MediaPanel';
import { PropertiesPanel as PropertiesPanelView } from './editor/tools/PropertiesPanel';
import { Header as HeaderView } from './components/layout/Header';
import { PreviewTransformOverlay } from './editor/composition/PreviewTransformOverlay';
import { MobileEditorShell, type MobileEditorShellHandle } from './mobile/MobileEditorShell';
import { MobileTracksPanel } from './mobile/MobileTracksPanel';
import { useMobileDevice } from './mobile/useMobileDevice';
import { RENDER_SERVER_BASE_URL } from './export/renderServerConfig';
import { exportProjectToRenderServer, listRemoteProjects, loadRemoteProject, type RemoteProjectSummary } from './export/renderClient';
import { useRenderServersStatus, type RenderServerOption } from './export/useRenderServersStatus';
import { pluginRegistry } from './api';
import { usePluginRegistry } from './api/usePluginRegistry';
import { loadBundledPlugins } from './api/pluginLoader';
import { aiProviderRegistry } from './ai';
import { AlertModalProvider } from './components/shared/AlertModal';
import { ConfirmModal } from './components/shared/ConfirmModal';
import { showConfirm } from './components/shared/showConfirm';
import { showAlert } from './components/shared/showAlert';
import { getMaxTracks } from './capabilities';
import { WelcomeModal } from './components/modals/WelcomeModal';
import { ReleaseChangesModal } from './components/modals/ReleaseChangesModal';
import { UpdateModal } from './components/shared/UpdateModal';
import { useTranslation } from './i18n';
import { registerServiceWorker, checkForUpdate } from './pwa';

const DEFAULT_FPS = 30;

const DEFAULT_DURATION_SECONDS = 60;
const DEFAULT_TRANSITION_DURATION = 15;
const MIN_TRANSITION_DURATION = 5;
const MAX_TRANSITION_DURATION = 30;
const DEFAULT_TRACKS = 3;

const RESOLUTIONS: { label: string; landscape: ResolutionPreset; portrait: ResolutionPreset }[] = [
  { label: '360p', landscape: { label: '360p', width: 640, height: 360 }, portrait: { label: '360p', width: 360, height: 640 } },
  { label: '480p', landscape: { label: '480p', width: 854, height: 480 }, portrait: { label: '480p', width: 480, height: 854 } },
  { label: '720p', landscape: { label: '720p', width: 1280, height: 720 }, portrait: { label: '720p', width: 720, height: 1280 } },
  { label: '1080p', landscape: { label: '1080p', width: 1920, height: 1080 }, portrait: { label: '1080p', width: 1080, height: 1920 } },
  { label: '2K', landscape: { label: '2K', width: 2560, height: 1440 }, portrait: { label: '2K', width: 1440, height: 2560 } },
  { label: '4K', landscape: { label: '4K', width: 3840, height: 2160 }, portrait: { label: '4K', width: 2160, height: 3840 } },
];

const AUTO_SAVE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Wyłączony' },
  { value: 1, label: '1 min' },
  { value: 2, label: '2 min' },
  { value: 3, label: '3 min' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

// --- Modele danych ---
interface ResolutionPreset {
  label: string;
  width: number;
  height: number;
}

const TRANSITION_TYPES: { type: TransitionType; label: string }[] = [
  { type: 'none', label: 'Brak' },
  { type: 'fade', label: 'Fade' },
  { type: 'slide', label: 'Slide' },
  { type: 'wipe', label: 'Wipe' },
  { type: 'push', label: 'Push' },
  { type: 'cross-zoom', label: 'CrossZoom' },
  { type: 'dreamy-zoom', label: 'DreamZoom' },
  { type: 'linear-blur', label: 'Blur' },
  { type: 'film-burn', label: 'FilmBurn' },
];

const getPreset = (resolutionLabel: string, orientation: Orientation): ResolutionPreset => {
  const res = RESOLUTIONS.find((r) => r.label === resolutionLabel) ?? RESOLUTIONS[2];
  return orientation === '9:16' ? res.portrait : res.landscape;
};

const normalizeFps = (fps: number | undefined): number =>
  Number.isFinite(fps) && (fps ?? 0) > 0 ? fps as number : DEFAULT_FPS;

const makeId = (): string => generateId();

const defaultTrackSettings = (count: number, t: (key: string, params?: Record<string, string>) => string): TrackSettings[] =>
  Array.from({ length: count }, (_, index) => ({ name: t('timeline.track', { index: String(index + 1) }), locked: false, muted: false, hidden: false }));

const normalizeTrackSettings = (settings: TrackSettings[] | undefined, count: number, t: (key: string, params?: Record<string, string>) => string): TrackSettings[] =>
  Array.from({ length: count }, (_, index) => ({
    name: settings?.[index]?.name ?? t('timeline.track', { index: String(index + 1) }),
    locked: settings?.[index]?.locked ?? false,
    muted: settings?.[index]?.muted ?? false,
    hidden: settings?.[index]?.hidden ?? false,
  }));

const renumberDefaultTrackNames = (settings: TrackSettings[], t: (key: string, params?: Record<string, string>) => string): TrackSettings[] => {
  const onlyDefaults = settings.every((setting) => !setting.name || /^Ścieżka \d+$/.test(setting.name));
  return onlyDefaults ? settings.map((setting, index) => ({ ...setting, name: t('timeline.track', { index: String(index + 1) }) })) : settings;
};

const normalizeClip = (clip: StoredClip): StoredClip => ({
  ...clip,
  trackIndex: clip.trackIndex ?? 0,
  scale: clip.scale ?? 1,
  posX: clip.posX ?? 0,
  posY: clip.posY ?? 0,
  width: clip.width ?? 100,
  height: clip.height ?? 100,
  transitionDurationInFrames: Math.max(
    MIN_TRANSITION_DURATION,
    Math.min(MAX_TRANSITION_DURATION, clip.transitionDurationInFrames ?? DEFAULT_TRANSITION_DURATION),
  ),
});

// Reads actual video duration without network upload
const loadVideoDurationInFrames = (url: string, fps: number): Promise<number> =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    let resolved = false;
    const finish = (dur: number) => {
      if (resolved) return;
      resolved = true;
      video.src = '';
      video.load();
      resolve(Number.isFinite(dur) ? Math.max(1, Math.round(dur * fps)) : Math.round(DEFAULT_DURATION_SECONDS * fps));
    };
    
    video.onloadedmetadata = () => {
      // For large files, metadata may not contain correct duration
      // Try reading duration after first frame loads
      if (video.duration && isFinite(video.duration) && video.duration > 1) {
        finish(video.duration);
      }
    };
    video.onloadeddata = () => {
      // After first frame loads, duration should be accurate
      if (video.duration && isFinite(video.duration) && video.duration > 1) {
        finish(video.duration);
      }
    };
    video.oncanplaythrough = () => {
      if (video.duration && isFinite(video.duration) && video.duration > 1) {
        finish(video.duration);
      }
    };
    video.onerror = () => finish(DEFAULT_DURATION_SECONDS);
    // Timeout fallback — seek to end to detect actual duration
    setTimeout(async () => {
      if (resolved) return;
      if (video.duration && isFinite(video.duration) && video.duration > 1) {
        finish(video.duration);
      } else if (!resolved) {
        // Seek to end to detect actual duration
        try {
          video.currentTime = 1e9; // large value to seek to end
          await new Promise<void>((r) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              r();
            };
            video.addEventListener('seeked', onSeeked, { once: true });
          });
          if (video.duration && isFinite(video.duration) && video.duration > 1) {
            finish(video.duration);
          } else {
            finish(DEFAULT_DURATION_SECONDS);
          }
        } catch {
          finish(DEFAULT_DURATION_SECONDS);
        }
      }
    }, 8000);
    video.src = url;
  });

const createVideoThumbnails = (blob: Blob, count = 8): Promise<string[]> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    const thumbnails: string[] = [];
    let duration = 0;
    let index = 0;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const finish = () => {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(thumbnails);
    };
    video.onloadedmetadata = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (!video.videoWidth || !duration) {
        finish();
        return;
      }
      video.currentTime = duration * (index + 0.5) / count;
    };
    video.onseeked = () => {
      const width = 320;
      const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = Number.isFinite(height) ? height : 180;
      const context = canvas.getContext('2d');
      if (!context || !video.videoWidth) {
        finish();
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      thumbnails.push(canvas.toDataURL('image/jpeg', 0.78));
      index += 1;
      if (index >= count) finish();
      else video.currentTime = duration * (index + 0.5) / count;
    };
    video.onerror = () => finish();
    video.src = url;
  });

// --- Clip operations (free positioning, multi-track) ---

const groupByTrack = <T extends { trackIndex: number; offsetInTimeline: number }>(clips: T[]): [number, T[]][] => {
  const map = new Map<number, T[]>();
  for (const clip of clips) {
    const arr = map.get(clip.trackIndex) ?? [];
    arr.push(clip);
    map.set(clip.trackIndex, arr);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
};

const previousClip = (clips: StoredClip[], clip: StoredClip): StoredClip | null =>
  clips
    .filter((c) => c.trackIndex === clip.trackIndex && c.offsetInTimeline < clip.offsetInTimeline)
    .sort((a, b) => b.offsetInTimeline - a.offsetInTimeline)[0] ?? null;

const splitOverlapsForClip = (clips: StoredClip[], inserted: StoredClip): StoredClip[] => {
  const start = inserted.offsetInTimeline;
  const end = start + inserted.durationInFrames;
  const result: StoredClip[] = [];
  for (const clip of clips) {
    if (clip.id === inserted.id || clip.trackIndex !== inserted.trackIndex || clip.offsetInTimeline + clip.durationInFrames <= start || clip.offsetInTimeline >= end) {
      result.push(clip);
      continue;
    }
    const clipEnd = clip.offsetInTimeline + clip.durationInFrames;
    const leftDuration = Math.max(0, start - clip.offsetInTimeline);
    if (leftDuration > 0) result.push({ ...clip, durationInFrames: leftDuration, transitionIn: 'none' });
    const rightDuration = Math.max(0, clipEnd - end);
    if (rightDuration > 0) result.push({ ...clip, id: makeId(), offsetInTimeline: end, startFrame: clip.startFrame + (end - clip.offsetInTimeline), durationInFrames: rightDuration, transitionIn: 'none' });
  }
  result.push(inserted);
  return result;
};

const snapTransition = (
  clips: StoredClip[],
  clipId: string,
  type: TransitionType,
  td: number,
): StoredClip[] => {
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return clips;
  const prev = previousClip(clips, clip);
  const duration = Math.max(MIN_TRANSITION_DURATION, Math.min(MAX_TRANSITION_DURATION, td || DEFAULT_TRANSITION_DURATION));
  return clips.map((c) =>
    c.id === clipId
      ? {
          ...c,
          transitionIn: type,
          transitionDurationInFrames: duration,
          offsetInTimeline: prev
            ? Math.max(0, prev.offsetInTimeline + prev.durationInFrames - duration)
            : c.offsetInTimeline,
        }
      : c,
  );
};

const findJunctionAt = (
  clips: StoredClip[],
  frame: number,
  excludeClipId: string,
  toleranceFrames: number,
): StoredClip | null => {
  for (const [, trackClips] of groupByTrack(clips)) {
    for (let i = 0; i < trackClips.length - 1; i++) {
      const x = trackClips[i];
      const y = trackClips[i + 1];
      if (y.id === excludeClipId) continue;
      if (y.offsetInTimeline === x.offsetInTimeline + x.durationInFrames) {
        if (Math.abs(y.offsetInTimeline - frame) <= toleranceFrames) return y;
      }
    }
  }
  return null;
};

// --- Transition visualization (manual, frame-based) ---
// --- Keyboard shortcuts popup ---
// --- TIMELINE (bottom panel) — multi-track ---
export default function ReVideeo() {
  const playerRef = useRef<NativePlayerHandle>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const mobileShellRef = useRef<MobileEditorShellHandle>(null);
  const mediaUrls = useRef(new Map<string, string>());

  const [project, setProject] = useState<OpenProject | null>(null);
  const [projectSource, setProjectSource] = useState<'local' | 'remote'>('local');
  const [remoteProjectId, setRemoteProjectId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const FPS = project?.config.fps ?? DEFAULT_FPS;
  const [clips, setClips] = useState<StoredClip[]>([]);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [dirty, setDirty] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const renderServerCandidates: RenderServerOption[] = [
    { url: RENDER_SERVER_BASE_URL, label: RENDER_SERVER_BASE_URL.replace(/^https?:\/\//, '') },
    ...(settings.renderServers ?? []).filter((server) => server.url.trim()).map((server) => ({ url: server.url.trim(), label: server.alias?.trim() || server.url.trim() })),
  ].filter((server, index, all) => all.findIndex((item) => item.url === server.url) === index);
  const { available: spaceRenderServers, checking: spaceRenderChecking } = useRenderServersStatus(renderServerCandidates, 5000, true, 'space-render');

  useEffect(() => {
    for (const server of spaceRenderServers) {
      fetch(`${server.url}/api/juicer/status`, { signal: AbortSignal.timeout(3000) })
        .then((res) => res.json())
        .then((data: { enabled?: boolean; providerLabel?: string; modelName?: string }) => {
          if (data.enabled) {
            aiProviderRegistry.registerServerProvider(server.url, data.providerLabel ?? server.label, data.modelName ?? 'AI');
          } else {
            aiProviderRegistry.removeServerProvider(server.url);
          }
        })
        .catch(() => { aiProviderRegistry.removeServerProvider(server.url); });
    }
  }, [spaceRenderServers]);
  const [remoteProjects, setRemoteProjects] = useState<RemoteProjectSummary[]>([]);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [mediaImport, setMediaImport] = useState<{ total: number; done: number; name: string } | null>(null);
  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);
  const [exportReady, setExportReady] = useState<{ id: string; blob: Blob; name: string; format: VideoExportFormat } | null>(null);
  const juicerSnapshotRef = useRef<JuicerSnapshot | null>(null);
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('revideeo:welcomed');
  });
  const [showRelease, setShowRelease] = useState(() => {
    const lastSeen = localStorage.getItem('revideeo:lastSeenVersion');
    return lastSeen !== '0.2.1';
  });
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const { setLang, t } = useTranslation();

  useEffect(() => {
    void registerServiceWorker();
    const stop = checkForUpdate((v) => setUpdateVersion(v));
    return stop;
  }, []);

  const [modal, setModal] = useState<'start' | 'new' | 'settings' | 'app-settings' | 'library' | 'shortcuts' | 'export-film' | 'export-project' | 'replace-asset' | 'plugins' | 'juicer' | null>('start');
  const [replacementSourceId, setReplacementSourceId] = useState<string | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [toolView, setToolView] = useState<ToolView>('properties');

  useEffect(() => {
    const serverUrl = spaceRenderServers[0]?.url;
    if (!serverUrl || modal !== 'start') {
      if (!serverUrl) setRemoteProjects([]);
      return;
    }
    setRemoteError(null);
    void listRemoteProjects(serverUrl).then(setRemoteProjects).catch((err) => setRemoteError(String(err)));
  }, [spaceRenderServers, modal]);

  useEffect(() => {
    void loadBundledPlugins();
  }, []);

  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [showTransformOverlay, setShowTransformOverlay] = useState(true);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<number>(0);
  const [mediaWidth, setMediaWidth] = useState<number>(320);
  const [timelineHeight, setTimelineHeight] = useState<number>(320);
  const editorMainRef = useRef<HTMLDivElement>(null);
  const mediaDragRef = useRef<boolean>(false);
  const timelineDragRef = useRef<boolean>(false);

  const startMediaDrag = (event: React.MouseEvent) => {
    event.preventDefault();
    mediaDragRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      if (!mediaDragRef.current || !editorMainRef.current) return;
      const rect = editorMainRef.current.getBoundingClientRect();
      const next = Math.min(640, Math.max(220, ev.clientX - rect.left));
      setMediaWidth(next);
    };
    const onUp = () => {
      mediaDragRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startTimelineDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    timelineDragRef.current = true;
    const startY = event.clientY;
    const startHeight = timelineHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    const onMove = (moveEvent: PointerEvent) => {
      if (!timelineDragRef.current) return;
      const maxHeight = Math.min(620, Math.round(window.innerHeight * 0.7));
      setTimelineHeight(Math.max(220, Math.min(maxHeight, startHeight - (moveEvent.clientY - startY))));
    };
    const onUp = () => {
      timelineDragRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [appReady, setAppReady] = useState(false);
  const isMobileDevice = useMobileDevice();
  const isChromium = useMemo(() => {
    const ua = navigator.userAgent;
    return /Chrom|CriOS|Edg\/|OPR\//i.test(ua);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAppReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listRecentExports().then((list) => {
      if (!cancelled) setRecentExports(list);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [loading, setLoading] = useState<{ progress: number; label: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const pluginSnapshot = usePluginRegistry();

  const trackSettings = project?.trackSettings ?? defaultTrackSettings(DEFAULT_TRACKS, t);
  const isTrackLocked = useCallback(
    (trackIndex: number) => project?.trackSettings[trackIndex]?.locked ?? false,
    [project],
  );

  const library = listProjects();

  // Historia undo/redo
  const historyRef = useRef<{ past: { clips: StoredClip[]; trackCount?: number; trackSettings?: TrackSettings[] }[]; future: { clips: StoredClip[]; trackCount?: number; trackSettings?: TrackSettings[] }[] }>({
    past: [],
    future: [],
  });
  const clipboardRef = useRef<StoredClip | null>(null);
  const deletedAssetsHistoryRef = useRef<MediaAsset[]>([]);
  const replacedAssetsHistoryRef = useRef<{ sourceId: string; asset: MediaAsset; clips: StoredClip[] }[]>([]);
  const clipsRef = useRef(clips);
  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  const selectClip = useCallback((id: string, additive = false) => {
    const clip = clipsRef.current.find((item) => item.id === id);
    if (!clip) return;
    const groupIds = clip.groupId ? clipsRef.current.filter((item) => item.groupId === clip.groupId).map((item) => item.id) : [id];
    setSelectedClipIds((previous) => {
      if (!additive) return groupIds;
      const allSelected = groupIds.every((groupId) => previous.includes(groupId));
      return allSelected ? previous.filter((selectedId) => !groupIds.includes(selectedId)) : [...new Set([...previous, ...groupIds])];
    });
    setSelectedClipId(additive && selectedClipIds.includes(id) ? null : id);
    setShowTransformOverlay(true);
  }, [selectedClipIds]);

  const selectClips = useCallback((ids: string[]) => {
    setSelectedClipIds(ids);
    setSelectedClipId(ids[0] ?? null);
    setShowTransformOverlay(ids.length > 0);
  }, []);

  const beginEdit = useCallback(() => {
    const h = historyRef.current;
    h.past.push({
      clips: clipsRef.current,
      trackCount: project?.trackCount,
      trackSettings: project?.trackSettings,
    });
    if (h.past.length > 100) h.past.shift();
    h.future = [];
  }, [project]);

  const undo = useCallback(() => {
    const replacedAsset = replacedAssetsHistoryRef.current.pop();
    if (replacedAsset) {
      setAssets((prev) => prev.map((asset) => asset.sourceId === replacedAsset.sourceId ? replacedAsset.asset : asset));
      setClips(replacedAsset.clips);
      setDirty(true);
      return;
    }
    const deletedAsset = deletedAssetsHistoryRef.current.pop();
    if (deletedAsset) {
      setAssets((prev) => (prev.some((asset) => asset.sourceId === deletedAsset.sourceId) ? prev : [...prev, deletedAsset]));
      setDirty(true);
      return;
    }
    const h = historyRef.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push({
      clips: clipsRef.current,
      trackCount: project?.trackCount,
      trackSettings: project?.trackSettings,
    });
    setClips(prev.clips);
    if (prev.trackCount !== undefined && prev.trackSettings !== undefined) {
      setProject((p) => p ? { ...p, trackCount: prev.trackCount!, trackSettings: prev.trackSettings! } : p);
    }
    setDirty(true);
  }, [project]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push({
      clips: clipsRef.current,
      trackCount: project?.trackCount,
      trackSettings: project?.trackSettings,
    });
    setClips(next.clips);
    if (next.trackCount !== undefined && next.trackSettings !== undefined) {
      setProject((p) => p ? { ...p, trackCount: next.trackCount!, trackSettings: next.trackSettings! } : p);
    }
    setDirty(true);
  }, [project]);

  const canUndo =
    historyRef.current.past.length > 0 ||
    replacedAssetsHistoryRef.current.length > 0 ||
    deletedAssetsHistoryRef.current.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  const resetHistory = useCallback(() => {
    historyRef.current = { past: [], future: [] };
  }, []);

  const totalFrames = useMemo(() => {
    const last = clips.reduce((max, clip) => Math.max(max, clip.offsetInTimeline + clip.durationInFrames), 0);
    return Math.max(last, 1);
  }, [clips]);

  const contentFrames = useMemo(() => {
    let maxEnd = 0;
    for (const clip of clips) {
      const track = project?.trackSettings?.[clip.trackIndex];
      if (track?.hidden) continue;
      const asset = assets.find((a) => a.sourceId === clip.sourceId);
      const assetDuration = asset?.durationInFrames ?? clip.durationInFrames;
      const clipEnd = clip.offsetInTimeline + Math.min(clip.durationInFrames, assetDuration);
      maxEnd = Math.max(maxEnd, clipEnd);
    }
    return Math.max(maxEnd, 1);
  }, [clips, assets, project?.trackSettings]);

  const clipUnderPlayhead = useMemo(
    () =>
      clips.find(
        (clip) => currentFrame >= clip.offsetInTimeline && currentFrame < clip.offsetInTimeline + clip.durationInFrames,
      ) ?? null,
    [clips, currentFrame],
  );
  const activeClip = selectedClipId
    ? clips.find((clip) => clip.id === selectedClipId) ?? clipUnderPlayhead
    : clipUnderPlayhead;
  const activeAsset = activeClip ? assets.find((asset) => asset.sourceId === activeClip.sourceId) : undefined;
  const activeClipIndex = activeClip
    ? clips
        .filter((c) => c.trackIndex === activeClip.trackIndex)
        .sort((a, b) => a.offsetInTimeline - b.offsetInTimeline)
        .findIndex((c) => c.id === activeClip.id)
    : -1;

  // Media URL resolution. In dev mode, media is served via dev-server
  // as plain HTTP URLs (MEDIA_SERVER_PREFIX), because blob: in insecure
  // contexts (http on LAN) is blocked by mobile Chrome/Brave — <Video>
  // never loads → delayRender timeout. In production builds
  // (DEV=false) we use blob: (works under HTTPS).
  // Path must stay in sync with MEDIA_SERVER_PREFIX in vite.config.ts.
  const MEDIA_SERVER_PREFIX = '/__revideeo_media';
  const [mediaHttpUrls, setMediaHttpUrls] = useState<Map<string, string>>(new Map());
  const uploadedRef = useRef<Set<string>>(new Set());

  const hashSourceId = (s: string): string => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const origin = window.location.origin;
    for (const asset of assets) {
      if (uploadedRef.current.has(asset.sourceId)) continue;
      uploadedRef.current.add(asset.sourceId);
      const key = hashSourceId(asset.sourceId);
      const url = `${origin}${MEDIA_SERVER_PREFIX}/${key}`;
      fetch(url, {
        method: 'POST',
        headers: { 'content-type': asset.blob.type || 'application/octet-stream' },
        body: asset.blob,
      })
        .then(() => setMediaHttpUrls((prev) => new Map(prev).set(asset.sourceId, url)))
        .catch(() => {
          uploadedRef.current.delete(asset.sourceId);
        });
    }
  }, [assets]);

  const clipsForPlayer = useMemo<RenderClip[]>(() => {
    return clips.map((clip) => {
      const asset = assets.find((a) => a.sourceId === clip.sourceId);
      const httpUrl = mediaHttpUrls.get(clip.sourceId);
      let url = httpUrl;
      if (!url) {
        url = mediaUrls.current.get(clip.sourceId);
        if (asset && !url && !import.meta.env.DEV) {
          url = URL.createObjectURL(asset.blob);
          mediaUrls.current.set(clip.sourceId, url);
        }
      }
      return { ...clip, url };
    });
  }, [clips, assets, mediaHttpUrls]);

  const revokeMedia = useCallback(() => {
    mediaUrls.current.forEach((url) => URL.revokeObjectURL(url));
    mediaUrls.current.clear();
  }, []);

  useEffect(() => {
    return () => revokeMedia();
  }, [revokeMedia]);

  // Clamp playhead when timeline length changes
  useEffect(() => {
    if (currentFrame > totalFrames) {
      setCurrentFrame(totalFrames);
      playerRef.current?.seekTo(totalFrames);
    }
  }, [totalFrames, currentFrame]);

  const seekTo = useCallback(
    (frame: number) => {
      const clamped = Math.max(0, Math.min(frame, totalFrames));
      setCurrentFrame(clamped);
      playerRef.current?.seekTo(clamped);
    },
    [totalFrames],
  );

  useEffect(() => {
    if (project) {
      pluginRegistry.setProjectContext({
        getName: () => project.name,
        getConfig: () => project.config,
        getTrackCount: () => project.trackCount,
        getTrackSettings: () => project.trackSettings,
        isDirty: () => dirty,
        markDirty: () => setDirty(true),
        getCurrentFrame: () => currentFrame,
        seekTo,
        getTotalFrames: () => totalFrames,
        addMarker: (frame: number) => {
          setMarkers((prev) => {
            if (prev.some((m) => m.frame === frame)) return prev;
            return [...prev, { id: generateId(), frame }].sort((a, b) => a.frame - b.frame);
          });
          setDirty(true);
        },
        removeMarker: (id: string) => {
          setMarkers((prev) => prev.filter((m) => m.id !== id));
          setDirty(true);
        },
        getMarkers: () => markers,
        getAllClips: () => clips,
        getSelectedClipIds: () => selectedClipIds,
        addClip: (clip: Omit<StoredClip, 'id'>) => {
          const id = generateId();
          const newClip: StoredClip = { ...clip, id };
          setClips((prev) => [...prev, newClip]);
          setDirty(true);
          return id;
        },
        updateClip: (id: string, patch: Partial<StoredClip>) => {
          setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
          setDirty(true);
        },
        removeClip: (id: string) => {
          setClips((prev) => prev.filter((c) => c.id !== id));
          setDirty(true);
        },
      }, project.id);
    } else {
      pluginRegistry.clearProjectContext();
    }
  }, [project, clips, currentFrame, dirty, markers, selectedClipIds, seekTo, totalFrames]);

  // Prevent page refresh/close with unsaved project
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // --- Clip mutations ---
  const updateClip = useCallback(
    (id: string, patch: Partial<StoredClip>) => {
      const current = clipsRef.current.find((clip) => clip.id === id);
      if (!current || isTrackLocked(current.trackIndex) || (patch.trackIndex !== undefined && isTrackLocked(patch.trackIndex))) {
        return;
      }
      beginEdit();
      if (patch.durationInFrames !== undefined && patch.durationInFrames !== current.durationInFrames) {
        const delta = patch.durationInFrames - current.durationInFrames;
        const oldEnd = current.offsetInTimeline + current.durationInFrames;
        setClips((prev) => {
          const updated = prev.map((clip) => {
            if (clip.id === id) return { ...clip, ...patch };
            if (clip.trackIndex === current.trackIndex && clip.offsetInTimeline >= oldEnd) {
              return { ...clip, offsetInTimeline: clip.offsetInTimeline + delta };
            }
            return clip;
          });
          // Second pass: snap clips with transitions to their new predecessor
          // Accumulate results so later clips see already-snapped predecessors
          const snapped: typeof updated = [];
          for (const clip of updated) {
            if (clip.trackIndex !== current.trackIndex || clip.transitionIn === 'none' || clip.transitionDurationInFrames <= 0) {
              snapped.push(clip);
              continue;
            }
            // Find the latest clip that starts before this clip (the predecessor)
            let bestStart = -Infinity;
            let bestClip: StoredClip | null = null;
            for (const other of snapped) {
              if (other.trackIndex !== clip.trackIndex) continue;
              if (other.offsetInTimeline < clip.offsetInTimeline && other.offsetInTimeline > bestStart) {
                bestStart = other.offsetInTimeline;
                bestClip = other;
              }
            }
            if (!bestClip) { snapped.push(clip); continue; }
            const snappedOffset = (bestClip.offsetInTimeline + bestClip.durationInFrames) - clip.transitionDurationInFrames;
            if (snappedOffset === clip.offsetInTimeline) { snapped.push(clip); continue; }
            snapped.push({ ...clip, offsetInTimeline: Math.max(0, snappedOffset) });
          }
          return snapped;
        });
      } else {
        setClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)));
      }
      setDirty(true);
    },
    [beginEdit, isTrackLocked],
  );

  const applyClipDrag = useCallback(
    (id: string, patch: Partial<StoredClip>) => {
      const current = clipsRef.current.find((clip) => clip.id === id);
      if (!current || isTrackLocked(current.trackIndex) || (patch.trackIndex !== undefined && isTrackLocked(patch.trackIndex))) {
        return;
      }
      setClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)));
    },
    [isTrackLocked],
  );

  const applyClipPreset = useCallback(
    (id: string, patch: Partial<StoredClip>) => {
      const current = clipsRef.current.find((clip) => clip.id === id);
      if (!current || isTrackLocked(current.trackIndex)) return;
      beginEdit();
      setClips((previous) => previous.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)));
      setDirty(true);
    },
    [beginEdit, isTrackLocked],
  );

  const handleClipDragEnd = useCallback(
    (id: string) => {
      const clip = clipsRef.current.find((c) => c.id === id);
      if (!clip) return;
      setClips((previous) => {
        const withoutOverlap = splitOverlapsForClip(previous.filter((item) => item.id !== id), clip);
        const moved = withoutOverlap.find((item) => item.id === id) ?? clip;
        if (moved.transitionIn === 'none') return withoutOverlap;
        const prev = previousClip(withoutOverlap, moved);
        if (!prev) return withoutOverlap;
        const overlap = prev.offsetInTimeline + prev.durationInFrames - moved.offsetInTimeline;
        const td = moved.transitionDurationInFrames ?? DEFAULT_TRANSITION_DURATION;
        return overlap >= 0 && overlap <= td + 10 ? snapTransition(withoutOverlap, id, moved.transitionIn, td) : withoutOverlap;
      });
    },
    [],
  );

  const handleDeleteClip = useCallback(
    (id: string) => {
      const clip = clipsRef.current.find((item) => item.id === id);
      if (!clip || isTrackLocked(clip.trackIndex)) return;
      beginEdit();
      setClips((prev) => prev.filter((clip) => clip.id !== id));
      setSelectedClipId((prev) => (prev === id ? null : prev));
      setSelectedClipIds((prev) => prev.filter((clipId) => clipId !== id));
      setDirty(true);
    },
    [beginEdit, isTrackLocked],
  );

  const cutClip = useCallback(
    (id: string) => {
      const clip = clipsRef.current.find((item) => item.id === id);
      if (!clip || isTrackLocked(clip.trackIndex)) return;
      clipboardRef.current = clip;
      handleDeleteClip(id);
    },
    [handleDeleteClip, isTrackLocked],
  );

  const copyClip = useCallback((id: string) => {
    const clip = clipsRef.current.find((item) => item.id === id);
    if (clip) clipboardRef.current = clip;
  }, []);

  const copyClipFromTrack = useCallback((trackIndex: number) => {
    const clip = clipsRef.current.find((item) => item.id === selectedClipId && item.trackIndex === trackIndex)
      ?? clipsRef.current.find((item) => item.trackIndex === trackIndex && currentFrame >= item.offsetInTimeline && currentFrame < item.offsetInTimeline + item.durationInFrames);
    if (clip) clipboardRef.current = clip;
  }, [currentFrame, selectedClipId]);

  const pasteClip = useCallback((targetTrack = selectedTrack) => {
    const source = clipboardRef.current;
    if (!source || isTrackLocked(targetTrack)) return;
    const clip: StoredClip = {
      ...source,
      id: makeId(),
      trackIndex: targetTrack,
      offsetInTimeline: currentFrame,
      transitionIn: 'none',
    };
    beginEdit();
    setClips((prev) => splitOverlapsForClip(prev, clip));
    setSelectedClipId(clip.id);
    setSelectedClipIds([clip.id]);
    setDirty(true);
  }, [beginEdit, currentFrame, isTrackLocked, selectedTrack]);

  const duplicateClip = useCallback(
    (id: string) => {
      const source = clipsRef.current.find((item) => item.id === id);
      if (!source || isTrackLocked(source.trackIndex)) return;
      const clip = { ...source, id: makeId(), offsetInTimeline: source.offsetInTimeline + source.durationInFrames, transitionIn: 'none' as const };
      beginEdit();
      setClips((prev) => splitOverlapsForClip(prev, clip));
      setSelectedClipId(clip.id);
      setSelectedClipIds([clip.id]);
      setDirty(true);
    },
    [beginEdit, isTrackLocked],
  );

  const removeAssetFromLibrary = useCallback((sourceId: string) => {
    const asset = assets.find((item) => item.sourceId === sourceId);
    if (!asset) return;
    deletedAssetsHistoryRef.current.push(asset);
    setAssets((prev) => prev.filter((item) => item.sourceId !== sourceId));
    setDirty(true);
  }, [assets]);

  const renameAsset = useCallback((sourceId: string) => {
    const asset = assets.find((item) => item.sourceId === sourceId);
    if (!asset) return;
    const nextName = window.prompt('Nowa nazwa pliku', asset.name)?.trim();
    if (!nextName || nextName === asset.name) return;
    setAssets((previous) => previous.map((item) => item.sourceId === sourceId ? { ...item, name: nextName } : item));
    setDirty(true);
  }, [assets]);

  const replaceAsset = useCallback(async (sourceId: string, file: File) => {
    const previousAsset = assets.find((asset) => asset.sourceId === sourceId);
    if (!previousAsset) return;
    try {
      const probeUrl = URL.createObjectURL(file);
      const durationInFrames = await loadVideoDurationInFrames(probeUrl, FPS);
      URL.revokeObjectURL(probeUrl);
      const thumbnails = await createVideoThumbnails(file);
      replacedAssetsHistoryRef.current.push({ sourceId, asset: previousAsset, clips: clipsRef.current });
      const oldUrl = mediaUrls.current.get(sourceId);
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
        mediaUrls.current.delete(sourceId);
      }
      setAssets((prev) => prev.map((asset) => asset.sourceId === sourceId
        ? { ...asset, blob: file, durationInFrames, thumbnails }
        : asset));
      setClips((prev) => prev.map((clip) => {
        if (clip.sourceId !== sourceId) return clip;
        const maxStart = Math.max(0, durationInFrames - 1);
        const startFrame = Math.min(clip.startFrame, maxStart);
        const maxDuration = Math.max(1, durationInFrames - startFrame);
        return { ...clip, startFrame, durationInFrames: Math.min(clip.durationInFrames, maxDuration) };
      }));
      setDirty(true);
      setReplacementSourceId(null);
      setModal(null);
    } catch (err) {
      showAlert(t('ctx.replaceError'), t('ctx.replaceErrorMessage') + String(err));
    }
  }, [assets, FPS]);

  const insertTrack = useCallback((trackIndex: number, above: boolean) => {
    if (!project || project.trackCount >= getMaxTracks()) return;
    const insertAt = above ? trackIndex + 1 : trackIndex;
    setClips((prev) => prev.map((clip) => (clip.trackIndex >= insertAt ? { ...clip, trackIndex: clip.trackIndex + 1 } : clip)));
    setProject((prev) => {
      if (!prev) return prev;
      const nextSettings = normalizeTrackSettings(prev.trackSettings, prev.trackCount, t);
      nextSettings.splice(insertAt, 0, ...defaultTrackSettings(1, t));
      return { ...prev, trackCount: prev.trackCount + 1, trackSettings: renumberDefaultTrackNames(nextSettings, t) };
    });
    setSelectedTrack(insertAt);
    setDirty(true);
  }, [project]);

  const moveTrack = useCallback((trackIndex: number, direction: 1 | -1) => {
    if (!project) return;
    const targetIndex = trackIndex + direction;
    if (targetIndex < 0 || targetIndex >= project.trackCount) return;
    beginEdit();
    setClips((previous) => previous.map((clip) => {
      if (clip.trackIndex === trackIndex) return { ...clip, trackIndex: targetIndex };
      if (clip.trackIndex === targetIndex) return { ...clip, trackIndex };
      return clip;
    }));
    setProject((previous) => {
      if (!previous) return previous;
      const nextSettings = normalizeTrackSettings(previous.trackSettings, previous.trackCount, t);
      const onlyDefaults = nextSettings.every((setting) => !setting.name || /^Ścieżka \d+$/.test(setting.name));
      [nextSettings[trackIndex], nextSettings[targetIndex]] = [nextSettings[targetIndex], nextSettings[trackIndex]];
      return { ...previous, trackSettings: onlyDefaults ? renumberDefaultTrackNames(nextSettings, t) : nextSettings };
    });
    setSelectedTrack(targetIndex);
    setDirty(true);
  }, [beginEdit, project]);

  const removeTrack = useCallback((trackIndex: number) => {
    if (!project || project.trackCount <= 1) return;
    beginEdit();
    setClips((prev) => prev.filter((clip) => clip.trackIndex !== trackIndex).map((clip) => (
      clip.trackIndex > trackIndex ? { ...clip, trackIndex: clip.trackIndex - 1 } : clip
    )));
    setProject((prev) => {
      if (!prev) return prev;
      const nextSettings = normalizeTrackSettings(prev.trackSettings, prev.trackCount, t);
      nextSettings.splice(trackIndex, 1);
      return { ...prev, trackCount: prev.trackCount - 1, trackSettings: renumberDefaultTrackNames(nextSettings, t) };
    });
    setSelectedTrack(Math.max(0, Math.min(trackIndex, project.trackCount - 2)));
    setDirty(true);
  }, [beginEdit, project]);

  const splitClipAt = useCallback(
    (frame: number) => {
      const contains = (c: StoredClip) => frame > c.offsetInTimeline && frame < c.offsetInTimeline + c.durationInFrames;
      const candidates = clipsRef.current.filter(contains);
      const clip =
        candidates.find((c) => c.trackIndex === selectedTrack) ??
        [...candidates].sort((a, b) => b.trackIndex - a.trackIndex)[0];
      if (!clip) return;
      if (isTrackLocked(clip.trackIndex)) return;
      const cutLength = frame - clip.offsetInTimeline;
      const left: StoredClip = {
        ...clip,
        id: makeId(),
        durationInFrames: cutLength,
        transitionDurationInFrames: Math.min(clip.transitionDurationInFrames ?? DEFAULT_TRANSITION_DURATION, cutLength),
      };
      const right: StoredClip = {
        ...clip,
        id: makeId(),
        startFrame: clip.startFrame + cutLength,
        offsetInTimeline: frame,
        durationInFrames: clip.durationInFrames - cutLength,
        transitionIn: 'none',
      };
      beginEdit();
      setClips((prev) => prev.flatMap((c) => (c.id === clip.id ? [left, right] : [c])));
      setSelectedClipId(right.id);
      setSelectedClipIds([right.id]);
      setDirty(true);
    },
    [beginEdit, isTrackLocked, selectedTrack],
  );

  const handleSplit = () => splitClipAt(currentFrame);

  const addMarker = useCallback(() => {
    setMarkers((prev) => {
      if (prev.some((marker) => marker.frame === currentFrame)) return prev;
      return [...prev, { id: makeId(), frame: currentFrame }].sort((a, b) => a.frame - b.frame);
    });
    setDirty(true);
  }, [currentFrame]);

  // --- Transitions ---
  const setTransitionType = useCallback(
    (clipId: string, type: TransitionType) => {
      const current = clipsRef.current.find((clip) => clip.id === clipId);
      if (!current || isTrackLocked(current.trackIndex)) return;
      beginEdit();
      setClips((prev) => {
        const clip = prev.find((c) => c.id === clipId);
        if (!clip) return prev;
        if (type === 'none') {
          const prevClip = previousClip(prev, clip);
          const unsnap =
            prevClip &&
            clip.offsetInTimeline + clip.transitionDurationInFrames === prevClip.offsetInTimeline + prevClip.durationInFrames;
          return prev.map((c) =>
            c.id === clipId
              ? {
                  ...c,
                  transitionIn: 'none' as const,
                  offsetInTimeline: unsnap ? prevClip.offsetInTimeline + prevClip.durationInFrames : c.offsetInTimeline,
                }
              : c,
          );
        }
        return snapTransition(prev, clipId, type, clip.transitionDurationInFrames);
      });
      setDirty(true);
    },
    [beginEdit, isTrackLocked],
  );

  const applyTransitionResize = useCallback((clipId: string, td: number) => {
    const current = clipsRef.current.find((clip) => clip.id === clipId);
    if (!current || isTrackLocked(current.trackIndex)) return;
    setClips((prev) => {
      const clip = prev.find((c) => c.id === clipId);
      if (!clip || clip.transitionIn === 'none') return prev;
      const prevClip = previousClip(prev, clip);
      const snapped =
        prevClip &&
        clip.offsetInTimeline + clip.transitionDurationInFrames === prevClip.offsetInTimeline + prevClip.durationInFrames;
      return prev.map((c) =>
        c.id === clipId
          ? {
              ...c,
              transitionDurationInFrames: td,
              offsetInTimeline: snapped ? prevClip.offsetInTimeline + prevClip.durationInFrames - td : c.offsetInTimeline,
            }
          : c,
      );
    });
  }, [isTrackLocked]);

  const handleTransitionDrop = useCallback((fromId: string, frame: number) => {
    const current = clipsRef.current.find((clip) => clip.id === fromId);
    if (!current || isTrackLocked(current.trackIndex)) return;
    setClips((prev) => {
      const from = prev.find((c) => c.id === fromId);
      if (!from || from.transitionIn === 'none') return prev;
      const target = findJunctionAt(prev, frame, fromId, 15);
      if (!target) return prev;
      const type = from.transitionIn;
      const td = from.transitionDurationInFrames;
      let next = prev.map((c) => {
        if (c.id !== fromId) return c;
        const prevClip = previousClip(prev, c);
        const unsnap =
          prevClip &&
          c.offsetInTimeline + c.transitionDurationInFrames === prevClip.offsetInTimeline + prevClip.durationInFrames;
        return {
          ...c,
          transitionIn: 'none' as const,
          offsetInTimeline: unsnap ? prevClip.offsetInTimeline + prevClip.durationInFrames : c.offsetInTimeline,
        };
      });
      next = snapTransition(next, target.id, type, td);
      return next;
    });
    setDirty(true);
  }, [isTrackLocked]);

  const handleQuickTransition = useCallback(() => {
    const trackClips = clips
      .filter((clip) => clip.trackIndex === selectedTrack)
      .sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
    const candidate = trackClips
      .slice(0, -1)
      .map((previous, index) => ({
        previous,
        next: trackClips[index + 1],
        junction: previous.offsetInTimeline + previous.durationInFrames,
      }))
      .filter(
        ({ previous, next, junction }) =>
          (currentFrame >= previous.offsetInTimeline && currentFrame <= next.offsetInTimeline + next.durationInFrames) ||
          Math.abs(currentFrame - junction) <= MAX_TRANSITION_DURATION,
      )
      .sort((a, b) => Math.abs(a.junction - currentFrame) - Math.abs(b.junction - currentFrame))[0];
    const transitionClip = candidate?.next;
    if (!transitionClip) return;
    const current = transitionClip.transitionIn;
    const types = TRANSITION_TYPES.map((t) => t.type);
    const nextType = types[(types.indexOf(current) + 1) % types.length];
    setTransitionType(transitionClip.id, nextType);
  }, [clips, currentFrame, selectedTrack, setTransitionType]);

  const showContextMenu = useCallback((event: React.MouseEvent, menu: ContextMenuTarget) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ ...menu, x: event.clientX, y: event.clientY });
  }, []);

  const clipContextMenu = contextMenu?.kind === 'clip' ? contextMenu : null;
  const assetContextMenu = contextMenu?.kind === 'asset' ? contextMenu : null;
  const trackContextMenu = contextMenu?.kind === 'track' ? contextMenu : null;
  const emptyContextMenu = contextMenu?.kind === 'empty' ? contextMenu : null;
  const transitionContextMenu = contextMenu?.kind === 'transition' ? contextMenu : null;

  const insertTransitionForClip = useCallback((clipId: string) => {
    const clip = clips.find((item) => item.id === clipId);
    if (!clip) return;
    const target = previousClip(clips, clip)
      ? clip
      : clips
        .filter((item) => item.trackIndex === clip.trackIndex && item.offsetInTimeline > clip.offsetInTimeline)
        .sort((a, b) => a.offsetInTimeline - b.offsetInTimeline)[0];
    if (!target || !previousClip(clips, target)) return;
    const types = TRANSITION_TYPES.map((item) => item.type);
    const nextType = types[(types.indexOf(target.transitionIn) + 1) % types.length];
    setTransitionType(target.id, nextType);
  }, [clips, setTransitionType]);

  const groupSelectedClips = useCallback(() => {
    if (selectedClipIds.length < 2) return;
    const groupId = makeId();
    beginEdit();
    setClips((prev) => prev.map((clip) => selectedClipIds.includes(clip.id) ? { ...clip, groupId } : clip));
    setDirty(true);
  }, [beginEdit, selectedClipIds]);

  const ungroupSelectedClips = useCallback(() => {
    const groupIds = new Set(clips.filter((clip) => selectedClipIds.includes(clip.id)).map((clip) => clip.groupId).filter(Boolean));
    if (groupIds.size === 0) return;
    beginEdit();
    setClips((prev) => prev.map((clip) => clip.groupId && groupIds.has(clip.groupId) ? { ...clip, groupId: undefined } : clip));
    setDirty(true);
  }, [beginEdit, clips, selectedClipIds]);

  const buildJoinChain = (clipList: StoredClip[], ids: string[]): StoredClip[] | null => {
    if (ids.length < 2) return null;
    const selected = ids
      .map((id) => clipList.find((c) => c.id === id))
      .filter((c): c is StoredClip => Boolean(c));
    if (selected.length !== ids.length) return null;
    const sorted = [...selected].sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
    const first = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (cur.trackIndex !== first.trackIndex) return null;
      if (cur.sourceId !== first.sourceId) return null;
      if (cur.offsetInTimeline !== prev.offsetInTimeline + prev.durationInFrames) return null;
      if (cur.startFrame !== prev.startFrame + prev.durationInFrames) return null;
    }
    return sorted;
  };

  const joinSelectedClips = useCallback(() => {
    const chain = buildJoinChain(clipsRef.current, selectedClipIds);
    if (!chain) return;
    const first = chain[0];
    const last = chain[chain.length - 1];
    // Reconstruct the exact original clip: duration is the sum of all parts, and the
    // transition duration is taken from the last part (which keeps the pre-split, uncapped
    // value) so the rejoined clip looks identical to before the cut.
    const merged: StoredClip = {
      ...first,
      durationInFrames: chain.reduce((sum, c) => sum + c.durationInFrames, 0),
      transitionDurationInFrames: last.transitionDurationInFrames,
    };
    beginEdit();
    const chainIds = new Set(chain.map((c) => c.id));
    setClips((prev) => prev.flatMap((c) => (c.id === first.id ? [merged] : chainIds.has(c.id) ? [] : [c])));
    setSelectedClipId(merged.id);
    setSelectedClipIds([merged.id]);
    setDirty(true);
  }, [beginEdit, selectedClipIds]);

  const canJoinSelectedClips = useMemo(() => buildJoinChain(clips, selectedClipIds) !== null, [clips, selectedClipIds]);

  // --- Media / biblioteka ---
  const addAsset = useCallback(async (file: File): Promise<string> => {
    const sourceId = makeId();
    const probeUrl = URL.createObjectURL(file);
    const durationInFrames = await loadVideoDurationInFrames(probeUrl, FPS);
    URL.revokeObjectURL(probeUrl);
    const thumbnails = file.type.startsWith('image/') ? [] : await createVideoThumbnails(file);
    setAssets((prev) => [...prev, { sourceId, name: file.name, durationInFrames, blob: file, thumbnails }]);
    setDirty(true);
    return sourceId;
  }, [FPS]);

  const importFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setMediaImport({ total: files.length, done: 0, name: files[0]?.name ?? '' });
      for (let index = 0; index < files.length; index += 1) {
        setMediaImport({ total: files.length, done: index, name: files[index]?.name ?? '' });
        // eslint-disable-next-line no-await-in-loop
        await addAsset(files[index]);
      }
      setMediaImport({ total: files.length, done: files.length, name: '' });
      window.setTimeout(() => setMediaImport(null), 700);
    },
    [addAsset],
  );

  const handleFilesSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = '';
      await importFiles(files);
    },
    [importFiles],
  );

  const handleFilesDropped = useCallback(
    (files: File[]) => {
      void importFiles(files);
    },
    [importFiles],
  );

  const createClipFromAsset = useCallback(
    (sourceId: string, trackIndex: number, offsetInTimeline: number) => {
      if (isTrackLocked(trackIndex)) return;
      const asset = assets.find((a) => a.sourceId === sourceId);
      if (!asset) return;
      const DEFAULT_CLIP_DURATION_FRAMES = FPS * 5;
       const isImage = asset.blob.type.startsWith('image/');
       const isAudio = asset.blob.type.startsWith('audio/');
        const clip: StoredClip = {
          id: makeId(),
          type: isImage ? 'image' : isAudio ? 'audio' : 'video',
        sourceId,
        trackIndex,
        offsetInTimeline: Math.max(0, offsetInTimeline),
        startFrame: 0,
        durationInFrames: isImage
          ? DEFAULT_CLIP_DURATION_FRAMES
          : asset.durationInFrames > 0
            ? asset.durationInFrames
            : DEFAULT_CLIP_DURATION_FRAMES,
        scale: 1,
        posX: 0,
        posY: 0,
        width: 100,
        height: 100,
        transitionIn: 'none',
        transitionDurationInFrames: DEFAULT_TRANSITION_DURATION,
      };
      beginEdit();
      setClips((prev) => splitOverlapsForClip(prev, clip));
      setSelectedClipId(clip.id);
      setSelectedTrack(trackIndex);
      setDirty(true);
    },
    [assets, beginEdit, isTrackLocked, FPS],
  );

  const handleMediaDrop = useCallback(
    (sourceId: string, trackIndex: number, frame: number) => {
      createClipFromAsset(sourceId, trackIndex, frame);
    },
    [createClipFromAsset],
  );

  const handlePlaceAsset = useCallback(
    (sourceId: string) => {
      createClipFromAsset(sourceId, selectedTrack, currentFrame);
    },
    [createClipFromAsset, selectedTrack, currentFrame],
  );

  const addTextLayer = useCallback(() => {
    if (!project) return;
    let trackIndex = Array.from({ length: project.trackCount }, (_, index) => index)
      .filter((index) => index > selectedTrack)
      .find((index) => !isTrackLocked(index) && !clips.some((clip) => clip.trackIndex === index && currentFrame >= clip.offsetInTimeline && currentFrame < clip.offsetInTimeline + clip.durationInFrames));
    if (trackIndex === undefined) {
      if (project.trackCount >= getMaxTracks()) return;
      trackIndex = project.trackCount;
      setProject((previous) => previous ? { ...previous, trackCount: previous.trackCount + 1, trackSettings: [...previous.trackSettings, { name: t('timeline.track', { index: String(previous.trackCount + 1) }), locked: false, muted: false, hidden: false }] } : previous);
    }
    if (isTrackLocked(trackIndex)) return;
    const clip: StoredClip = {
      id: makeId(), type: 'text', sourceId: makeId(), trackIndex, offsetInTimeline: currentFrame,
      startFrame: 0, durationInFrames: FPS * 5, scale: 1, posX: 0, posY: 0, width: 80, height: 16,
      text: 'Tekst standardowy', fontSize: 64, fontWeight: 600, textColor: '#ffffff', textAlign: 'center',
      transitionIn: 'none', transitionDurationInFrames: DEFAULT_TRANSITION_DURATION,
    };
    beginEdit();
    setClips((previous) => [...previous, clip]);
    setSelectedTrack(trackIndex);
    setSelectedClipId(clip.id);
    setSelectedClipIds([clip.id]);
    setShowTransformOverlay(true);
    setDirty(true);
  }, [FPS, beginEdit, clips, currentFrame, isTrackLocked, project, selectedTrack]);

  // --- Klawiatura ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTextField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
       const isRangeField = target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range';
       if (e.key === ' ' && isTextField && !isRangeField) return;
      if (e.key === ' ') {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.();
        playerRef.current?.toggle();
        return;
      }
      if (isTextField) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        const trackClipsList = clips
          .filter((c) => c.trackIndex === selectedTrack)
          .sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
        const junctions = trackClipsList
          .slice(0, -1)
          .map((c) => c.offsetInTimeline + c.durationInFrames);
        const prev = [...junctions, -1].reverse().find((j) => j < currentFrame);
        if (prev !== undefined && prev >= 0) seekTo(prev);
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        const trackClipsList = clips
          .filter((c) => c.trackIndex === selectedTrack)
          .sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
        const junctions = trackClipsList
          .slice(0, -1)
          .map((c) => c.offsetInTimeline + c.durationInFrames);
        const next = junctions.find((j) => j > currentFrame);
        if (next !== undefined) seekTo(next);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekTo(currentFrame - (e.shiftKey ? 10 : 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekTo(currentFrame + (e.shiftKey ? 10 : 1));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (selectedClipId) handleDeleteClip(selectedClipId);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        splitClipAt(currentFrame);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        addMarker();
      } else if (!mod && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        handleQuickTransition();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [currentFrame, totalFrames, selectedClipId, selectedTrack, clips, seekTo, undo, redo, handleDeleteClip, splitClipAt, addMarker, handleQuickTransition]);

  // --- Persistence ---
  const saveProject = useCallback(async () => {
    if (!project) return;
    const stored: StoredProject = {
      id: project.id,
      name: project.name,
      savedAt: Date.now(),
      config: project.config,
      clips,
      assets: assets.map((a) => ({ sourceId: a.sourceId, name: a.name, durationInFrames: a.durationInFrames })),
      trackCount: project.trackCount,
      markers,
      trackSettings: project.trackSettings,
    };
    try {
      await Promise.all(assets.map((asset) => putMedia(project.id, asset.sourceId, asset.blob)));
      upsertProject(stored);
      setDirty(false);
    } catch (err) {
      showAlert(t('ctx.saveError'), t('ctx.saveErrorMessage') + String(err));
    }
  }, [project, clips, assets, markers]);

  const saveProjectRef = useRef(saveProject);
  saveProjectRef.current = saveProject;

  useEffect(() => {
    const minutes = settings.autoSaveIntervalMinutes;
    if (!minutes || minutes <= 0) return;
    const interval = setInterval(() => {
      saveProjectRef.current();
    }, minutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.autoSaveIntervalMinutes]);

  const openProject = useCallback(
    async (stored: StoredProject, remoteId?: string) => {
      revokeMedia();
      setLoading({ progress: 0, label: t('import.opening') });
      try {
        const sourceIds = [...new Set<string>([
          ...(stored.assets ?? []).map((a) => a.sourceId),
          ...stored.clips.map((c) => c.sourceId),
        ])];
        let completed = 0;
        const loaded = (await Promise.all(sourceIds.map(async (sourceId): Promise<MediaAsset | null> => {
          const blob = await getMedia(stored.id, sourceId);
          if (!blob) {
            completed += 1;
            setLoading({ progress: completed / Math.max(1, sourceIds.length), label: t('import.storing') });
            return null;
          }
          const meta = (stored.assets ?? []).find((a) => a.sourceId === sourceId);
          const thumbnails = await createVideoThumbnails(blob);
          completed += 1;
          setLoading({ progress: completed / Math.max(1, sourceIds.length), label: t('import.storing') });
          return {
            sourceId,
            name: meta?.name ?? t('media.videoDefault'),
            durationInFrames: meta?.durationInFrames ?? Math.round(DEFAULT_DURATION_SECONDS * normalizeFps(stored.config.fps)),
            blob,
            thumbnails,
          } satisfies MediaAsset;
        }))).filter((asset): asset is MediaAsset => asset !== null);
        setAssets(loaded);
        setClips(stored.clips.map(normalizeClip));
        setMarkers(stored.markers ?? []);
        juicerSnapshotRef.current = null;
        setProject({
          id: stored.id,
          name: stored.name,
           config: { ...stored.config, fps: normalizeFps(stored.config.fps) },
          trackCount: stored.trackCount ?? DEFAULT_TRACKS,
          trackSettings: normalizeTrackSettings(stored.trackSettings, stored.trackCount ?? DEFAULT_TRACKS, t),
        });
        setProjectSource(remoteId ? 'remote' : 'local');
        setRemoteProjectId(remoteId ?? null);
        setSelectedTrack(0);
        setCurrentFrame(0);
        setSelectedClipId(null);
        setSelectedClipIds([]);
        setDirty(false);
        resetHistory();
        setModal(null);
      } finally {
        setLoading(null);
      }
    },
    [revokeMedia, resetHistory],
  );

  const createProject = (name: string, config: ProjectConfig) => {
    revokeMedia();
    setAssets([]);
    setClips([]);
    setMarkers([]);
    setCurrentFrame(0);
    setSelectedClipId(null);
    setSelectedClipIds([]);
    setSelectedTrack(0);
    setProject({ id: makeId(), name, config: { ...config, fps: normalizeFps(config.fps) }, trackCount: DEFAULT_TRACKS, trackSettings: defaultTrackSettings(DEFAULT_TRACKS, t) });
    setProjectSource('local');
    setRemoteProjectId(null);
    setDirty(false);
    resetHistory();
    setModal(null);
  };

  const goToStart = async () => {
    if (dirty && !await showConfirm({ title: t('ctx.unsavedChanges'), message: t('ctx.unsavedChangesMessage'), confirmLabel: t('common.yes'), cancelLabel: t('common.no') })) return;
    setModal('start');
  };

  const closeProject = async () => {
    if (dirty && !await showConfirm({ title: t('ctx.unsavedChanges'), message: t('ctx.unsavedChangesMessage'), confirmLabel: t('common.yes'), cancelLabel: t('common.no') })) return;
    revokeMedia();
    setAssets([]);
    setClips([]);
    setMarkers([]);
    setCurrentFrame(0);
    setSelectedClipId(null);
    setSelectedClipIds([]);
    setSelectedTrack(0);
    setProject(null);
    setProjectSource('local');
    setRemoteProjectId(null);
    setDirty(false);
    resetHistory();
    setModal('start');
  };

  const removeProject = async (stored: StoredProject) => {
    if (!await showConfirm({ title: t('ctx.deleteProject'), message: t('ctx.deleteProjectConfirm', { name: stored.name }), confirmLabel: t('ctx.delete'), cancelLabel: t('ctx.cancel'), danger: true })) return;
    deleteProject(stored.id);
    await deleteProjectMedia(stored.id).catch(() => undefined);
    if (project?.id === stored.id) {
      revokeMedia();
      setAssets([]);
      setClips([]);
      setProject(null);
      setDirty(false);
      setModal('start');
    }
  };

  const handleExportFilm = () => {
    setModal('export-film');
  };

  const buildStoredProject = (): StoredProject | null => {
    if (!project) return null;
    return {
      id: project.id,
      name: project.name,
      savedAt: Date.now(),
      config: project.config,
        clips,
      assets: assets.map((a) => ({ sourceId: a.sourceId, name: a.name, durationInFrames: a.durationInFrames })),
      trackCount: project.trackCount,
      markers,
      trackSettings: project.trackSettings,
    };
  };

  const handleExportProject = () => {
    setModal('export-project');
  };

  const exportProject = async (includeAssets: boolean) => {
    const stored = buildStoredProject();
    if (!stored) return;
    const media = includeAssets ? Object.fromEntries(assets.map((a) => [a.sourceId, a.blob])) : {};
    try {
      await exportProjectFile(stored, media);
      setModal(null);
    } catch (err) {
      showAlert(t('ctx.exportError'), t('ctx.exportErrorMessage') + String(err));
    }
  };

  const exportProjectToServer = async () => {
    const stored = buildStoredProject();
    const serverUrl = spaceRenderServers[0]?.url;
    if (!stored || !serverUrl) return;
    try {
      await exportProjectToRenderServer(stored, Object.fromEntries(assets.map((asset) => [asset.sourceId, asset.blob])), serverUrl, projectSource === 'remote' ? remoteProjectId ?? undefined : undefined);
      setToast(t('ctx.savedToServer'));
      window.setTimeout(() => setToast(null), 3500);
      setModal(null);
    } catch (err) {
      showAlert(t('ctx.serverSaveError'), t('ctx.serverSaveErrorMessage') + String(err));
    }
  };

  const copyRemoteProjectToLocal = async () => {
    if (!project) return;
    await saveProject();
    setProjectSource('local');
    setRemoteProjectId(null);
    setModal(null);
  };

  const openRemoteProject = async (summary: RemoteProjectSummary) => {
    const serverUrl = spaceRenderServers[0]?.url;
    if (!serverUrl) return;
    setLoading({ progress: 0, label: t('import.storing') });
    try {
      const remote = await loadRemoteProject(summary.id, serverUrl);
      await Promise.all(Object.entries(remote.media).map(([sourceId, blob]) => putMedia(remote.project.id, sourceId, blob)));
      upsertProject(remote.project);
      await openProject(remote.project, summary.id);
    } catch (err) {
      showAlert('Błąd wczytywania', 'Błąd wczytywania projektu z serwera: ' + String(err));
      setLoading(null);
    }
  };

  const exportRenderedFilm = async (name: string, format: VideoExportFormat, startFrame: number, endFrame: number, serverUrl: string, onProgress: (p: number) => void, signal: AbortSignal): Promise<void> => {
    if (!project) return;
    const preset = getPreset(project.config.resolutionLabel, project.config.orientation);

    // Detect true durations of each asset before export (metadata is unreliable).
    const exportAssets = assets.map((asset) => ({ sourceId: asset.sourceId, blob: asset.blob }));
    const correctedDurations = await correctAssetDurationsBeforeExport(exportAssets, FPS, signal);

    // Map corrected durations onto the assets used for content-frame calculation.
    const correctedAssets = assets.map((asset) => ({
      ...asset,
      durationInFrames: correctedDurations.get(asset.sourceId) ?? asset.durationInFrames,
    }));

    // Recalculate content end using corrected asset durations.
    let correctedContentFrames = 0;
    for (const clip of clips) {
      const track = project?.trackSettings?.[clip.trackIndex];
      if (track?.hidden) continue;
      const asset = correctedAssets.find((a) => a.sourceId === clip.sourceId);
      const assetDuration = asset?.durationInFrames ?? clip.durationInFrames;
      const clipEnd = clip.offsetInTimeline + Math.min(clip.durationInFrames, assetDuration);
      correctedContentFrames = Math.max(correctedContentFrames, clipEnd);
    }
    correctedContentFrames = Math.max(correctedContentFrames, 1);

    // Render exactly to the requested range, capped by corrected content length.
    const finalStart = Math.min(Math.max(1, startFrame), correctedContentFrames);
    const finalEndFrame = Math.min(Math.max(finalStart, endFrame), correctedContentFrames);

    console.log(
      `[exportRenderedFilm] total=${totalFrames} content(corrected)=${correctedContentFrames} range=${finalStart}..${finalEndFrame}`,
    );

    const blob = await exportVideo({
      clips,
      assets: exportAssets,
      trackSettings: project.trackSettings,
      width: preset.width,
      height: preset.height,
      fps: FPS,
      durationInFrames: correctedContentFrames,
      renderEndFrame: finalEndFrame,
      startFrame: finalStart,
      format,
      onProgress,
      signal,
      serverUrl,
      normalize: isMobileDevice,
    });
    const isCutted = finalStart > 1 || finalEndFrame < totalFrames;
    const finalName = `${name.trim() || `render-${serializeName(project.name)}`}${isCutted ? '_cutted' : ''}`;

    // Store the export so it can be re-downloaded later from the recent-exports list.
    const recentExport: RecentExport = {
      id: generateId(),
      name: finalName,
      format,
      blob,
      createdAt: Date.now(),
      size: blob.size,
    };
    try {
      await addRecentExport(recentExport);
      setRecentExports((previous) => [recentExport, ...previous].slice(0, 30));
    } catch {
      // Non-fatal: the export itself already succeeded.
    }

    // Auto-download immediately (kept so accidental dialog dismissal doesn't lose the file).
    downloadVideoBlob(blob, finalName, format);
    setToast('Export na serwer zakończony');
    window.setTimeout(() => setToast(null), 3500);
    setExportReady({ id: recentExport.id, blob, name: finalName, format });
    setModal(null);
  };

  const dismissExportReady = useCallback(() => setExportReady(null), []);

  const handleJuicerApply = useCallback(async (snapshot: JuicerSnapshot) => {
    const prevState: JuicerSnapshot = {
      clips: [...clipsRef.current],
      trackCount: project?.trackCount ?? DEFAULT_TRACKS,
      trackSettings: [...trackSettings],
      timestamp: Date.now(),
      description: t('ctx.beforeJuicer'),
    };
    juicerSnapshotRef.current = prevState;
    beginEdit();
    setClips(snapshot.clips);
    const tc = Math.max(1, snapshot.trackCount);
    const ts = snapshot.trackSettings.length > 0 ? snapshot.trackSettings : [{ name: t('timeline.track', { index: '1' }), locked: false, muted: false, hidden: false }];
    setProject((prev) => prev ? { ...prev, trackCount: tc, trackSettings: ts } : prev);
    if (snapshot.newAssets && snapshot.newAssets.length > 0) {
      const withThumbnails = await Promise.all(snapshot.newAssets.map(async (a) => ({
        sourceId: a.sourceId,
        name: a.name,
        durationInFrames: a.durationInFrames,
        blob: a.blob,
        thumbnails: a.blob.type.startsWith('video/') ? await createVideoThumbnails(a.blob) : [],
      })));
      setAssets((prev) => {
        const existing = new Set(prev.map((a) => a.sourceId));
        const fresh = withThumbnails.filter((a) => !existing.has(a.sourceId));
        if (fresh.length === 0) return prev;
        return [...prev, ...fresh];
      });
    }
    setDirty(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beginEdit]);

  const handleJuicerUndo = useCallback(() => {
    const snapshot = juicerSnapshotRef.current;
    if (!snapshot) return;
    setClips(snapshot.clips);
    setProject((prev) => prev ? { ...prev, trackCount: snapshot.trackCount, trackSettings: snapshot.trackSettings } : prev);
    if (snapshot.newAssets && snapshot.newAssets.length > 0) {
      const newIds = new Set(snapshot.newAssets.map((a) => a.sourceId));
      setAssets((prev) => prev.filter((a) => !newIds.has(a.sourceId)));
    }
    juicerSnapshotRef.current = null;
    setDirty(true);
  }, []);

  const downloadRecentExport = useCallback((exp: RecentExport) => {
    downloadVideoBlob(exp.blob, exp.name, exp.format);
    if (exp.downloaded) return;
    const updated: RecentExport = { ...exp, downloaded: true };
    setRecentExports((previous) => previous.map((e) => (e.id === exp.id ? updated : e)));
    updateRecentExport(updated).catch(() => {});
  }, []);

  const removeRecentExport = useCallback((id: string) => {
    setRecentExports((previous) => previous.filter((exp) => exp.id !== id));
    deleteRecentExport(id).catch(() => {});
  }, []);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading({ progress: 0, label: t('import.reading') });
      const { project: imported, media } = await readProjectFile(file);
      const existing = new Set(listProjects().map((p) => p.name));
      let name = imported.name;
      let n = 1;
      while (existing.has(name)) {
        name = `${imported.name} (${n++})`;
      }
      imported.name = name;

      const entries = Object.entries(media);
      let stored = 0;
      setLoading({ progress: 0.1, label: t('import.storing') });
      await Promise.all(entries.map(async ([sourceId, blob]) => {
        await putMedia(imported.id, sourceId, blob);
        stored++;
        setLoading({ progress: 0.1 + (stored / Math.max(1, entries.length)) * 0.5, label: t('import.storing') });
      }));
      setLoading({ progress: 0.7, label: t('import.opening') });
      upsertProject(imported);
      await openProject(imported);
    } catch (err) {
      setLoading(null);
      showAlert(t('ctx.importError'), t('ctx.importErrorMessage') + String(err));
    }
    e.target.value = '';
  };

  const handleSaveSettings = (name: string, config: ProjectConfig) => {
    if (project) {
      const nextFps = normalizeFps(config.fps);
      const previousFps = normalizeFps(project.config.fps);
      const fpsRatio = nextFps / previousFps;
      const fpsChanged = Math.abs(fpsRatio - 1) > 0.000001;
      const nextConfig = { ...config, fps: nextFps };
      const changed =
        name !== project.name ||
        config.resolutionLabel !== project.config.resolutionLabel ||
        config.orientation !== project.config.orientation ||
        fpsChanged;
      if (fpsChanged) {
        setClips((previous) => previous.map((clip) => ({
          ...clip,
          offsetInTimeline: Math.max(0, Math.round(clip.offsetInTimeline * fpsRatio)),
          startFrame: Math.max(0, Math.round(clip.startFrame * fpsRatio)),
          durationInFrames: Math.max(1, Math.round(clip.durationInFrames * fpsRatio)),
          transitionDurationInFrames: Math.max(MIN_TRANSITION_DURATION, Math.min(MAX_TRANSITION_DURATION, Math.round(clip.transitionDurationInFrames * fpsRatio))),
        })));
        setAssets((previous) => previous.map((asset) => ({
          ...asset,
          durationInFrames: Math.max(1, Math.round(asset.durationInFrames * fpsRatio)),
        })));
        setMarkers((previous) => previous.map((marker) => ({ ...marker, frame: Math.max(0, Math.round(marker.frame * fpsRatio)) })));
        setCurrentFrame((frame) => Math.max(0, Math.round(frame * fpsRatio)));
      }
      setProject({ ...project, name, config: nextConfig });
      if (changed) setDirty(true);
    }
    setModal(null);
  };

  const handleSaveAppSettings = (autoSaveIntervalMinutes: number, language: AppLanguage, renderServers: RenderServer[], mobileRenderEnabled: boolean) => {
    const next: AppSettings = { autoSaveIntervalMinutes, language, renderServers, mobileRenderEnabled };
    setSettings(next);
    saveSettings(next);
    setLang(language);
    setModal(project ? null : 'start');
  };

  const handleAddTrack = () => {
    setProject((prev) => {
      if (!prev || prev.trackCount >= getMaxTracks()) return prev;
      return {
        ...prev,
        trackCount: prev.trackCount + 1,
        trackSettings: renumberDefaultTrackNames([...prev.trackSettings, ...defaultTrackSettings(1, t)], t),
      };
    });
    setDirty(true);
  };

  const toggleTrackSetting = useCallback((trackIndex: number, key: keyof TrackSettings) => {
    setProject((prev) => {
      if (!prev || trackIndex < 0 || trackIndex >= prev.trackCount) return prev;
      const nextSettings = normalizeTrackSettings(prev.trackSettings, prev.trackCount, t);
      nextSettings[trackIndex] = { ...nextSettings[trackIndex], [key]: !nextSettings[trackIndex][key] };
      return { ...prev, trackSettings: nextSettings };
    });
    setDirty(true);
  }, []);

  const renameTrack = useCallback((trackIndex: number, name: string) => {
    setProject((prev) => {
      if (!prev || trackIndex < 0 || trackIndex >= prev.trackCount) return prev;
      const nextSettings = normalizeTrackSettings(prev.trackSettings, prev.trackCount, t);
      nextSettings[trackIndex] = { ...nextSettings[trackIndex], name };
      return { ...prev, trackSettings: nextSettings };
    });
    setDirty(true);
  }, []);

  if (!appReady) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#111214] text-gray-200">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
            <Clapperboard size={24} className="text-white" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight text-white">Re<span className="text-blue-500">Videeo</span></span>
        </div>
        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-[#2a2b30]">
          <div className="h-full w-1/3 rounded-full bg-blue-500" style={{ animation: 'revideeo-loading 1s ease-in-out infinite' }} />
        </div>
        <span className="mt-3 text-xs text-gray-500">{t('app.loading')}</span>
      </div>
    );
  }

    return (
      <div
      className="h-screen w-screen bg-[#111214] text-gray-200 flex flex-col font-sans overflow-hidden select-none"
      onContextMenu={(event) => event.preventDefault()}
            >
      {toast && <div className="fixed inset-x-0 top-3 z-[100] flex justify-center px-4"><div className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl"><CheckCircle2 size={16} />{toast}</div></div>}
      <AlertModalProvider />
      <ConfirmModal />
      <input
        ref={importFileRef}
        type="file"
        accept=".reevproj,application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      {!isChromium && (
        <div className="relative z-[70] flex items-center justify-center gap-2 border-b border-amber-600/40 bg-amber-500/15 px-3 py-2 text-[11px] font-semibold text-amber-200">
          <span className="text-amber-400">⚠</span>
          <span>{t('app.browserWarning')}</span>
        </div>
      )}

      {updateVersion && (
        <UpdateModal version={updateVersion} onDismiss={() => setUpdateVersion(null)} />
      )}

      {isMobileDevice && project && (
        <div className="fixed inset-0 z-40">
          <MobileEditorShell
            ref={mobileShellRef}
            projectName={project.name}
            dirty={dirty}
            fps={FPS}
            currentFrame={currentFrame}
            totalFrames={totalFrames}
            isPlaying={isPlaying}
            onOpenProject={goToStart}
             saveLabel={projectSource === 'remote' ? t('header.saveToServer') : t('header.save')}
             onSave={() => void (projectSource === 'remote' ? exportProjectToServer() : saveProject())}
            onImport={() => importFileRef.current?.click()}
            onJuicer={() => setModal('juicer')}
            onExtensions={() => setModal('plugins')}
            floatingButtons={pluginSnapshot.floatingButtons.map((b) => ({ id: b.id, label: b.label, icon: <span className="text-xs font-bold">{b.icon}</span>, onClick: b.onClick }))}
            bottomBarActions={pluginSnapshot.bottomBar.map((b) => ({ id: b.id, label: b.label, icon: <span className="text-sm font-bold">{b.icon}</span>, onClick: b.onClick }))}
            onExportFilm={handleExportFilm}
            onExportProject={handleExportProject}
            onOpenSettings={() => setModal('settings')}
            onTogglePlay={() => playerRef.current?.toggle()}
            onSeek={seekTo}
            onSplit={handleSplit}
             onAddMedia={() => mobileShellRef.current?.openSheet({ kind: 'media' })}
             onAddText={addTextLayer}
             tracks={<MobileTracksPanel trackSettings={trackSettings} selectedTrack={selectedTrack} onSelectTrack={setSelectedTrack} onToggle={toggleTrackSetting} onRename={renameTrack} />}
             onUndo={undo}
             onRedo={redo}
             canUndo={canUndo}
             canRedo={canRedo}
            recentExports={recentExports}
            onDownloadRecent={downloadRecentExport}
            onDeleteRecent={removeRecentExport}
             preview={<div className="flex h-full items-center justify-center bg-black p-3"><div className={`relative overflow-hidden rounded-lg border border-[#2c2d33] bg-black ${project.config.orientation === '9:16' ? 'aspect-[9/16] h-full max-w-full' : 'aspect-video w-full'}`}><NativePlayer ref={playerRef} clips={clipsForPlayer} trackSettings={trackSettings} compositionWidth={getPreset(project.config.resolutionLabel, project.config.orientation).width} compositionHeight={getPreset(project.config.resolutionLabel, project.config.orientation).height} durationInFrames={totalFrames} fps={FPS} currentFrame={currentFrame} onFrameChange={setCurrentFrame} onPlayStateChange={setIsPlaying} style={{ width: '100%', height: '100%' }} /><PreviewTransformOverlay clip={showTransformOverlay ? activeClip : null}               trackName={trackSettings[activeClip?.trackIndex ?? 0]?.name ?? t('timeline.track', { index: '1' })}
              compositionWidth={getPreset(project.config.resolutionLabel, project.config.orientation).width}
              compositionHeight={getPreset(project.config.resolutionLabel, project.config.orientation).height} onBeginEdit={beginEdit} onUpdate={(patch) => activeClip && applyClipDrag(activeClip.id, patch)} /></div></div>}
             media={<MediaPanelView mobile assets={assets} loading={mediaImport} selectedTrack={selectedTrack} trackCount={project.trackCount} onSelectTrack={setSelectedTrack} onFilesSelected={handleFilesSelected} onFilesDropped={handleFilesDropped} onPlaceAsset={handlePlaceAsset} onAddText={addTextLayer} onContextMenuAsset={(event, sourceId) => showContextMenu(event, { kind: 'asset', sourceId })} />}
            renderTools={(view, onClose) => (
              <PropertiesPanelView
                mobile
                 activeClip={activeClip}
                 asset={activeAsset ? { name: activeAsset.name } : undefined}
                 clipIndex={activeClipIndex}
                 totalFrames={totalFrames}
                 fps={FPS}
                 onUpdateClip={updateClip}
                 onSetPreset={applyClipPreset}
                 onDeselectPreview={() => setShowTransformOverlay(false)}
                onSetTransitionType={setTransitionType}
                onSetTransitionDuration={applyTransitionResize}
                onDeleteClip={handleDeleteClip}
                isOpen
                onClose={onClose}
                view={view}
                onOpenProperties={() => mobileShellRef.current?.openSheet({ kind: 'tools', view: 'properties' })}
                onOpenTransitions={() => mobileShellRef.current?.openSheet({ kind: 'tools', view: 'transitions' })}
                onOpenAudio={() => mobileShellRef.current?.openSheet({ kind: 'tools', view: 'audio' })}
                onOpenAnimations={() => mobileShellRef.current?.openSheet({ kind: 'tools', view: 'animations' })}
                onOpenPlugins={() => mobileShellRef.current?.openSheet({ kind: 'tools', view: 'plugins' })}
                onOpenPluginsModal={() => setModal('plugins')}
                pluginContent={view === 'plugins' && pluginSnapshot.tools.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {pluginSnapshot.tools.map((tool) => (
                      <div key={tool.id} className="border-b border-[#303136] pb-3">
                        {tool.render({ activeClip, clipIndex: activeClipIndex, totalFrames, fps: FPS, asset: activeAsset ? { name: activeAsset.name } : undefined, onUpdateClip: (id, patch) => updateClip(id, patch), onClose })}
                      </div>
                    ))}
                  </div>
                ) : undefined}
              />
            )}
            timeline={<TimelineView mobile clips={clips} totalFrames={totalFrames} currentFrame={currentFrame} fps={FPS} selectedTrack={selectedTrack} trackCount={project.trackCount} trackSettings={trackSettings} playerRef={playerRef} isPlaying={isPlaying} onSeek={seekTo} selectedClipIds={selectedClipIds} onSelectClip={selectClip} onSelectClips={selectClips} onSelectTrack={setSelectedTrack} markers={markers} assets={assets} onSplit={handleSplit} onQuickTransition={handleQuickTransition} onAddTrack={handleAddTrack} onBeginEdit={beginEdit} onUpdateClipFromDrag={applyClipDrag} onTransitionResize={applyTransitionResize} onTransitionDrop={handleTransitionDrop} onSelectTransition={(clipId, trackIndex) => { setSelectedClipId(clipId); setSelectedTrack(trackIndex); }} onToggleTrackSetting={toggleTrackSetting} onRenameTrack={renameTrack} onContextMenuClip={(event, clipId) => { if (!selectedClipIds.includes(clipId)) selectClip(clipId); showContextMenu(event, { kind: 'clip', clipId }); }} onContextMenuTrack={(event, trackIndex) => showContextMenu(event, { kind: 'track', trackIndex })} onContextMenuEmpty={(event, trackIndex) => showContextMenu(event, { kind: 'empty', trackIndex })} onClearSelection={() => { setSelectedClipId(null); setSelectedClipIds([]); }} onOpenProperties={() => mobileShellRef.current?.openSheet({ kind: 'tools', view: 'properties' })} onOpenTransitions={() => mobileShellRef.current?.openSheet({ kind: 'tools', view: 'transitions' })} onClipDragEnd={handleClipDragEnd} onMediaDrop={handleMediaDrop} />}
          />
        </div>
      )}

      {!isMobileDevice && (
      <>
      {!project && (
        <div className="fixed inset-x-0 top-0 z-[60] flex h-16 items-center justify-between border-b border-[#222429] bg-[#18191c] px-4">
          <button onClick={() => closeProject()} className="flex items-center gap-2.5 cursor-pointer"           title={t('ctx.closeProject')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Clapperboard size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Re<span className="text-blue-500">Videeo</span>
            </h1>
          </button>
        </div>
      )}

      {project && (
         <HeaderView
          project={project}
          preset={getPreset(project.config.resolutionLabel, project.config.orientation)}
          dirty={dirty}
           saveLabel={projectSource === 'remote' ? t('header.saveToServer') : t('header.save')}
           onSave={() => void (projectSource === 'remote' ? exportProjectToServer() : saveProject())}
           onExport={handleExportFilm}
           onExportProject={handleExportProject}
           onImport={() => importFileRef.current?.click()}
           onJuicer={() => setModal('juicer')}
           onNewProject={goToStart}
          onLogoClick={() => closeProject()}
            onOpenSettings={() => setModal('settings')}
            onShowShortcuts={() => setModal('shortcuts')}
           onUndo={undo}
           onRedo={redo}
           canUndo={canUndo}
           canRedo={canRedo}
           recentExports={recentExports}
           onDownloadRecent={downloadRecentExport}
           onDeleteRecent={removeRecentExport}
         />
      )}

      {}
      <div ref={editorMainRef} className="flex-1 flex overflow-hidden border-b border-[#222429]">
        <MediaPanelView
          assets={assets}
          selectedTrack={selectedTrack}
          width={mediaWidth}
          loading={mediaImport}
          onFilesSelected={handleFilesSelected}
          onFilesDropped={handleFilesDropped}
          onPlaceAsset={handlePlaceAsset}
          onAddText={addTextLayer}
          onContextMenuAsset={(event, sourceId) => showContextMenu(event, { kind: 'asset', sourceId })}
          pluginTabs={pluginSnapshot.tabs.filter((t) => t.position === 'media')}
        />

        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startMediaDrag}
          title={t('ctx.resizeMedia')}
          className="w-1.5 shrink-0 cursor-col-resize bg-[#2c2d33] transition-colors hover:bg-blue-500"
        />

        {}
        <div className="flex-1 bg-[#111214] flex items-center justify-center p-4 min-w-0">
            <div
            className={`relative bg-black rounded-md overflow-hidden shadow-2xl border border-[#2c2d33] ${
              project && project.config.orientation === '9:16'
                ? 'aspect-[9/16] h-full max-w-full'
                : 'aspect-video w-full max-h-full'
            }`}
            >
            <NativePlayer
              ref={playerRef}
              clips={clipsForPlayer}
              trackSettings={trackSettings}
              compositionWidth={project ? getPreset(project.config.resolutionLabel, project.config.orientation).width : 720}
              compositionHeight={project ? getPreset(project.config.resolutionLabel, project.config.orientation).height : 1280}
              durationInFrames={totalFrames}
              fps={FPS}
              currentFrame={currentFrame}
              onFrameChange={setCurrentFrame}
              onPlayStateChange={setIsPlaying}
              style={{ width: '100%', height: '100%' }}
            />
            <PreviewTransformOverlay
              clip={showTransformOverlay ? activeClip : null}
              trackName={trackSettings[activeClip?.trackIndex ?? 0]?.name ?? t('timeline.track', { index: '1' })}
              compositionWidth={project ? getPreset(project.config.resolutionLabel, project.config.orientation).width : 720}
              compositionHeight={project ? getPreset(project.config.resolutionLabel, project.config.orientation).height : 1280}
              onBeginEdit={beginEdit}
              onUpdate={(patch) => activeClip && applyClipDrag(activeClip.id, patch)}
            />
            {project && (
              <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 bg-black/70 rounded text-[10px] font-mono text-gray-300 pointer-events-none">
                {getPreset(project.config.resolutionLabel, project.config.orientation).label} ·{' '}
                {getPreset(project.config.resolutionLabel, project.config.orientation).width}×
                {getPreset(project.config.resolutionLabel, project.config.orientation).height}
              </div>
            )}
          </div>
        </div>

        <PropertiesPanelView
           activeClip={activeClip}
           asset={activeAsset ? { name: activeAsset.name } : undefined}
           clipIndex={activeClipIndex}
           totalFrames={totalFrames}
           fps={FPS}
           onUpdateClip={updateClip}
           onSetPreset={applyClipPreset}
           onDeselectPreview={() => setShowTransformOverlay(false)}
          onSetTransitionType={setTransitionType}
          onSetTransitionDuration={applyTransitionResize}
          onDeleteClip={handleDeleteClip}
          isOpen={propertiesOpen}
          onClose={() => setPropertiesOpen(false)}
          view={toolView}
          onOpenProperties={() => { setToolView('properties'); setPropertiesOpen(true); }}
          onOpenTransitions={() => { setToolView('transitions'); setPropertiesOpen(true); }}
          onOpenAudio={() => { setToolView('audio'); setPropertiesOpen(true); }}
          onOpenAnimations={() => { setToolView('animations'); setPropertiesOpen(true); }}
          onOpenPlugins={() => { setToolView('plugins'); setPropertiesOpen(true); }}
          onOpenPluginsModal={() => setModal('plugins')}
          pluginContent={toolView === 'plugins' && pluginSnapshot.tools.length > 0 ? (
            <div className="flex flex-col gap-3">
              {pluginSnapshot.tools.map((tool) => (
                <div key={tool.id} className="border-b border-[#303136] pb-3">
                  {tool.render({ activeClip, clipIndex: activeClipIndex, totalFrames, fps: FPS, asset: activeAsset ? { name: activeAsset.name } : undefined, onUpdateClip: (id, patch) => updateClip(id, patch), onClose: () => setPropertiesOpen(false) })}
                </div>
              ))}
            </div>
          ) : undefined}
        />
      </div>

      <div className="relative shrink-0">
       <div role="separator" aria-orientation="horizontal" aria-label={t('ctx.resizeTimeline')} onPointerDown={startTimelineDrag} className="absolute inset-x-0 -top-1 z-30 h-2 cursor-row-resize bg-transparent hover:bg-blue-500/40" />
       <TimelineView
        clips={clips}
        totalFrames={totalFrames}
        currentFrame={currentFrame}
        fps={FPS}
        selectedTrack={selectedTrack}
        trackCount={project?.trackCount ?? DEFAULT_TRACKS}
        trackSettings={trackSettings}
        playerRef={playerRef}
        isPlaying={isPlaying}
        onSeek={seekTo}
        selectedClipIds={selectedClipIds}
        onSelectClip={selectClip}
        onSelectClips={selectClips}
         onSelectTrack={setSelectedTrack}
         markers={markers}
         assets={assets}
        onSplit={handleSplit}
        onQuickTransition={handleQuickTransition}
        onAddTrack={handleAddTrack}
        onBeginEdit={beginEdit}
        onUpdateClipFromDrag={applyClipDrag}
        onTransitionResize={applyTransitionResize}
         onTransitionDrop={handleTransitionDrop}
        onSelectTransition={(clipId, trackIndex) => {
           setSelectedClipId(clipId);
           setSelectedTrack(trackIndex);
        }}
        onToggleTrackSetting={toggleTrackSetting}
        onRenameTrack={renameTrack}
        onContextMenuClip={(event, clipId) => {
          if (!selectedClipIds.includes(clipId)) selectClip(clipId);
          showContextMenu(event, { kind: 'clip', clipId });
        }}
        onContextMenuTrack={(event, trackIndex) => showContextMenu(event, { kind: 'track', trackIndex })}
        onContextMenuEmpty={(event, trackIndex) => showContextMenu(event, { kind: 'empty', trackIndex })}
        onContextMenuTransition={(event, clipId, trackIndex) => showContextMenu(event, { kind: 'transition', clipId, trackIndex })}
        onClearSelection={() => { setSelectedClipId(null); setSelectedClipIds([]); }}
        onOpenProperties={() => { setToolView('properties'); setPropertiesOpen(true); }}
        onOpenTransitions={() => { setToolView('transitions'); setPropertiesOpen(true); }}
        onClipDragEnd={handleClipDragEnd}
        onMediaDrop={handleMediaDrop}
        height={timelineHeight}
       />
      </div>
      </>
      )}

      {clipContextMenu && (
        <ContextMenu
          x={clipContextMenu.x}
          y={clipContextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: t('ctx.cut'), icon: <Scissors size={14} />, onClick: () => { cutClip(clipContextMenu.clipId); setContextMenu(null); } },
            { label: t('ctx.copy'), icon: <Copy size={14} />, onClick: () => { copyClip(clipContextMenu.clipId); setContextMenu(null); } },
            { label: t('ctx.paste'), icon: <ClipboardPaste size={14} />, onClick: () => { pasteClip(); setContextMenu(null); } },
            { label: t('ctx.duplicate'), icon: <Copy size={14} />, onClick: () => { duplicateClip(clipContextMenu.clipId); setContextMenu(null); } },
            ...(selectedClipIds.length > 1 && !selectedClipIds.some((id) => clips.find((clip) => clip.id === id)?.groupId)
              ? [{ label: t('ctx.group'), icon: <Layers size={14} />, onClick: () => { groupSelectedClips(); setContextMenu(null); } }]
              : []),
            ...(selectedClipIds.some((id) => clips.find((clip) => clip.id === id)?.groupId)
              ? [{ label: t('ctx.ungroup'), icon: <Ungroup size={14} />, onClick: () => { ungroupSelectedClips(); setContextMenu(null); } }]
              : []),
            ...(canJoinSelectedClips
              ? [{ label: t('ctx.merge'), icon: <Combine size={14} />, onClick: () => { joinSelectedClips(); setContextMenu(null); } }]
              : []),
            { label: t('ctx.insertTransition'), icon: <ArrowRightLeft size={14} />, onClick: () => { insertTransitionForClip(clipContextMenu.clipId); setContextMenu(null); } },
            {
              label: t('ctx.refreshClip'),
              icon: <RefreshCw size={14} />,
              onClick: () => {
                const clip = clips.find((c) => c.id === clipContextMenu.clipId);
                if (!clip) { setContextMenu(null); return; }
                const asset = assets.find((a) => a.sourceId === clip.sourceId);
                if (!asset) { setContextMenu(null); return; }
                beginEdit();
                const isImage = asset.blob.type.startsWith('image/');
                const isAudio = asset.blob.type.startsWith('audio/');
                const type = isImage ? 'image' as const : isAudio ? 'audio' as const : 'video' as const;
                setClips((prev) => prev.map((c) => c.id === clip.id ? { ...c, type } : c));
                setContextMenu(null);
              },
            },
            {
              label: t('ctx.properties'),              icon: <Settings2 size={14} />,
              onClick: () => {
                const clip = clips.find((item) => item.id === clipContextMenu.clipId);
                if (clip) {
                  setSelectedClipId(clip.id);
                  setSelectedClipIds([clip.id]);
                  setSelectedTrack(clip.trackIndex);
                  setToolView('properties');
                  setPropertiesOpen(true);
                }
                setContextMenu(null);
              },
            },
          ]}
        />
      )}
      {emptyContextMenu && (
        <ContextMenu
          x={emptyContextMenu.x}
          y={emptyContextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: t('ctx.paste'),
              icon: <ClipboardPaste size={14} />,
              onClick: () => {
                setSelectedTrack(emptyContextMenu.trackIndex);
                pasteClip(emptyContextMenu.trackIndex);
                setContextMenu(null);
              },
            },
          ]}
        />
      )}
      {assetContextMenu && (
        <ContextMenu
          x={assetContextMenu.x}
          y={assetContextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: t('ctx.insertOnTrack'), icon: <Plus size={14} />, onClick: () => { handlePlaceAsset(assetContextMenu.sourceId); setContextMenu(null); } },
            { label: t('ctx.rename'), icon: <Edit3 size={14} />, onClick: () => { renameAsset(assetContextMenu.sourceId); setContextMenu(null); } },
            {
              label: t('ctx.replaceFile'),
              icon: <FileUp size={14} />,
              onClick: () => {
                setReplacementSourceId(assetContextMenu.sourceId);
                setContextMenu(null);
                setModal('replace-asset');
              },
            },
            { label: t('ctx.removeFromLibrary'), icon: <Trash2 size={14} />, danger: true, onClick: () => { removeAssetFromLibrary(assetContextMenu.sourceId); setContextMenu(null); } },
          ]}
        />
      )}
      {trackContextMenu && (
        <ContextMenu
          x={trackContextMenu.x}
          y={trackContextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: t('ctx.copy'), icon: <Copy size={14} />, onClick: () => { copyClipFromTrack(trackContextMenu.trackIndex); setContextMenu(null); } },
            { label: t('ctx.addTrackAbove'), icon: <Plus size={14} />, onClick: () => { insertTrack(trackContextMenu.trackIndex, true); setContextMenu(null); } },
            { label: t('ctx.addTrackBelow'), icon: <Plus size={14} />, onClick: () => { insertTrack(trackContextMenu.trackIndex, false); setContextMenu(null); } },
            ...(trackContextMenu.trackIndex < (project?.trackCount ?? 1) - 1 ? [{ label: t('ctx.moveTrackUp'), icon: <ArrowUp size={14} />, onClick: () => { moveTrack(trackContextMenu.trackIndex, 1); setContextMenu(null); } }] : []),
            ...(trackContextMenu.trackIndex > 0 ? [{ label: t('ctx.moveTrackDown'), icon: <ArrowDown size={14} />, onClick: () => { moveTrack(trackContextMenu.trackIndex, -1); setContextMenu(null); } }] : []),
            ...(project && project.trackCount > 1
              ? [{ label: t('ctx.deleteTrack'), icon: <Trash2 size={14} />, danger: true, onClick: () => { removeTrack(trackContextMenu.trackIndex); setContextMenu(null); } }]
              : []),
          ]}
        />
      )}
      {transitionContextMenu && (
        <ContextMenu
          x={transitionContextMenu.x}
          y={transitionContextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: t('ctx.deleteTransition'), icon: <Trash2 size={14} />, onClick: () => { setTransitionType(transitionContextMenu.clipId, 'none'); setContextMenu(null); } },
            { label: 'Fade', icon: <ArrowRightLeft size={14} />, onClick: () => { setTransitionType(transitionContextMenu.clipId, 'fade'); setContextMenu(null); } },
            { label: 'Slide', icon: <ArrowRightLeft size={14} />, onClick: () => { setTransitionType(transitionContextMenu.clipId, 'slide'); setContextMenu(null); } },
            { label: 'Wipe', icon: <ArrowRightLeft size={14} />, onClick: () => { setTransitionType(transitionContextMenu.clipId, 'wipe'); setContextMenu(null); } },
            { label: 'Push', icon: <ArrowRightLeft size={14} />, onClick: () => { setTransitionType(transitionContextMenu.clipId, 'push'); setContextMenu(null); } },
          ]}
        />
      )}

      {modal === 'start' && (
        <StartModalView
          projects={library}
          resolutions={RESOLUTIONS}
          canGoBack={project !== null}
          mobile={isMobileDevice}
          onOpen={(p) => openProject(p)}
          onMore={() => setModal('library')}
          onImport={() => importFileRef.current?.click()}
          onNew={() => setModal('new')}
           onOpenAppSettings={() => setModal('app-settings')}
           onClose={() => setModal(null)}
           remoteProjects={remoteProjects}
           remoteChecking={spaceRenderChecking}
           remoteError={remoteError}
           onOpenRemote={(remote) => void openRemoteProject(remote)}
         />
      )}
      {modal === 'library' && (
        <LibraryModalView
          projects={library}
          resolutions={RESOLUTIONS}
          onOpen={(p) => openProject(p)}
          onDelete={(p) => removeProject(p)}
          onImport={() => importFileRef.current?.click()}
          onClose={() => setModal('start')}
        />
      )}
      {modal === 'new' && (
        <NewProjectModalView resolutions={RESOLUTIONS} onConfirm={createProject} onClose={() => setModal('start')} />
      )}
      {modal === 'settings' && project && (
        <SettingsModalView
          project={project}
          resolutions={RESOLUTIONS}
          onConfirm={handleSaveSettings}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'app-settings' && (
        <AppSettingsModalView
          settings={settings}
          autoSaveOptions={AUTO_SAVE_OPTIONS}
           onConfirm={handleSaveAppSettings}
           onClose={() => setModal(project ? null : 'start')}
           onOpenProjectSettings={project ? () => setModal('settings') : undefined}
           onOpenPlugins={() => setModal('plugins')}
           mobile={isMobileDevice}
        />
      )}
      {modal === 'shortcuts' && <ShortcutsModal onClose={() => setModal(null)} />}
      {modal === 'plugins' && <PluginsModal onClose={() => setModal(null)} />}
      {modal === 'juicer' && (
        <JuicerModal
          onClose={() => setModal(null)}
          clips={clips.length > 0 ? clips : assets.map((a, i) => ({
            id: a.sourceId, type: a.blob.type.startsWith('audio/') ? 'audio' as const : a.blob.type.startsWith('image/') ? 'image' as const : 'video' as const,
            sourceId: a.sourceId, trackIndex: 0, offsetInTimeline: clips.reduce((sum, c) => sum + c.durationInFrames, 0) + i * a.durationInFrames,
            startFrame: 0, durationInFrames: a.durationInFrames, scale: 1, posX: 0, posY: 0,
            transitionIn: 'none' as const, transitionDurationInFrames: 0,
          }))}
          trackCount={project?.trackCount ?? DEFAULT_TRACKS}
          trackSettings={trackSettings}
          onApplySnapshot={handleJuicerApply}
          onUndoSnapshot={handleJuicerUndo}
          hasSnapshot={juicerSnapshotRef.current !== null}
          pluginPickerFields={pluginSnapshot.juicerPromptTemplates.map((t) => ({ id: t.id, label: t.label, placeholder: t.prompt }))}
          projectId={project?.id}
          assetNames={assets.map((a) => a.name)}
          assetCount={assets.length}
          projectConfig={project ? { resolutionLabel: project.config.resolutionLabel, orientation: project.config.orientation, fps: FPS } : undefined}
        />
      )}
      {modal === 'export-film' && (
         <ExportFilmModal
           totalFrames={totalFrames}
           contentFrames={contentFrames}
           fps={FPS}
           servers={settings.renderServers}
           mobileUnavailable={isMobileDevice && !settings.mobileRenderEnabled}
           defaultName={`render-${serializeName(project?.name ?? '')}`}
          onExport={exportRenderedFilm}
          onClose={() => setModal(null)}
        />
      )}
       {modal === 'export-project' && <ExportProjectModal onExport={(includeAssets) => void exportProject(includeAssets)} onExportToServer={() => void exportProjectToServer()} onCopyToLocal={() => void copyRemoteProjectToLocal()} remoteProject={projectSource === 'remote'} serverAvailable={spaceRenderServers.length > 0} onClose={() => setModal(null)} />}
      {exportReady && (
        <ExportReadyModal
          name={exportReady.name}
          format={exportReady.format}
          onDownload={() => downloadRecentExport({ id: exportReady.id, name: exportReady.name, format: exportReady.format, blob: exportReady.blob, createdAt: 0, size: exportReady.blob.size })}
          onDismiss={dismissExportReady}
        />
      )}
      {modal === 'replace-asset' && replacementSourceId && (
        <ReplaceAssetModal
          assetName={assets.find((asset) => asset.sourceId === replacementSourceId)?.name ?? t('media.videoDefault')}
          onReplace={(file) => void replaceAsset(replacementSourceId, file)}
          onClose={() => { setReplacementSourceId(null); setModal(null); }}
        />
      )}
      {loading && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4">
          <div className="w-[360px] rounded-xl border border-[#2c2d33] bg-[#18191c] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-white">
              <span>{loading.label}</span>
              <span className="font-mono text-blue-400">{Math.round(loading.progress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#2a2b30]">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.max(3, loading.progress * 100)}%` }} />
            </div>
          </div>
        </div>
      )}
      {showWelcome && (
        <WelcomeModal onDismiss={() => { localStorage.setItem('revideeo:welcomed', '1'); setShowWelcome(false); }} />
      )}
      {!showWelcome && showRelease && (
        <ReleaseChangesModal version="0.2.1" onDismiss={() => { localStorage.setItem('revideeo:lastSeenVersion', '0.2.1'); setShowRelease(false); }} />
      )}
    </div>
  );
}
