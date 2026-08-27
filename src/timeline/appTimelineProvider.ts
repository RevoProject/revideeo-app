/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { TimelineProvider, TimelineState, TimelineClipInfo, TimelineTrackInfo } from '@revideeo/core/timeline';
import type { StoredClip, TrackSettings } from '../types';
import type { NativePlayerHandle } from '@revideeo/player';

function clipToInfo(clip: StoredClip): TimelineClipInfo {
  return {
    id: clip.id,
    type: clip.type ?? 'video',
    sourceId: clip.sourceId,
    trackIndex: clip.trackIndex,
    offsetInTimeline: clip.offsetInTimeline,
    startFrame: clip.startFrame,
    durationInFrames: clip.durationInFrames,
    transitionIn: clip.transitionIn,
  };
}

function trackToInfo(settings: TrackSettings, index: number): TimelineTrackInfo {
  return {
    index,
    name: settings.name,
    locked: settings.locked,
    muted: settings.muted,
    hidden: settings.hidden,
  };
}

export class AppTimelineProvider implements TimelineProvider {
  private getStateSnapshot: () => TimelineState;
  private getStoredClips: () => StoredClip[];
  private getTrackSettings: () => TrackSettings[];
  private seekToFn: (frame: number) => void;
  private playerRef: React.RefObject<NativePlayerHandle | null>;

  constructor(deps: {
    getStateSnapshot: () => TimelineState;
    getStoredClips: () => StoredClip[];
    getTrackSettings: () => TrackSettings[];
    seekTo: (frame: number) => void;
    playerRef: React.RefObject<NativePlayerHandle | null>;
  }) {
    this.getStateSnapshot = deps.getStateSnapshot;
    this.getStoredClips = deps.getStoredClips;
    this.getTrackSettings = deps.getTrackSettings;
    this.seekToFn = deps.seekTo;
    this.playerRef = deps.playerRef;
  }

  getState(): TimelineState {
    return this.getStateSnapshot();
  }

  getClips(): readonly TimelineClipInfo[] {
    return this.getStoredClips().map(clipToInfo);
  }

  getTracks(): readonly TimelineTrackInfo[] {
    return this.getTrackSettings().map(trackToInfo);
  }

  seekTo(frame: number): void {
    this.seekToFn(frame);
  }

  play(): void {
    if (this.playerRef.current && !this.playerRef.current.isPlaying()) {
      this.playerRef.current.toggle();
    }
  }

  pause(): void {
    if (this.playerRef.current && this.playerRef.current.isPlaying()) {
      this.playerRef.current.toggle();
    }
  }

  toggle(): void {
    this.playerRef.current?.toggle();
  }
}
