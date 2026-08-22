import type { ManifestResolution } from './types.js';

export interface ResolutionPreset {
  readonly label: string;
  readonly landscape: ManifestResolution;
  readonly portrait: ManifestResolution;
}

export const RESOLUTION_PRESETS: readonly ResolutionPreset[] = [
  { label: '360p', landscape: { label: '360p', width: 640, height: 360 }, portrait: { label: '360p', width: 360, height: 640 } },
  { label: '480p', landscape: { label: '480p', width: 854, height: 480 }, portrait: { label: '480p', width: 480, height: 854 } },
  { label: '720p', landscape: { label: '720p', width: 1280, height: 720 }, portrait: { label: '720p', width: 720, height: 1280 } },
  { label: '1080p', landscape: { label: '1080p', width: 1920, height: 1080 }, portrait: { label: '1080p', width: 1080, height: 1920 } },
  { label: '2K', landscape: { label: '2K', width: 2560, height: 1440 }, portrait: { label: '2K', width: 1440, height: 2560 } },
] as const;

export const DEFAULT_RESOLUTION_LABEL = '720p';

export const DEFAULT_FPS = 30;

export function resolveResolution(
  label: string,
  orientation: '16:9' | '9:16' = '16:9',
): ManifestResolution {
  const preset = RESOLUTION_PRESETS.find((r) => r.label === label);
  if (!preset) {
    const fallback = RESOLUTION_PRESETS.find((r) => r.label === DEFAULT_RESOLUTION_LABEL);
    return orientation === '9:16' ? fallback!.portrait : fallback!.landscape;
  }
  return orientation === '9:16' ? preset.portrait : preset.landscape;
}
