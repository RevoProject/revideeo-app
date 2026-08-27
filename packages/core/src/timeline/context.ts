/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { TimelineClipInfo, TimelineTrackInfo } from './types.js';
import type { TimelineProvider } from './provider.js';
import type { TimelineAPI } from './api.js';

export function createTimelineContext(provider: TimelineProvider): TimelineAPI {
  let clipsCache: readonly TimelineClipInfo[] = [];
  let clipsCacheKey = '';

  function snapshotClips(clips: readonly TimelineClipInfo[]): readonly TimelineClipInfo[] {
    const key = clips.map((c) => c.id).join(',');
    if (key !== clipsCacheKey) {
      clipsCacheKey = key;
      clipsCache = clips;
    }
    return clipsCache;
  }

  return {
    getState() {
      return provider.getState();
    },

    seekTo(frame: number) {
      provider.seekTo(frame);
    },

    play() {
      provider.play();
    },

    pause() {
      provider.pause();
    },

    toggle() {
      provider.toggle();
    },

    getClips() {
      return snapshotClips(provider.getClips());
    },

    getClipById(id: string): TimelineClipInfo | null {
      return provider.getClips().find((c) => c.id === id) ?? null;
    },

    getClipsAtFrame(frame: number): readonly TimelineClipInfo[] {
      return provider.getClips().filter(
        (c) => frame >= c.offsetInTimeline && frame < c.offsetInTimeline + c.durationInFrames,
      );
    },

    getTracks(): readonly TimelineTrackInfo[] {
      return provider.getTracks();
    },

    getTrack(index: number): TimelineTrackInfo | null {
      return provider.getTracks().find((t) => t.index === index) ?? null;
    },
  };
}
