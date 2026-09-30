/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export const formatTimecode = (frame: number, fps: number): string => {
  const totalSeconds = Math.max(0, Math.floor(frame / fps));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const parsePositionInput = (value: string, fps: number): number | null => {
  const input = value.trim();
  if (!input) return null;
  if (!input.includes(':')) {
    const frame = Number(input);
    return Number.isFinite(frame) ? Math.round(frame) : null;
  }
  const parts = input.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part)) || parts.length > 3) return null;
  const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  return Math.round(seconds * fps);
};

export const getRulerStepSeconds = (totalFrames: number, fps: number, zoom?: number): number => {
  const seconds = totalFrames / fps;
  if (zoom === undefined) {
    return seconds <= 30 ? 5 : seconds <= 120 ? 10 : seconds <= 600 ? 30 : 60;
  }
  if (zoom >= 3) return seconds <= 30 ? 0.5 : seconds <= 120 ? 1 : 2;
  if (zoom >= 2) return seconds <= 30 ? 1 : seconds <= 120 ? 2 : 5;
  if (zoom >= 1) return seconds <= 30 ? 2 : seconds <= 120 ? 5 : 10;
  if (zoom >= 0.5) return seconds <= 120 ? 10 : seconds <= 600 ? 15 : 30;
  return seconds <= 120 ? 15 : seconds <= 600 ? 30 : 60;
};
