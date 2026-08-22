import { describe, expect, it } from 'vitest';
import { computeClipStyle } from '../src/clipStyle.js';
import type { PlayerClip, OutgoingTransition } from '../src/types.js';

const makeClip = (overrides: Partial<PlayerClip> = {}): PlayerClip => ({
  id: 'c1',
  type: 'video',
  sourceId: 'a1',
  trackIndex: 0,
  offsetInTimeline: 0,
  startFrame: 0,
  durationInFrames: 60,
  scale: 1,
  posX: 0,
  posY: 0,
  transitionIn: 'none',
  transitionDurationInFrames: 0,
  ...overrides,
});

describe('computeClipStyle', () => {
  it('returns full opacity for none transition', () => {
    const clip = makeClip({ transitionIn: 'none' });
    const style = computeClipStyle(clip, undefined, 10);
    expect(style.opacity).toBe(1);
  });

  it('fade: opacity at frame 0 is 0', () => {
    const clip = makeClip({ transitionIn: 'fade', transitionDurationInFrames: 10 });
    const style = computeClipStyle(clip, undefined, 0);
    expect(style.opacity).toBe(0);
  });

  it('fade: opacity at frame 10 is 1', () => {
    const clip = makeClip({ transitionIn: 'fade', transitionDurationInFrames: 10 });
    const style = computeClipStyle(clip, undefined, 10);
    expect(style.opacity).toBe(1);
  });

  it('fade: opacity at frame 5 is 0.5', () => {
    const clip = makeClip({ transitionIn: 'fade', transitionDurationInFrames: 10 });
    const style = computeClipStyle(clip, undefined, 5);
    expect(style.opacity).toBeCloseTo(0.5);
  });

  it('slide: translates from right at start', () => {
    const clip = makeClip({ transitionIn: 'slide', transitionDurationInFrames: 10 });
    const style = computeClipStyle(clip, undefined, 0);
    expect(style.transform).toContain('translateX(100%)');
  });

  it('slide: at center at end', () => {
    const clip = makeClip({ transitionIn: 'slide', transitionDurationInFrames: 10 });
    const style = computeClipStyle(clip, undefined, 10);
    expect(style.transform).toContain('translateX(0%)');
  });

  it('wipe: clipPathRaw goes from 100 to 0', () => {
    const clip = makeClip({ transitionIn: 'wipe', transitionDurationInFrames: 10 });
    const start = computeClipStyle(clip, undefined, 0);
    expect(start.clipPath).toContain('100%');
    const end = computeClipStyle(clip, undefined, 10);
    expect(end.clipPath).toContain('0%');
  });

  it('cross-zoom: starts larger, fades in', () => {
    const clip = makeClip({ transitionIn: 'cross-zoom', transitionDurationInFrames: 10 });
    const start = computeClipStyle(clip, undefined, 0);
    expect(start.opacity).toBe(0);
    expect(start.transform).toContain('scale(');
    const end = computeClipStyle(clip, undefined, 10);
    expect(end.opacity).toBe(1);
  });

  it('dreamy-zoom: scales up and blurs at start', () => {
    const clip = makeClip({ transitionIn: 'dreamy-zoom', transitionDurationInFrames: 10 });
    const start = computeClipStyle(clip, undefined, 0);
    expect(start.filter).toContain('blur(');
    expect(start.opacity).toBeLessThanOrEqual(1);
    const end = computeClipStyle(clip, undefined, 10);
    expect(end.filter).toBeUndefined();
  });

  it('linear-blur: starts blurry, ends sharp', () => {
    const clip = makeClip({ transitionIn: 'linear-blur', transitionDurationInFrames: 10 });
    const start = computeClipStyle(clip, undefined, 0);
    expect(start.filter).toContain('blur(');
    expect(start.opacity).toBeLessThan(1);
    const end = computeClipStyle(clip, undefined, 10);
    expect(end.filter).toBeUndefined();
    expect(end.opacity).toBe(1);
  });

  it('film-burn: starts brighter, scales down', () => {
    const clip = makeClip({ transitionIn: 'film-burn', transitionDurationInFrames: 10 });
    const start = computeClipStyle(clip, undefined, 0);
    expect(start.opacity).toBeLessThan(1);
    const end = computeClipStyle(clip, undefined, 10);
    expect(end.opacity).toBe(1);
  });

  it('push: translates from right', () => {
    const clip = makeClip({ transitionIn: 'push', transitionDurationInFrames: 10 });
    const start = computeClipStyle(clip, undefined, 0);
    expect(start.transform).toContain('translateX(100%)');
    const end = computeClipStyle(clip, undefined, 10);
    expect(end.transform).toContain('translateX(0%)');
  });

  it('applies clipScale to output', () => {
    const clip = makeClip({ scale: 2 });
    const style = computeClipStyle(clip, undefined, 30);
    expect(style.transform).toContain('scale(2)');
  });

  it('applies fadeIn', () => {
    const clip = makeClip({ fadeInFrames: 10 });
    const start = computeClipStyle(clip, undefined, 0);
    expect(start.opacity).toBe(0);
    const end = computeClipStyle(clip, undefined, 10);
    expect(end.opacity).toBe(1);
  });

  it('applies fadeOut', () => {
    const clip = makeClip({ durationInFrames: 30, fadeOutFrames: 10 });
    const mid = computeClipStyle(clip, undefined, 15);
    expect(mid.opacity).toBe(1);
    const end = computeClipStyle(clip, undefined, 30);
    expect(end.opacity).toBe(0);
  });

  it('applies outgoing fade when next clip has fade transition', () => {
    const c1 = makeClip({ id: 'c1', durationInFrames: 30, transitionIn: 'none', transitionDurationInFrames: 0 });
    const outgoing: OutgoingTransition = { transitionIn: 'fade', durationInFrames: 10 };
    const state = computeClipStyle(c1, outgoing, 25);
    expect(state.opacity).toBeLessThan(1);
  });

  it('applies crop when crop values are set', () => {
    const clip = makeClip({ cropLeft: 10, cropRight: 10 });
    const style = computeClipStyle(clip, undefined, 30);
    expect(style.clipPath).toContain('inset(');
    expect(style.clipPath).toContain('10%');
  });

  it('no crop when all crop values are 0', () => {
    const clip = makeClip({ cropLeft: 0, cropRight: 0, cropTop: 0, cropBottom: 0 });
    const style = computeClipStyle(clip, undefined, 30);
    expect(style.clipPath).toBeUndefined();
  });

  it('applies borderRadius', () => {
    const clip = makeClip({ borderRadius: 12 });
    const style = computeClipStyle(clip, undefined, 30);
    expect(style.borderRadius).toBe('12px');
  });

  it('applies custom width and height', () => {
    const clip = makeClip({ width: 50, height: 80 });
    const style = computeClipStyle(clip, undefined, 30);
    expect(style.width).toBe('50%');
    expect(style.height).toBe('80%');
  });

  it('applies rotation', () => {
    const clip = makeClip({ rotation: 45 });
    const style = computeClipStyle(clip, undefined, 30);
    expect(style.transform).toContain('rotate(45deg)');
  });

  it('applies posX and posY', () => {
    const clip = makeClip({ posX: 100, posY: 50 });
    const style = computeClipStyle(clip, undefined, 30);
    expect(style.transform).toContain('translateX(100px)');
    expect(style.transform).toContain('translateY(50px)');
  });
});
