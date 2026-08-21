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

export const getRulerStepSeconds = (totalFrames: number, fps: number): number => {
  const seconds = totalFrames / fps;
  return seconds <= 30 ? 5 : seconds <= 120 ? 10 : seconds <= 600 ? 30 : 60;
};
