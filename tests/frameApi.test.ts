/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mediaRegistry } from '@revideeo/player';
import { BrowserFrameProvider } from '../src/frame/browserProvider';
import { createFrameContext } from '@revideeo/core/frame';

describe('MediaRegistry', () => {
  beforeEach(() => {
    mediaRegistry.clear();
  });

  it('registers and retrieves a video element', () => {
    const video = document.createElement('video');
    mediaRegistry.register('c1', video);
    expect(mediaRegistry.get('c1')).toBe(video);
    expect(mediaRegistry.has('c1')).toBe(true);
  });

  it('registers and retrieves an image element', () => {
    const img = document.createElement('img');
    mediaRegistry.register('c2', img);
    expect(mediaRegistry.get('c2')).toBe(img);
  });

  it('unregisters an element', () => {
    const video = document.createElement('video');
    mediaRegistry.register('c1', video);
    mediaRegistry.unregister('c1');
    expect(mediaRegistry.has('c1')).toBe(false);
    expect(mediaRegistry.get('c1')).toBeUndefined();
  });

  it('clears all elements', () => {
    mediaRegistry.register('c1', document.createElement('video'));
    mediaRegistry.register('c2', document.createElement('img'));
    mediaRegistry.clear();
    expect(mediaRegistry.has('c1')).toBe(false);
    expect(mediaRegistry.has('c2')).toBe(false);
  });

  it('replaces element on re-registration', () => {
    const video1 = document.createElement('video');
    const video2 = document.createElement('video');
    mediaRegistry.register('c1', video1);
    mediaRegistry.register('c1', video2);
    expect(mediaRegistry.get('c1')).toBe(video2);
  });

  it('returns undefined for unknown clip', () => {
    expect(mediaRegistry.get('unknown')).toBeUndefined();
    expect(mediaRegistry.has('unknown')).toBe(false);
  });
});

describe('BrowserFrameProvider', () => {
  beforeEach(() => {
    mediaRegistry.clear();
  });

  it('is available', () => {
    const provider = new BrowserFrameProvider();
    expect(provider.available).toBe(true);
  });

  it('returns null for unregistered clip', async () => {
    const provider = new BrowserFrameProvider();
    const result = await provider.getClipFrame('unknown', 0, 1920, 1080);
    expect(result).toBeNull();
  });

  it('returns null for video without dimensions', async () => {
    const video = document.createElement('video');
    mediaRegistry.register('c1', video);

    const provider = new BrowserFrameProvider();
    const result = await provider.getClipFrame('c1', 0, 1920, 1080);
    expect(result).toBeNull();
  });

  it('returns null for image without dimensions', async () => {
    const img = document.createElement('img');
    mediaRegistry.register('c1', img);

    const provider = new BrowserFrameProvider();
    const result = await provider.getClipFrame('c1', 0, 1920, 1080);
    expect(result).toBeNull();
  });

  it('returns clip dimensions for video', () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { value: 1920, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 1080, configurable: true });
    mediaRegistry.register('c1', video);

    const provider = new BrowserFrameProvider();
    expect(provider.getClipDimensions('c1')).toEqual({ width: 1920, height: 1080 });
  });

  it('returns clip dimensions for image', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 640, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 480, configurable: true });
    mediaRegistry.register('c1', img);

    const provider = new BrowserFrameProvider();
    expect(provider.getClipDimensions('c1')).toEqual({ width: 640, height: 480 });
  });

  it('returns null dimensions for unregistered clip', () => {
    const provider = new BrowserFrameProvider();
    expect(provider.getClipDimensions('unknown')).toBeNull();
  });
});

describe('Frame API integration', () => {
  beforeEach(() => {
    mediaRegistry.clear();
  });

  it('full lifecycle: register → getClipFrame → unregister', async () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
    mediaRegistry.register('c1', video);

    const provider = new BrowserFrameProvider();
    const api = createFrameContext(provider, {
      getCurrentFrame: () => 30,
      getTotalFrames: () => 90,
      getFps: () => 30,
      getWidth: () => 1280,
      getHeight: () => 720,
      getAllClips: () => [
        { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
      ],
      getHiddenTracks: () => new Set(),
    });

    const ctx = api.getContext();
    expect(ctx.frame).toBe(30);
    expect(ctx.fps).toBe(30);

    const info = api.getClipInfo('c1');
    expect(info).not.toBeNull();
    expect(info!.visible).toBe(true);
    expect(info!.localFrame).toBe(30);
    expect(info!.sourceWidth).toBe(1280);
    expect(info!.sourceHeight).toBe(720);

    mediaRegistry.unregister('c1');
    expect(mediaRegistry.has('c1')).toBe(false);
  });

  it('clip replacement: old clip unregistered, new clip registered', async () => {
    const video1 = document.createElement('video');
    const video2 = document.createElement('video');
    Object.defineProperty(video1, 'videoWidth', { value: 640, configurable: true });
    Object.defineProperty(video1, 'videoHeight', { value: 480, configurable: true });
    Object.defineProperty(video2, 'videoWidth', { value: 1920, configurable: true });
    Object.defineProperty(video2, 'videoHeight', { value: 1080, configurable: true });

    mediaRegistry.register('c1', video1);
    expect(mediaRegistry.get('c1')).toBe(video1);

    mediaRegistry.register('c1', video2);
    expect(mediaRegistry.get('c1')).toBe(video2);
  });

  it('stale reference: unregister removes access', async () => {
    const video = document.createElement('video');
    mediaRegistry.register('c1', video);
    mediaRegistry.unregister('c1');
    expect(mediaRegistry.get('c1')).toBeUndefined();
  });

  it('getVisibleClips excludes clips on hidden tracks', async () => {
    const provider = new BrowserFrameProvider();
    const api = createFrameContext(provider, {
      getCurrentFrame: () => 10,
      getTotalFrames: () => 90,
      getFps: () => 30,
      getWidth: () => 1280,
      getHeight: () => 720,
      getAllClips: () => [
        { id: 'c1', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
        { id: 'c2', type: 'video', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 1 },
      ],
      getHiddenTracks: () => new Set([1]),
    });

    const visible = api.getVisibleClips();
    expect(visible).toHaveLength(1);
    expect(visible[0].clipId).toBe('c1');
  });

  it('getClipFrame returns null for text clips', async () => {
    const provider = new BrowserFrameProvider();
    const api = createFrameContext(provider, {
      getCurrentFrame: () => 0,
      getTotalFrames: () => 90,
      getFps: () => 30,
      getWidth: () => 1280,
      getHeight: () => 720,
      getAllClips: () => [
        { id: 't1', type: 'text', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
      ],
      getHiddenTracks: () => new Set(),
    });

    const result = await api.getClipFrame('t1');
    expect(result).toBeNull();
  });

  it('getClipFrame returns null for audio clips', async () => {
    const provider = new BrowserFrameProvider();
    const api = createFrameContext(provider, {
      getCurrentFrame: () => 0,
      getTotalFrames: () => 90,
      getFps: () => 30,
      getWidth: () => 1280,
      getHeight: () => 720,
      getAllClips: () => [
        { id: 'a1', type: 'audio', offsetInTimeline: 0, startFrame: 0, durationInFrames: 60, trackIndex: 0 },
      ],
      getHiddenTracks: () => new Set(),
    });

    const result = await api.getClipFrame('a1');
    expect(result).toBeNull();
  });
});
