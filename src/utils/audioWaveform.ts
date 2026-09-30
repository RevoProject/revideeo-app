/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export const createAudioWaveform = async (blob: Blob, bars = 96): Promise<number[]> => {
  if (!blob.type.startsWith('audio/')) return [];
  const buffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(buffer.slice(0));
    const channel = decoded.getChannelData(0);
    if (channel.length === 0) return [];
    const bucketSize = Math.max(1, Math.floor(channel.length / bars));
    const peaks: number[] = [];
    for (let index = 0; index < bars; index += 1) {
      const start = index * bucketSize;
      const end = Math.min(channel.length, start + bucketSize);
      let peak = 0;
      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
        peak = Math.max(peak, Math.abs(channel[sampleIndex] ?? 0));
      }
      peaks.push(Math.min(1, peak));
    }
    const maxPeak = Math.max(...peaks, 0);
    return maxPeak > 0 ? peaks.map((peak) => peak / maxPeak) : peaks;
  } finally {
    await audioContext.close();
  }
};
