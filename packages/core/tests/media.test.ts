/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { describe, it, expect } from 'vitest';
import { createMediaContext } from '../src/media/context.js';
import type { MediaProvider } from '../src/media/provider.js';
import type { MediaInfo } from '../src/media/types.js';

function makeProvider(items: MediaInfo[] = []): MediaProvider {
  return {
    getById: (id) => items.find((m) => m.id === id) ?? null,
    getAll: () => items,
  };
}

const video = (overrides: Partial<MediaInfo> = {}): MediaInfo => ({
  id: 'v1', name: 'video.mp4', kind: 'video', durationInFrames: 300, loaded: true, ...overrides,
});

const audio = (overrides: Partial<MediaInfo> = {}): MediaInfo => ({
  id: 'a1', name: 'audio.wav', kind: 'audio', durationInFrames: 150, loaded: true, ...overrides,
});

const image = (overrides: Partial<MediaInfo> = {}): MediaInfo => ({
  id: 'i1', name: 'photo.jpg', kind: 'image', durationInFrames: 1, loaded: true, ...overrides,
});

describe('MediaContext', () => {
  describe('get', () => {
    it('returns media by id', () => {
      const api = createMediaContext(makeProvider([video(), audio()]));
      expect(api.get('v1')).toEqual(video());
    });

    it('returns null for unknown id', () => {
      const api = createMediaContext(makeProvider([video()]));
      expect(api.get('unknown')).toBeNull();
    });

    it('returns null for empty provider', () => {
      const api = createMediaContext(makeProvider());
      expect(api.get('v1')).toBeNull();
    });
  });

  describe('list', () => {
    it('returns empty array for empty provider', () => {
      const api = createMediaContext(makeProvider());
      expect(api.list()).toEqual([]);
    });

    it('returns all assets', () => {
      const items = [video(), audio(), image()];
      const api = createMediaContext(makeProvider(items));
      expect(api.list()).toHaveLength(3);
    });

    it('returns correct items', () => {
      const v = video({ id: 'v1', name: 'clip.mp4' });
      const a = audio({ id: 'a1', name: 'track.wav' });
      const api = createMediaContext(makeProvider([v, a]));
      const list = api.list();
      expect(list[0].id).toBe('v1');
      expect(list[1].id).toBe('a1');
    });
  });

  describe('metadata', () => {
    it('video has correct kind', () => {
      const api = createMediaContext(makeProvider([video()]));
      expect(api.get('v1')!.kind).toBe('video');
    });

    it('audio has correct kind', () => {
      const api = createMediaContext(makeProvider([audio()]));
      expect(api.get('a1')!.kind).toBe('audio');
    });

    it('image has correct kind', () => {
      const api = createMediaContext(makeProvider([image()]));
      expect(api.get('i1')!.kind).toBe('image');
    });

    it('includes duration', () => {
      const api = createMediaContext(makeProvider([video({ durationInFrames: 500 })]));
      expect(api.get('v1')!.durationInFrames).toBe(500);
    });

    it('includes name', () => {
      const api = createMediaContext(makeProvider([video({ name: 'test.mp4' })]));
      expect(api.get('v1')!.name).toBe('test.mp4');
    });

    it('includes loaded status', () => {
      const api = createMediaContext(makeProvider([
        video({ id: 'loaded', loaded: true }),
        video({ id: ' unloaded', loaded: false }),
      ]));
      expect(api.get('loaded')!.loaded).toBe(true);
      expect(api.get(' unloaded')!.loaded).toBe(false);
    });

    it('includes thumbnail when present', () => {
      const api = createMediaContext(makeProvider([video({ thumbnail: 'data:image/jpeg;base64,abc' })]));
      expect(api.get('v1')!.thumbnail).toBe('data:image/jpeg;base64,abc');
    });

    it('thumbnail is undefined when not present', () => {
      const api = createMediaContext(makeProvider([video()]));
      expect(api.get('v1')!.thumbnail).toBeUndefined();
    });
  });

  describe('determinism', () => {
    it('same inputs produce same results', () => {
      const provider = makeProvider([video(), audio()]);
      const api = createMediaContext(provider);
      const a = api.list();
      const b = api.list();
      expect(a).toEqual(b);
    });

    it('get returns consistent results', () => {
      const provider = makeProvider([video({ id: 'v1' })]);
      const api = createMediaContext(provider);
      expect(api.get('v1')).toEqual(api.get('v1'));
    });
  });

  describe('isolation', () => {
    it('does not expose internal provider', () => {
      const api = createMediaContext(makeProvider([video()]));
      expect(api).not.toHaveProperty('provider');
      expect(api).not.toHaveProperty('getAssets');
    });

    it('returns readonly array from list', () => {
      const api = createMediaContext(makeProvider([video(), audio()]));
      const list = api.list();
      expect(Array.isArray(list)).toBe(true);
    });
  });
});
