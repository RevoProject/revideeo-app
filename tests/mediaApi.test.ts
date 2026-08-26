/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { describe, it, expect } from 'vitest';
import { AppMediaProvider } from '../src/media/appMediaProvider';
import { createMediaContext } from '@revideeo/core/media';
import type { MediaAsset } from '../src/editor/editorTypes';

function makeAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    sourceId: 'a1',
    name: 'test.mp4',
    durationInFrames: 300,
    blob: new Blob(['video-data'], { type: 'video/mp4' }),
    ...overrides,
  };
}

describe('AppMediaProvider', () => {
  it('converts video asset to MediaInfo', () => {
    const asset = makeAsset({ blob: new Blob(['data'], { type: 'video/mp4' }) });
    const provider = new AppMediaProvider(() => [asset]);
    const info = provider.getById('a1');
    expect(info).not.toBeNull();
    expect(info!.kind).toBe('video');
    expect(info!.name).toBe('test.mp4');
  });

  it('converts audio asset to MediaInfo', () => {
    const asset = makeAsset({ sourceId: 'a2', name: 'track.wav', blob: new Blob(['data'], { type: 'audio/wav' }) });
    const provider = new AppMediaProvider(() => [asset]);
    const info = provider.getById('a2');
    expect(info!.kind).toBe('audio');
  });

  it('converts image asset to MediaInfo', () => {
    const asset = makeAsset({ sourceId: 'a3', name: 'photo.jpg', blob: new Blob(['data'], { type: 'image/jpeg' }) });
    const provider = new AppMediaProvider(() => [asset]);
    const info = provider.getById('a3');
    expect(info!.kind).toBe('image');
  });

  it('returns null for unknown id', () => {
    const provider = new AppMediaProvider(() => []);
    expect(provider.getById('unknown')).toBeNull();
  });

  it('returns all assets', () => {
    const assets = [
      makeAsset({ sourceId: 'v1', blob: new Blob(['v'], { type: 'video/mp4' }) }),
      makeAsset({ sourceId: 'a1', name: 'audio.wav', blob: new Blob(['a'], { type: 'audio/wav' }) }),
    ];
    const provider = new AppMediaProvider(() => assets);
    expect(provider.getAll()).toHaveLength(2);
  });

  it('reflects dynamic asset changes', () => {
    let assets: MediaAsset[] = [makeAsset({ sourceId: 'v1' })];
    const provider = new AppMediaProvider(() => assets);
    expect(provider.getAll()).toHaveLength(1);

    assets = [...assets, makeAsset({ sourceId: 'v2', name: 'second.mp4' })];
    expect(provider.getAll()).toHaveLength(2);

    assets = assets.filter((a) => a.sourceId !== 'v1');
    expect(provider.getAll()).toHaveLength(1);
    expect(provider.getById('v1')).toBeNull();
  });

  it('reports loaded status based on blob size', () => {
    const loaded = makeAsset({ blob: new Blob(['data'], { type: 'video/mp4' }) });
    const empty = makeAsset({ sourceId: 'empty', blob: new Blob([], { type: 'video/mp4' }) });
    const provider = new AppMediaProvider(() => [loaded, empty]);
    expect(provider.getById('a1')!.loaded).toBe(true);
    expect(provider.getById('empty')!.loaded).toBe(false);
  });

  it('includes first thumbnail when available', () => {
    const asset = makeAsset({ thumbnails: ['thumb1.jpg', 'thumb2.jpg'] });
    const provider = new AppMediaProvider(() => [asset]);
    expect(provider.getById('a1')!.thumbnail).toBe('thumb1.jpg');
  });

  it('thumbnail is undefined when no thumbnails', () => {
    const asset = makeAsset({ thumbnails: undefined });
    const provider = new AppMediaProvider(() => [asset]);
    expect(provider.getById('a1')!.thumbnail).toBeUndefined();
  });
});

describe('Media API integration', () => {
  it('full flow: create provider → create context → get/list', () => {
    const assets = [
      makeAsset({ sourceId: 'v1', name: 'clip.mp4', blob: new Blob(['v'], { type: 'video/mp4' }), durationInFrames: 300 }),
      makeAsset({ sourceId: 'a1', name: 'track.wav', blob: new Blob(['a'], { type: 'audio/wav' }), durationInFrames: 150 }),
    ];
    const provider = new AppMediaProvider(() => assets);
    const api = createMediaContext(provider);

    const list = api.list();
    expect(list).toHaveLength(2);
    expect(list[0].kind).toBe('video');
    expect(list[1].kind).toBe('audio');

    const v1 = api.get('v1');
    expect(v1).not.toBeNull();
    expect(v1!.name).toBe('clip.mp4');
    expect(v1!.durationInFrames).toBe(300);
  });

  it('permission enforcement: media API is undefined without media:read', () => {
    const context = { media: undefined };
    expect(context.media).toBeUndefined();
  });
});
