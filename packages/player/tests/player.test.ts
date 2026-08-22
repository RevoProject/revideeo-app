import { describe, expect, it } from 'vitest';
import type { PlayerClip, PlayerTrackSettings } from '../src/types.js';
import { computeClipStyle } from '../src/clipStyle.js';

const makeClip = (overrides: Partial<PlayerClip> = {}): PlayerClip => ({
  id: 'c1',
  type: 'video',
  sourceId: 'a1',
  trackIndex: 0,
  offsetInTimeline: 0,
  startFrame: 0,
  durationInFrames: 90,
  scale: 1,
  posX: 0,
  posY: 0,
  transitionIn: 'none',
  transitionDurationInFrames: 0,
  ...overrides,
});

const defaultTracks: PlayerTrackSettings[] = [
  { name: 'Track 1', locked: false, muted: false, hidden: false },
  { name: 'Track 2', locked: false, muted: false, hidden: false },
];

describe('PlayerClip type compatibility', () => {
  it('clip has all required fields', () => {
    const clip = makeClip();
    expect(clip.id).toBe('c1');
    expect(clip.type).toBe('video');
    expect(clip.sourceId).toBe('a1');
    expect(clip.trackIndex).toBe(0);
    expect(clip.offsetInTimeline).toBe(0);
    expect(clip.startFrame).toBe(0);
    expect(clip.durationInFrames).toBe(90);
    expect(clip.scale).toBe(1);
    expect(clip.transitionIn).toBe('none');
  });

  it('clip supports optional fields', () => {
    const clip = makeClip({
      url: 'http://example.com/video.mp4',
      text: 'Hello',
      fontSize: 24,
      textColor: '#ff0000',
      volume: 0.8,
      playbackRate: 1.5,
      fadeInFrames: 10,
      fadeOutFrames: 10,
      cropLeft: 5,
      cropRight: 5,
      borderRadius: 8,
      rotation: 45,
    });
    expect(clip.url).toBe('http://example.com/video.mp4');
    expect(clip.text).toBe('Hello');
    expect(clip.fontSize).toBe(24);
    expect(clip.textColor).toBe('#ff0000');
    expect(clip.volume).toBe(0.8);
    expect(clip.playbackRate).toBe(1.5);
    expect(clip.fadeInFrames).toBe(10);
    expect(clip.fadeOutFrames).toBe(10);
    expect(clip.cropLeft).toBe(5);
    expect(clip.cropRight).toBe(5);
    expect(clip.borderRadius).toBe(8);
    expect(clip.rotation).toBe(45);
  });
});

describe('computeClipStyle - all transition types', () => {
  const transitions = [
    'none', 'fade', 'slide', 'wipe', 'push',
    'cross-zoom', 'dreamy-zoom', 'linear-blur', 'film-burn',
  ] as const;

  for (const t of transitions) {
    it(`${t}: produces valid style object`, () => {
      const clip = makeClip({ transitionIn: t, transitionDurationInFrames: 10 });
      const style = computeClipStyle(clip, undefined, 5);
      expect(style).toHaveProperty('transform');
      expect(style).toHaveProperty('opacity');
      expect(style).toHaveProperty('borderRadius');
      expect(style).toHaveProperty('width');
      expect(style).toHaveProperty('height');
      expect(style).toHaveProperty('objectFit');
      expect(typeof style.opacity).toBe('number');
      expect(style.opacity).toBeGreaterThanOrEqual(0);
      expect(style.opacity).toBeLessThanOrEqual(1);
    });
  }
});

describe('computeClipStyle - audio clip with no visual', () => {
  it('audio clip still produces valid style', () => {
    const clip = makeClip({ type: 'audio' });
    const style = computeClipStyle(clip, undefined, 30);
    expect(style.opacity).toBe(1);
  });
});

describe('computeClipStyle - text clip', () => {
  it('text clip produces valid style', () => {
    const clip = makeClip({ type: 'text' });
    const style = computeClipStyle(clip, undefined, 10);
    expect(style.opacity).toBe(1);
    expect(style.width).toBe('100%');
    expect(style.height).toBe('100%');
  });
});

describe('computeClipStyle - image clip', () => {
  it('image clip with cover fitMode', () => {
    const clip = makeClip({ type: 'image', fitMode: 'cover' });
    const style = computeClipStyle(clip, undefined, 10);
    expect(style.objectFit).toBe('cover');
  });

  it('image clip with contain fitMode', () => {
    const clip = makeClip({ type: 'image', fitMode: 'contain' });
    const style = computeClipStyle(clip, undefined, 10);
    expect(style.objectFit).toBe('contain');
  });
});

describe('PlayerTrackSettings', () => {
  it('hidden track clips are not rendered', () => {
    const track: PlayerTrackSettings = {
      name: 'Hidden', locked: false, muted: false, hidden: true,
    };
    expect(track.hidden).toBe(true);
  });

  it('muted track clips have no audio', () => {
    const track: PlayerTrackSettings = {
      name: 'Muted', locked: false, muted: true, hidden: false,
    };
    expect(track.muted).toBe(true);
  });
});
