/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { forwardRef, useImperativeHandle, useState, type ReactNode } from 'react';
import { useTranslation } from '../i18n';
import {
  AudioLines,
  Clapperboard,
  Download,
  FileDown,
  FileUp,
  Film,
  GripHorizontal,
  History,
  Menu,
  Pause,
  Play,
  Puzzle,
  Plus,
  Scissors,
  Settings,
  Settings2,
  Shuffle,
  TriangleAlert,
  Type,
  Redo2,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import type { ToolView } from '../editor/tools/ToolsMenu';
import { RecentExportsMenu } from '../components/shared/RecentExportsMenu';
import type { RecentExport } from '../storage';

export type MobileSheet =
  | { kind: 'media' }
  | { kind: 'tools'; view: ToolView }
  | { kind: 'text' }
  | { kind: 'tracks' }
  | { kind: 'exports' }
  | { kind: 'placeholder'; title: string; description: string };

export interface MobileEditorShellHandle {
  openSheet: (sheet: MobileSheet) => void;
}

interface ActionItem {
  id: string;
  label: string;
  icon: ReactNode;
  sheet: MobileSheet;
}

interface MobileEditorShellProps {
  projectName: string;
  dirty: boolean;
  saveLabel?: string;
  fps: number;
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  preview: ReactNode;
  media: ReactNode;
  timeline: ReactNode;
  renderTools: (view: ToolView, onClose: () => void) => ReactNode;
  onOpenProject: () => void;
  onSave: () => void;
  onImport: () => void;
  onJuicer: () => void;
  onExtensions: () => void;
  floatingButtons?: { id: string; label: string; icon: ReactNode; onClick: () => void }[];
  bottomBarActions?: { id: string; label: string; icon: ReactNode; onClick: () => void }[];
  onExportFilm: () => void;
  onExportProject: () => void;
  onOpenSettings: () => void;
  onTogglePlay: () => void;
  onSeek: (frame: number) => void;
  onSplit: () => void;
  onAddMedia: () => void;
  onAddText: () => void;
  tracks: ReactNode;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  recentExports: RecentExport[];
  onDownloadRecent: (exp: RecentExport) => void;
  onDeleteRecent: (id: string) => void;
}

const formatTime = (frames: number, fps: number): string => {
  const totalSeconds = Math.max(0, Math.floor(frames / fps));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const MobileEditorShell = forwardRef<MobileEditorShellHandle, MobileEditorShellProps>(
  (
    {
      projectName,
      dirty,
      saveLabel,
      fps,
      currentFrame,
      totalFrames,
      isPlaying,
      preview,
      media,
      timeline,
      renderTools,
      onOpenProject,
      onSave,
      onImport,
      onJuicer,
      onExtensions,
      floatingButtons = [],
      bottomBarActions = [],
      onExportFilm,
      onExportProject,
      onOpenSettings,
      onTogglePlay,
      onSeek,
      onSplit,
      onAddMedia,
      onAddText,
      tracks,
      onUndo,
      onRedo,
      canUndo,
      canRedo,
      recentExports,
      onDownloadRecent,
      onDeleteRecent,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [devNoticeVisible, setDevNoticeVisible] = useState(true);
    const [sheet, setSheet] = useState<MobileSheet | null>(null);

    useImperativeHandle(ref, () => ({
      openSheet: (next: MobileSheet) => setSheet(next),
    }));

    const closeSheet = () => setSheet(null);

    const actions: ActionItem[] = [
      { id: 'media', label: t('mobile.media'), icon: <Film size={18} />, sheet: { kind: 'media' } },
      { id: 'properties', label: t('mobile.properties'), icon: <Settings2 size={18} />, sheet: { kind: 'tools', view: 'properties' } },
      { id: 'transitions', label: t('mobile.transitions'), icon: <Shuffle size={18} />, sheet: { kind: 'tools', view: 'transitions' } },
      { id: 'filters', label: t('mobile.filters'), icon: <Wand2 size={18} />, sheet: { kind: 'placeholder', title: t('mobile.filters'), description: t('mobile.filtersDesc') } },
      { id: 'text', label: t('mobile.text'), icon: <Type size={18} />, sheet: { kind: 'text' } },
      { id: 'audio', label: t('mobile.audioMixer'), icon: <AudioLines size={18} />, sheet: { kind: 'tools', view: 'audio' } },
      { id: 'tracks', label: t('mobile.tracks'), icon: <Film size={18} />, sheet: { kind: 'tracks' } },
    ];

    const sheetTitle: string =
      sheet?.kind === 'media'
          ? t('mobile.sheetMedia')
          : sheet?.kind === 'text'
            ? t('mobile.sheetText')
          : sheet?.kind === 'tracks'
            ? t('mobile.sheetTracks')
          : sheet?.kind === 'exports'
          ? t('mobile.sheetExports')
          : sheet?.kind === 'tools'
            ? sheet.view === 'transitions'
              ? t('mobile.sheetTransitions')
              : sheet.view === 'audio'
                ? t('mobile.sheetAudioMixer')
                : sheet.view === 'properties'
                  ? t('mobile.sheetClipProperties')
                  : sheet.view === 'plugins'
                    ? t('mobile.sheetPlugins')
                    : t('mobile.sheetTools')
            : sheet?.kind === 'placeholder'
              ? sheet.title.toUpperCase()
              : '';

    const sheetContent: ReactNode = sheet
      ? sheet.kind === 'media'
        ? media
        : sheet.kind === 'text'
          ? <button type="button" onClick={() => { onAddText(); closeSheet(); }} className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-[#2c2d33] bg-[#202124] px-4 py-4 text-left active:border-blue-500 active:bg-[#2a2d34]"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB]/15 text-blue-400"><Type size={20} /></span><span><span className="block text-sm font-semibold text-gray-200">{t('mobile.standardText')}</span><span className="mt-0.5 block text-xs text-gray-500">{t('mobile.addTextDesc')}</span></span></button>
        : sheet.kind === 'tracks'
          ? tracks
        : sheet.kind === 'exports'
          ? <RecentExportsMenu exports={recentExports} onDownload={onDownloadRecent} onDelete={onDeleteRecent} emptyLabel={t('mobile.noRecentExports')} />
          : sheet.kind === 'tools'
            ? renderTools(sheet.view, closeSheet)
            : (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2563EB]/15 text-blue-400">
                  <Wand2 size={22} />
                </div>
                <p className="text-sm font-semibold text-gray-200">{sheet.title}</p>
                <p className="text-xs leading-relaxed text-gray-500">{sheet.description}</p>
              </div>
            )
      : null;

    return (
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#121316] text-gray-200">
        {/* Top: warning banner */}
        {devNoticeVisible && (
          <div className="flex shrink-0 items-start gap-2 border-b border-amber-600/40 bg-amber-500/15 px-3 py-2">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <p className="min-w-0 flex-1 text-[11px] leading-snug text-amber-200">
              {t('mobile.devNotice')}
            </p>
            <button onClick={() => setDevNoticeVisible(false)} aria-label={t('mobile.close')} className="shrink-0 text-amber-400/80 hover:text-amber-200">
              <X size={14} />
            </button>
          </div>
        )}

        {floatingButtons.length > 0 && (
          <div className="flex shrink-0 gap-2 border-b border-[#222429] bg-[#1F222A] px-3 py-1.5">
            {floatingButtons.map((btn) => (
              <button key={btn.id} onClick={btn.onClick} className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-2.5 py-1.5 text-[10px] font-bold text-white active:bg-blue-500">
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Header bar */}
        <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-[#222429] bg-[#1F222A] px-3">
          <button onClick={onOpenProject} className="flex min-w-0 items-center gap-1.5 truncate text-left">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[#2563EB]">
              <Clapperboard size={14} className="text-white" />
            </span>
            <span className="truncate text-sm font-bold text-white">
              Re<span className="text-[#2563EB]">Videeo</span>
              <span className="ml-1.5 text-xs font-normal text-gray-400">{projectName}</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              className={`rounded-md bg-[#2563EB] px-2.5 py-1.5 text-xs font-semibold text-white ${dirty ? 'ring-2 ring-amber-400' : ''}`}
            >
              {saveLabel ?? t('mobile.save')}
            </button>
            <button type="button" onClick={onUndo} disabled={!canUndo} aria-label={t('mobile.undo')} className="rounded-md bg-[#2a2d34] p-2 text-gray-300 disabled:cursor-not-allowed disabled:opacity-30"><Undo2 size={16} /></button>
            <button type="button" onClick={onRedo} disabled={!canRedo} aria-label={t('mobile.redo')} className="rounded-md bg-[#2a2d34] p-2 text-gray-300 disabled:cursor-not-allowed disabled:opacity-30"><Redo2 size={16} /></button>
            <button
              onClick={() => setMenuOpen((value) => !value)}
              aria-label={t('mobile.menu')}
              className="rounded-md bg-[#2a2d34] p-2 text-gray-300"
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>

          {menuOpen && (
            <div className="absolute right-2 top-full z-[70] mt-2 w-56 rounded-xl border border-[#363941] bg-[#1F222A] p-2 shadow-2xl">
              <button onClick={() => { onImport(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-[#2a2d34]">
                <FileUp size={15} />{t('mobile.importProject')}
              </button>
              <button onClick={() => { onJuicer(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-[#2a2d34]">
                <span className="text-sm leading-none">🍹</span>Juicer
              </button>
              <button onClick={() => { onExtensions(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-[#2a2d34]">
                <Puzzle size={15} />{t('mobile.extensions')}
              </button>
              <button onClick={() => { onExportProject(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-[#2a2d34]">
                <FileDown size={15} />{t('mobile.exportProject')}
              </button>
              <button onClick={() => { onExportFilm(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-[#2a2d34]">
                <Download size={15} />{t('mobile.exportFilm')}
              </button>
              <button onClick={() => { setSheet({ kind: 'exports' }); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-[#2a2d34]">
                <History size={15} />{t('mobile.recentExports')}
              </button>
              <button onClick={() => { onOpenSettings(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-[#2a2d34]">
                <Settings2 size={15} />{t('mobile.settings')}
              </button>
            </div>
          )}
        </header>

        {/* Main stacked editor */}
        <main className="flex min-h-0 flex-1 flex-col">
          {/* Upper-middle: video preview */}
          <div className="relative shrink-0 bg-black" style={{ height: '38vh' }}>
            <div className="h-full w-full">{preview}</div>
            <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[11px] text-gray-200">
              {formatTime(currentFrame, fps)} / {formatTime(totalFrames, fps)}
            </div>
            <button
              onClick={onOpenSettings}
              aria-label={t('mobile.previewSettings')}
              className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-gray-300 hover:text-white"
            >
              <Settings size={15} />
            </button>
          </div>

          {/* Middle: player controls */}
          <div className="flex shrink-0 items-center gap-2 border-y border-[#222429] bg-[#1F222A] px-3 py-2">
            <button
              onClick={onTogglePlay}
              aria-label={isPlaying ? t('mobile.pause') : t('mobile.play')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <button
              onClick={onAddMedia}
              aria-label={t('mobile.addMedia')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#2a2d34] text-gray-300"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={onSplit}
              aria-label={t('mobile.splitClip')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#2a2d34] text-gray-300"
            >
              <Scissors size={18} />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <input
                type="range"
                min={0}
                max={Math.max(1, totalFrames)}
                value={Math.min(currentFrame, totalFrames)}
                onChange={(event) => onSeek(Number(event.target.value))}
                className="w-full accent-[#2563EB]"
                aria-label={t('mobile.timelineSlider')}
              />
              <span className="text-center font-mono text-[9px] text-gray-600">
                {t('mobile.frame')}: {currentFrame} / {totalFrames}
              </span>
            </div>
          </div>

          {/* Lower-middle: multi-track timeline */}
          <div className="min-h-0 flex-1 border-t border-[#222429]">{timeline}</div>
        </main>

        {/* Bottom: contextual action bar */}
        <nav className="flex h-14 shrink-0 items-stretch gap-1 overflow-x-auto border-t border-[#222429] bg-[#1F222A] px-2 pb-[env(safe-area-inset-bottom)]">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => setSheet(action.sheet)}
              className="flex min-w-[60px] flex-col items-center justify-center gap-0.5 px-2 text-[10px] text-gray-400 active:text-blue-400"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
          {bottomBarActions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className="flex min-w-[60px] flex-col items-center justify-center gap-0.5 px-2 text-[10px] text-blue-400 active:text-blue-300"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </nav>

        {/* Bottom sheet / drawer */}
        {sheet && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/40" onClick={closeSheet} />
            <div className="fixed inset-x-0 bottom-14 z-[60] flex max-h-[62vh] flex-col rounded-t-2xl border-t border-[#363941] bg-[#1F222A] shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-[#2c2f37] px-4 py-2">
                <span className="text-xs font-bold tracking-wider text-gray-300">{sheetTitle}</span>
                <button onClick={closeSheet} aria-label={t('mobile.close')} className="flex h-11 w-11 -mr-2 items-center justify-center text-gray-400 hover:text-gray-200">
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center justify-center gap-1 py-1 text-[#3a3f47]">
                <GripHorizontal size={20} />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">{sheetContent}</div>
            </div>
          </>
        )}
      </div>
    );
  },
);

MobileEditorShell.displayName = 'MobileEditorShell';
