/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { Monitor, Smartphone } from 'lucide-react';
import type { Orientation, ProjectConfig } from '../../types';
import { useTranslation } from '../../i18n';

export interface ResolutionOption { label: string; landscape: { width: number; height: number }; portrait: { width: number; height: number }; }
const FPS_OPTIONS = [5, 10, 15, 25, 29.97, 30, 50, 60, 120] as const;

export const ResolutionPicker = ({ config, resolutions, onChange }: { config: ProjectConfig; resolutions: ResolutionOption[]; onChange: (config: ProjectConfig) => void }) => {
  const { t } = useTranslation();
  const resolution = resolutions.find((item) => item.label === config.resolutionLabel) ?? resolutions[0];
  const preset = config.orientation === '9:16' ? resolution.portrait : resolution.landscape;
  const isPresetFps = FPS_OPTIONS.includes(config.fps as (typeof FPS_OPTIONS)[number]);
  const fpsValue = isPresetFps ? String(config.fps) : 'custom';
  return <>
    <div className="flex flex-col gap-2"><span className="text-xs font-bold tracking-wider text-gray-400">{t('resolution.orientation')}</span><div className="flex items-center gap-1 rounded-lg bg-[#202124] p-1">{(['16:9', '9:16'] as Orientation[]).map((orientation) => <button key={orientation} onClick={() => onChange({ ...config, orientation })} className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${config.orientation === orientation ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{orientation === '16:9' ? <Monitor size={14} /> : <Smartphone size={14} />}{orientation}</button>)}</div></div>
    <div className="flex flex-col gap-2"><span className="text-xs font-bold tracking-wider text-gray-400">{t('resolution.resolution')}</span><div className="grid grid-cols-3 gap-2">{resolutions.map((item) => <button key={item.label} onClick={() => onChange({ ...config, resolutionLabel: item.label })} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${config.resolutionLabel === item.label ? 'border-blue-500 bg-blue-600 text-white' : 'border-[#2c2d33] bg-[#202124] text-gray-400'}`}>{item.label}</button>)}</div><div className="rounded-lg bg-[#202124] px-3 py-2 text-center font-mono text-xs text-gray-300">{resolution.label} · {config.orientation} · {preset.width}×{preset.height} px</div></div>
    <div className="flex flex-col gap-2"><span className="text-xs font-bold tracking-wider text-gray-400">{t('resolution.fps')}</span><select value={fpsValue} onChange={(event) => { onChange({ ...config, fps: event.target.value === 'custom' ? (isPresetFps ? 31 : config.fps) : Number(event.target.value) }); }} className="rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="29.97">29.97</option><option value="30">30</option><option value="50">50</option><option value="60">60</option><option value="120">120</option><option value="custom">{t('resolution.custom')}</option></select>{fpsValue === 'custom' && <input type="number" min="1" max="240" step="0.01" value={config.fps} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value > 0) onChange({ ...config, fps: value }); }} placeholder={t('resolution.fpsPlaceholder')} className="rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500" />}</div>
  </>;
};
