/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { useEffect, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Crop, Film, ChevronDown, FileVideo, LayoutGrid, Maximize2, Minimize2, Puzzle, RotateCcw, Trash2, Volume2, X } from 'lucide-react';
import type { StoredClip, TransitionType } from '../../types';
import { useTranslation } from '../../i18n';
import { ToolsMenu, type ToolView as EditorToolView } from './ToolsMenu';
import { TransitionSettings } from './TransitionSettings';

const TRANSITIONS: { type: TransitionType; label: string }[] = [
  { type: 'none', label: 'Brak' }, { type: 'fade', label: 'Fade' }, { type: 'slide', label: 'Slide' }, { type: 'wipe', label: 'Wipe' }, { type: 'push', label: 'Push' }, { type: 'cross-zoom', label: 'CrossZoom' }, { type: 'dreamy-zoom', label: 'DreamZoom' }, { type: 'linear-blur', label: 'Blur' }, { type: 'film-burn', label: 'FilmBurn' },
];

type SourceInfo = { name: string };

const Section = ({ title, icon, open, onToggle, visible = true, children }: { title: string; icon: React.ReactNode; open: boolean; onToggle: () => void; visible?: boolean; children: React.ReactNode }) => visible ? (
  <section className="border-b border-[#303136] pb-3">
    <button type="button" onClick={onToggle} className="flex w-full items-center justify-between py-1 text-left text-xs font-bold text-gray-300">
      <span className="flex items-center gap-2"><span className="text-blue-400">{icon}</span>{title}</span><ChevronDown size={15} className={`text-gray-500 transition-transform ${open ? '' : '-rotate-90'}`} />
    </button>
    {open && <div className="mt-3 flex flex-col gap-3">{children}</div>}
  </section>
) : null;

const Slider = ({ label, value, min, max, step = 1, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) => (
  <label className="flex flex-col gap-1.5 text-[11px] text-gray-400">
    <span className="flex items-center justify-between"><span>{label}</span><span className="font-mono text-gray-300">{Number(value.toFixed(2))}{suffix}</span></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>
);

const NumberInput = ({ value, suffix, onChange }: { value: number; suffix?: string; onChange: (value: number) => void }) => {
  const [local, setLocal] = useState(String(value));
  useEffect(() => { const s = String(value); setLocal((prev) => prev === s ? prev : s); }, [value]);
  return (
    <div className="flex items-center rounded-md bg-[#202124] px-2">
      <input type="number" value={local}
        onChange={(event) => setLocal(event.target.value)}
        onBlur={() => { const parsed = Number(local); if (!isNaN(parsed)) onChange(parsed); else setLocal(String(value)); }}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const parsed = Number(local); if (!isNaN(parsed)) onChange(parsed); else setLocal(String(value)); event.currentTarget.blur(); } }}
        className="min-w-0 flex-1 bg-transparent py-1.5 text-xs text-gray-200 outline-none" />
      {suffix && <span className="text-[10px] text-gray-500">{suffix}</span>}
    </div>
  );
};

const formatTimelineTime = (frames: number, fps: number): string => {
  const seconds = Math.max(0, Math.round(frames / fps));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const parseTimelineTime = (value: string, fps: number): number | null => {
  const parts = value.trim().split(':').map(Number);
  if (parts.length < 1 || parts.length > 3 || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  const [hours, minutes, seconds] = parts.length === 3 ? parts : parts.length === 2 ? [0, parts[0], parts[1]] : [0, 0, parts[0]];
  if (minutes >= 60 || seconds >= 60) return null;
  return Math.round((hours * 3600 + minutes * 60 + seconds) * fps);
};

const TimeField = ({ frames, fps, onCommit }: { frames: number; fps: number; onCommit: (frames: number) => void }) => {
  const [value, setValue] = useState(formatTimelineTime(frames, fps));
  useEffect(() => setValue(formatTimelineTime(frames, fps)), [frames, fps]);
  const commit = () => {
    const parsed = parseTimelineTime(value, fps);
    if (parsed === null) setValue(formatTimelineTime(frames, fps));
    else onCommit(parsed);
  };
  return <input type="text" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); event.currentTarget.blur(); } }} placeholder="00:00:00" className="w-full rounded-md bg-[#202124] px-2 py-1.5 text-center font-mono text-xs text-gray-200 outline-none focus:ring-1 focus:ring-blue-500" aria-label="Czas HH:MM:SS" />;
};

export const PropertiesPanel = ({ activeClip, clipIndex, fps, totalFrames, asset, mobile = false, onUpdateClip, onSetPreset, onDeselectPreview, onSetTransitionType, onSetTransitionDuration, onDeleteClip, isOpen, onClose, view, onOpenProperties, onOpenTransitions, onOpenAudio, onOpenAnimations, onOpenPlugins, onOpenPluginsModal, pluginContent }: { activeClip: StoredClip | null; clipIndex: number; totalFrames: number; fps: number; asset?: SourceInfo; mobile?: boolean; onUpdateClip: (id: string, patch: Partial<StoredClip>) => void; onSetPreset: (id: string, patch: Partial<StoredClip>) => void; onDeselectPreview: () => void; onSetTransitionType: (id: string, type: TransitionType) => void; onSetTransitionDuration: (id: string, frames: number) => void; onDeleteClip: (id: string) => void; isOpen: boolean; onClose: () => void; view: EditorToolView; onOpenProperties: () => void; onOpenTransitions: () => void; onOpenAudio: () => void; onOpenAnimations: () => void; onOpenPlugins: () => void; onOpenPluginsModal?: () => void; pluginContent?: React.ReactNode }) => {
  const { t } = useTranslation();
  const [sections, setSections] = useState<Record<string, boolean>>({ text: true, layout: true, fill: true, crop: true, video: true, audio: true });
  const [confirmRemoveTransition, setConfirmRemoveTransition] = useState(false);
  const toggle = (key: string) => setSections((previous) => ({ ...previous, [key]: !previous[key] }));
  const patch = (values: Partial<StoredClip>) => { if (activeClip) { onDeselectPreview(); onUpdateClip(activeClip.id, values); } };
  const preset = (values: Partial<StoredClip>) => { if (activeClip) { onDeselectPreview(); onSetPreset(activeClip.id, values); } };
  const titles: Record<EditorToolView, string> = { properties: t('tools.propertiesVideo'), transitions: t('tools.settingsTransition'), audio: t('tools.audioTitle'), animations: t('tools.animationsTitle'), plugins: t('tools.pluginsTitle') };

  useEffect(() => { setConfirmRemoveTransition(false); }, [view, isOpen]);

  const handleClose = () => { setConfirmRemoveTransition(false); onClose(); };
  const align = (x: 'left' | 'center' | 'right', y: 'top' | 'center' | 'bottom') => {
    const posX = x === 'left' ? -50 : x === 'right' ? 50 : 0;
    const posY = y === 'top' ? -50 : y === 'bottom' ? 50 : 0;
    patch({ posX, posY });
  };
  const clip = activeClip;

  return <div className={`${mobile ? 'h-full w-full border-0 p-3' : 'w-80 border-l p-4'} flex flex-col gap-3 overflow-y-auto bg-[#18191c]`}>
    <div className="flex items-center justify-between border-b border-[#303136] pb-3">
      <div className="min-w-0"><h2 className="truncate text-sm font-bold tracking-wider text-gray-300">{isOpen && view === 'properties' && clip?.type === 'text' ? t('tools.propertiesText') : isOpen && view === 'properties' && clip?.type === 'audio' ? t('tools.propertiesAudio') : isOpen ? titles[view] : t('tools.title')}</h2>{isOpen && view === 'properties' && clip && <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-500"><FileVideo size={12} className="shrink-0 text-blue-400" /><span className="truncate">{clip.type === 'text' ? t('props.standardText') : asset?.name ?? t('props.videoSection')}</span></div>}</div>
      <div className="flex items-center gap-2">{isOpen && view === 'transitions' && clip && clip.transitionIn !== 'none' && (confirmRemoveTransition ? <div className="flex items-center gap-1"><button type="button" onClick={() => { onSetTransitionType(clip.id, 'none'); setConfirmRemoveTransition(false); }} className="rounded bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">{t('transition.remove')}</button><button type="button" onClick={() => setConfirmRemoveTransition(false)} className="rounded bg-[#2a2b30] px-2 py-1 text-[10px] text-gray-300">{t('juicer.cancel')}</button></div> : <button type="button" onClick={() => setConfirmRemoveTransition(true)} title={t('transition.remove')} className="text-gray-500 hover:text-red-400"><Trash2 size={15} /></button>)}{isOpen && <button type="button" onClick={handleClose} className="text-gray-500 hover:text-gray-200"><X size={16} /></button>}</div>
    </div>
    {isOpen && view === 'properties' && clip ? <>
      <div data-total-frames={totalFrames} className="grid grid-cols-3 gap-2 border-b border-[#303136] pb-3"><label className="flex min-w-0 flex-col gap-1 text-[10px] text-gray-500">{t('props.duration')}<TimeField frames={clip.durationInFrames} fps={fps} onCommit={(frames) => patch({ durationInFrames: Math.max(1, frames) })} /></label><label className="flex min-w-0 flex-col gap-1 text-[10px] text-gray-500">{t('props.from')}<TimeField frames={clip.offsetInTimeline} fps={fps} onCommit={(frames) => patch({ offsetInTimeline: Math.max(0, frames) })} /></label><label className="flex min-w-0 flex-col gap-1 text-[10px] text-gray-500">{t('props.to')}<TimeField frames={clip.offsetInTimeline + clip.durationInFrames} fps={fps} onCommit={(frames) => patch({ durationInFrames: Math.max(1, frames - clip.offsetInTimeline) })} /></label></div>
      {clip.type === 'text' && <Section title={t('props.text')} icon={<FileVideo size={14} />} open={sections.text} onToggle={() => toggle('text')}><textarea value={clip.text ?? ''} onChange={(event) => patch({ text: event.target.value })} rows={3} className="resize-none rounded-md bg-[#202124] p-2 text-xs text-gray-200 outline-none focus:border-blue-500" placeholder={t('props.textPlaceholder')} /><div className="grid grid-cols-2 gap-2"><NumberInput value={clip.fontSize ?? 64} suffix="px" onChange={(value) => patch({ fontSize: Math.max(8, value) })} /><select value={clip.fontWeight ?? 600} onChange={(event) => patch({ fontWeight: Number(event.target.value) })} className="rounded-md bg-[#202124] px-2 text-xs text-gray-200 outline-none"><option value="400">{t('props.fontNormal')}</option><option value="600">{t('props.fontMedium')}</option><option value="700">{t('props.fontBold')}</option></select></div><div className="grid grid-cols-3 gap-1"><button type="button" onClick={() => patch({ textAlign: 'left' })} className="rounded bg-[#202124] p-2 text-white"><AlignLeft size={14} className="mx-auto" /></button><button type="button" onClick={() => patch({ textAlign: 'center' })} className="rounded bg-[#202124] p-2 text-white"><AlignCenter size={14} className="mx-auto" /></button><button type="button" onClick={() => patch({ textAlign: 'right' })} className="rounded bg-[#202124] p-2 text-white"><AlignRight size={14} className="mx-auto" /></button></div><label className="flex items-center justify-between text-[11px] text-gray-400">{t('props.textColor')}<input type="color" value={clip.textColor ?? '#ffffff'} onChange={(event) => patch({ textColor: event.target.value })} className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent" /></label><Slider label={t('props.fadeIn')} value={(clip.fadeInFrames ?? 0) / fps} min={0} max={5} step={0.1} suffix="s" onChange={(value) => patch({ fadeInFrames: Math.round(value * fps) })} /><Slider label={t('props.fadeOut')} value={(clip.fadeOutFrames ?? 0) / fps} min={0} max={5} step={0.1} suffix="s" onChange={(value) => patch({ fadeOutFrames: Math.round(value * fps) })} /></Section>}
      <Section title={t('props.layout')} icon={<LayoutGrid size={14} />} visible={clip.type !== 'audio'} open={sections.layout} onToggle={() => toggle('layout')}>
        <div><span className="mb-1.5 block text-[11px] text-gray-500">{t('props.align')}</span><div className="grid grid-cols-3 gap-1"><button type="button" onClick={() => align('left', 'center')} className="rounded bg-[#202124] p-2 text-gray-300 hover:bg-[#2a2b30"><AlignLeft size={15} className="mx-auto" /></button><button type="button" onClick={() => align('center', 'center')} className="rounded bg-[#202124] p-2 text-gray-300 hover:bg-[#2a2b30"><AlignCenter size={15} className="mx-auto" /></button><button type="button" onClick={() => align('right', 'center')} className="rounded bg-[#202124] p-2 text-gray-300 hover:bg-[#2a2b30"><AlignRight size={15} className="mx-auto" /></button></div><div className="mt-1 grid grid-cols-3 gap-1"><button type="button" onClick={() => align('center', 'top')} className="rounded bg-[#202124] p-1.5 text-[10px] text-gray-400">{t('props.top')}</button><button type="button" onClick={() => align('center', 'center')} className="rounded bg-[#202124] p-1.5 text-[10px] text-gray-400">{t('props.center')}</button><button type="button" onClick={() => align('center', 'bottom')} className="rounded bg-[#202124] p-1.5 text-[10px] text-gray-400">{t('props.bottom')}</button></div></div>
        <div className="grid grid-cols-2 gap-2"><NumberInput value={clip.posX} suffix="X" onChange={(value) => patch({ posX: value })} /><NumberInput value={clip.posY ?? 0} suffix="Y" onChange={(value) => patch({ posY: value })} /></div>
        <div className="grid grid-cols-2 gap-2"><NumberInput value={clip.width ?? 100} suffix="W %" onChange={(value) => patch({ width: value })} /><NumberInput value={clip.height ?? 100} suffix="H %" onChange={(value) => patch({ height: value })} /></div>
        <Slider label={t('props.scale')} value={clip.scale} min={0.1} max={3} step={0.05} suffix="x" onChange={(value) => patch({ scale: value })} />
        <div className="flex items-center gap-2"><NumberInput value={clip.rotation ?? 0} suffix="°" onChange={(value) => patch({ rotation: value })} /><button type="button" onClick={() => patch({ rotation: 0 })} title={t('props.resetRotation')} className="rounded bg-[#202124] p-2 text-gray-400 hover:text-white"><RotateCcw size={14} /></button></div>
      </Section>
      <Section title={t('props.fill')} icon={<Film size={14} />} visible={clip.type !== 'audio'} open={sections.fill} onToggle={() => toggle('fill')}>
        <div className="grid grid-cols-2 gap-1.5"><button type="button" onClick={() => preset({ posX: 0, posY: 0, width: 100, height: 100, scale: 1, fitMode: 'cover' })} title={t('props.fillScreen')} aria-label={t('props.fillScreen')} className="flex items-center justify-center rounded-lg border border-[#2c2d33] bg-[#202124] p-2.5 text-white hover:border-blue-500 hover:bg-[#2a2b30]"><Maximize2 size={16} /></button><button type="button" onClick={() => preset({ posX: 0, posY: 0, width: 100, height: 100, scale: 1, fitMode: 'contain' })} title={t('props.fitToScreen')} aria-label={t('props.fitToScreen')} className="flex items-center justify-center rounded-lg border border-[#2c2d33] bg-[#202124] p-2.5 text-white hover:border-blue-500 hover:bg-[#2a2b30]"><Minimize2 size={16} /></button></div>
        <Slider label={t('props.opacity')} value={(clip.opacity ?? 1) * 100} min={0} max={100} suffix="%" onChange={(value) => patch({ opacity: value / 100 })} />
        <NumberInput value={clip.borderRadius ?? 0} suffix="px" onChange={(value) => patch({ borderRadius: Math.max(0, value) })} />
      </Section>
      <Section title={t('props.crop')} icon={<Crop size={14} />} visible={clip.type !== 'text' && clip.type !== 'audio'} open={sections.crop} onToggle={() => toggle('crop')}>
        {([['cropLeft', t('props.cropLeft')], ['cropTop', t('props.top')], ['cropRight', t('props.cropRight')], ['cropBottom', t('props.bottom')]] as const).map(([key, label]) => <Slider key={key} label={label} value={Number(clip[key] ?? 0)} min={0} max={49} suffix="%" onChange={(next) => patch({ [key]: next })} />)}
      </Section>
      <Section title={t('props.videoSection')} icon={<FileVideo size={14} />} visible={clip.type !== 'text' && clip.type !== 'audio'} open={sections.video} onToggle={() => toggle('video')}>
        <Slider label={t('props.playbackSpeed')} value={clip.playbackRate ?? 1} min={0.25} max={4} step={0.05} suffix="x" onChange={(value) => { const oldRate = clip.playbackRate ?? 1; const newDuration = Math.max(1, Math.round(clip.durationInFrames * oldRate / value)); patch({ playbackRate: value, durationInFrames: newDuration }); }} />
        <Slider label={t('props.fadeIn')} value={(clip.fadeInFrames ?? 0) / fps} min={0} max={5} step={0.1} suffix="s" onChange={(value) => patch({ fadeInFrames: Math.round(value * fps) })} />
        <Slider label={t('props.fadeOut')} value={(clip.fadeOutFrames ?? 0) / fps} min={0} max={5} step={0.1} suffix="s" onChange={(value) => patch({ fadeOutFrames: Math.round(value * fps) })} />
      </Section>
      <Section title={t('props.audioSection')} icon={<Volume2 size={14} />} visible={clip.type !== 'text'} open={sections.audio} onToggle={() => toggle('audio')}>
        {clip.type === 'audio' && <Slider label={t('props.playbackSpeed')} value={clip.playbackRate ?? 1} min={0.25} max={4} step={0.05} suffix="x" onChange={(value) => { const oldRate = clip.playbackRate ?? 1; const newDuration = Math.max(1, Math.round(clip.durationInFrames * oldRate / value)); patch({ playbackRate: value, durationInFrames: newDuration }); }} />}
        <Slider label={t('props.volume')} value={(clip.volume ?? 1) * 100} min={0} max={200} suffix="%" onChange={(value) => patch({ volume: value / 100 })} />
        <Slider label={t('props.fadeIn')} value={(clip.audioFadeInFrames ?? 0) / fps} min={0} max={5} step={0.1} suffix="s" onChange={(value) => patch({ audioFadeInFrames: Math.round(value * fps) })} />
        <Slider label={t('props.fadeOut')} value={(clip.audioFadeOutFrames ?? 0) / fps} min={0} max={5} step={0.1} suffix="s" onChange={(value) => patch({ audioFadeOutFrames: Math.round(value * fps) })} />
      </Section>
      <button type="button" onClick={() => onDeleteClip(clip.id)} className="flex items-center justify-center gap-2 rounded-lg bg-red-600/20 p-2.5 text-xs font-semibold text-red-400"><Trash2 size={14} />{clip.type === 'text' ? t('props.deleteText') : clip.type === 'audio' ? t('props.deleteAudio') : t('props.deleteClip')}</button>
    </> : isOpen && view === 'transitions' ? <TransitionSettings activeClip={activeClip} clipIndex={clipIndex} transitionTypes={TRANSITIONS} minDuration={5} maxDuration={30} onSetTransitionType={onSetTransitionType} onSetTransitionDuration={onSetTransitionDuration} /> : isOpen && view === 'plugins' ? (pluginContent ?? <div className="flex flex-col gap-3"><div className="flex items-center gap-2"><Puzzle size={16} className="text-purple-400" /><span className="text-xs font-bold tracking-wider text-gray-300">{t('tools.pluginsTitle')}</span></div><p className="rounded bg-[#202124] p-3 text-xs text-gray-500">{t('tools.noPlugins')}</p>{onOpenPluginsModal && <button type="button" onClick={onOpenPluginsModal} className="flex items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 p-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-colors"><Puzzle size={14} /> {t('tools.seePlugins')}</button>}</div>) : isOpen ? <p className="rounded bg-[#202124] p-2 text-xs text-gray-500">{t('tools.placeholder')}</p> : <ToolsMenu onOpenProperties={onOpenProperties} onOpenTransitions={onOpenTransitions} onOpenAudio={onOpenAudio} onOpenAnimations={onOpenAnimations} onOpenPlugins={onOpenPlugins} />}
  </div>;
};
