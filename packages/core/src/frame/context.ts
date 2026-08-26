/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { FrameContext, ClipFrameInfo } from './types.js';
import type { FrameProvider } from './provider.js';
import type { FrameAPI } from './api.js';

export interface FrameContextState {
  getCurrentFrame(): number;
  getTotalFrames(): number;
  getFps(): number;
  getWidth(): number;
  getHeight(): number;
  getAllClips(): ReadonlyArray<{
    id: string;
    type?: string;
    offsetInTimeline: number;
    startFrame: number;
    durationInFrames: number;
    trackIndex: number;
  }>;
  getHiddenTracks(): ReadonlySet<number>;
}

function computeClipInfo(
  clip: { id: string; type?: string; offsetInTimeline: number; startFrame: number; durationInFrames: number },
  currentFrame: number,
  fps: number,
  provider: FrameProvider,
): ClipFrameInfo {
  const visible = currentFrame >= clip.offsetInTimeline && currentFrame < clip.offsetInTimeline + clip.durationInFrames;
  const localFrame = visible ? currentFrame - clip.offsetInTimeline : 0;
  const sourceFrame = clip.startFrame + localFrame;
  const dims = visible ? provider.getClipDimensions(clip.id) : null;

  return {
    clipId: clip.id,
    localFrame,
    sourceFrame,
    localTime: localFrame / fps,
    sourceTime: sourceFrame / fps,
    type: (clip.type as ClipFrameInfo['type']) ?? 'video',
    visible,
    sourceWidth: dims?.width,
    sourceHeight: dims?.height,
  };
}

export function createFrameContext(
  provider: FrameProvider,
  state: FrameContextState,
): FrameAPI {
  return {
    async getClipFrame(clipId: string, frame?: number): Promise<ImageBitmap | null> {
      if (!provider.available) return null;

      const currentFrame = frame ?? state.getCurrentFrame();
      const clips = state.getAllClips();
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return null;

      const localFrame = currentFrame - clip.offsetInTimeline;
      if (localFrame < 0 || localFrame >= clip.durationInFrames) return null;

      const sourceFrame = clip.startFrame + localFrame;
      return provider.getClipFrame(clipId, sourceFrame, state.getWidth(), state.getHeight());
    },

    getContext(): FrameContext {
      return {
        frame: state.getCurrentFrame(),
        time: state.getCurrentFrame() / state.getFps(),
        fps: state.getFps(),
        width: state.getWidth(),
        height: state.getHeight(),
        durationInFrames: state.getTotalFrames(),
      };
    },

    getClipInfo(clipId: string, frame?: number): ClipFrameInfo | null {
      const currentFrame = frame ?? state.getCurrentFrame();
      const fps = state.getFps();
      const clips = state.getAllClips();
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return null;
      return computeClipInfo(clip, currentFrame, fps, provider);
    },

    getVisibleClips(frame?: number): readonly ClipFrameInfo[] {
      const currentFrame = frame ?? state.getCurrentFrame();
      const fps = state.getFps();
      const hiddenTracks = state.getHiddenTracks();
      const clips = state.getAllClips();
      return clips
        .filter((clip) => !hiddenTracks.has(clip.trackIndex))
        .map((clip) => computeClipInfo(clip, currentFrame, fps, provider))
        .filter((info) => info.visible);
    },
  };
}
