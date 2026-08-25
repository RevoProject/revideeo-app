import { describe, expect, it } from 'vitest';
import { getClipStyle } from '../src/editor/composition/transitionStyles';
import { computeClipStyle } from '../packages/player/src/clipStyle';
import type { RenderClip } from '../src/editor/editorTypes';

const clip = (transitionIn: RenderClip['transitionIn']): RenderClip => ({
  id: 'clip', sourceId: 'asset', startFrame: 0, durationInFrames: 30, scale: 1, posX: 0,
  offsetInTimeline: 0, transitionIn, transitionDurationInFrames: 10, trackIndex: 0,
});

const playerClip = (transitionIn: RenderClip['transitionIn']): Parameters<typeof computeClipStyle>[0] => ({
  id: 'clip', sourceId: 'asset', startFrame: 0, durationInFrames: 30, scale: 1, posX: 0,
  offsetInTimeline: 0, transitionIn, transitionDurationInFrames: 10, trackIndex: 0,
});

describe('transition styles', () => {
  it('fades an incoming clip from transparent to visible', () => {
    expect(getClipStyle(clip('fade'), undefined, 0).opacity).toBe(0);
    expect(getClipStyle(clip('fade'), undefined, 10).opacity).toBe(1);
  });

  it('fades out the previous clip during an overlap', () => {
    const style = getClipStyle(clip('none'), { transitionIn: 'fade', durationInFrames: 10 }, 25);
    expect(style.opacity).toBe(0.5);
  });
});

describe('A → B boundary produces exactly one transition', () => {
  const fps = 30;
  const transitionDuration = 15;

  it('fade: clip A opacity is monotonically decreasing during outgoing', () => {
    const a = { ...clip('none'), durationInFrames: 90 };
    const outgoing = { transitionIn: 'fade' as const, durationInFrames: transitionDuration };

    const opacities: number[] = [];
    for (let f = 75; f <= 89; f++) {
      opacities.push(getClipStyle(a, outgoing, f).opacity as number);
    }

    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]).toBeLessThanOrEqual(opacities[i - 1]);
    }
  });

  it('fade: clip B opacity is monotonically increasing during incoming', () => {
    const b = { ...clip('fade'), transitionDurationInFrames: transitionDuration };

    const opacities: number[] = [];
    for (let f = 0; f < transitionDuration; f++) {
      opacities.push(getClipStyle(b, undefined, f).opacity as number);
    }

    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]).toBeGreaterThanOrEqual(opacities[i - 1]);
    }
  });
});

describe('A → B → C produces at most 2 transitions', () => {
  const transitionDuration = 15;

  it('A/B boundary: exactly one crossfade', () => {
    const a = { ...clip('none'), durationInFrames: 90 };
    const outgoing = { transitionIn: 'fade' as const, durationInFrames: transitionDuration };
    const aOpacities: number[] = [];
    for (let f = 75; f <= 89; f++) {
      aOpacities.push(getClipStyle(a, outgoing, f).opacity as number);
    }
    const b = { ...clip('fade'), durationInFrames: 90, offsetInTimeline: 75, transitionDurationInFrames: transitionDuration };
    const bOpacities: number[] = [];
    for (let f = 0; f < transitionDuration; f++) {
      bOpacities.push(getClipStyle(b, undefined, f).opacity as number);
    }
    expect(aOpacities[0]).toBe(1);
    expect(aOpacities[aOpacities.length - 1]).toBeLessThan(0.1);
    expect(bOpacities[0]).toBe(0);
    expect(bOpacities[bOpacities.length - 1]).toBeGreaterThan(0.9);
  });

  it('B/C boundary: exactly one crossfade', () => {
    const b = { ...clip('none'), durationInFrames: 90, offsetInTimeline: 0 };
    const outgoing = { transitionIn: 'fade' as const, durationInFrames: transitionDuration };
    const bOpacities: number[] = [];
    for (let f = 75; f <= 89; f++) {
      bOpacities.push(getClipStyle(b, outgoing, f).opacity as number);
    }
    const c = { ...clip('fade'), durationInFrames: 90, offsetInTimeline: 75, transitionDurationInFrames: transitionDuration };
    const cOpacities: number[] = [];
    for (let f = 0; f < transitionDuration; f++) {
      cOpacities.push(getClipStyle(c, undefined, f).opacity as number);
    }
    expect(bOpacities[0]).toBe(1);
    expect(bOpacities[bOpacities.length - 1]).toBeLessThan(0.1);
    expect(cOpacities[0]).toBe(0);
    expect(cOpacities[cOpacities.length - 1]).toBeGreaterThan(0.9);
  });
});

describe('default fade transition: exactly 15 frames at intended boundary', () => {
  const transitionDuration = 15;

  it('fade-in from frame 0 to frame 14 then fully visible', () => {
    const b = { ...clip('fade'), transitionDurationInFrames: transitionDuration };
    expect(getClipStyle(b, undefined, 0).opacity).toBe(0);
    expect(getClipStyle(b, undefined, 7).opacity).toBeCloseTo(0.5, 1);
    expect(getClipStyle(b, undefined, 14).opacity).toBeCloseTo(14 / 15, 2);
    expect(getClipStyle(b, undefined, 15).opacity).toBe(1);
  });

  it('fade-out from frame 75 to frame 89 then fully transparent', () => {
    const a = { ...clip('none'), durationInFrames: 90 };
    const outgoing = { transitionIn: 'fade' as const, durationInFrames: transitionDuration };
    expect(getClipStyle(a, outgoing, 75).opacity).toBe(1);
    expect(getClipStyle(a, outgoing, 82).opacity).toBeCloseTo(1 - 7 / 15, 2);
    expect(getClipStyle(a, outgoing, 89).opacity).toBeCloseTo(1 - 14 / 15, 2);
  });
});

describe('short clip with both incoming and outgoing: no flashing', () => {
  const transitionDuration = 15;

  it('opacity is monotonic when clip duration equals transition duration', () => {
    const clipDuration = transitionDuration;
    const c = { ...clip('fade'), durationInFrames: clipDuration, transitionDurationInFrames: transitionDuration };
    const outgoing = { transitionIn: 'fade' as const, durationInFrames: transitionDuration };

    const opacities: number[] = [];
    for (let f = 0; f < clipDuration; f++) {
      opacities.push(getClipStyle(c, outgoing, f).opacity as number);
    }

    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]).toBeGreaterThanOrEqual(opacities[i - 1]);
    }
  });

  it('opacity has exactly one peak when clip duration is 2x transition duration', () => {
    const clipDuration = 2 * transitionDuration;
    const c = { ...clip('fade'), durationInFrames: clipDuration, transitionDurationInFrames: transitionDuration };
    const outgoing = { transitionIn: 'fade' as const, durationInFrames: transitionDuration };

    const opacities: number[] = [];
    for (let f = 0; f < clipDuration; f++) {
      opacities.push(getClipStyle(c, outgoing, f).opacity as number);
    }

    const peakIdx = opacities.indexOf(Math.max(...opacities));
    for (let i = 0; i < peakIdx; i++) {
      expect(opacities[i + 1]).toBeGreaterThanOrEqual(opacities[i]);
    }
    for (let i = peakIdx; i < opacities.length - 1; i++) {
      expect(opacities[i + 1]).toBeLessThanOrEqual(opacities[i]);
    }
  });
});

describe('preview and export use same transition representation', () => {
  const transitionDuration = 15;

  it('getClipStyle and computeClipStyle produce identical opacity for fade crossfade', () => {
    const renderClip = { ...clip('fade'), durationInFrames: 90, transitionDurationInFrames: transitionDuration };
    const playerClipData = { ...playerClip('fade'), durationInFrames: 90, transitionDurationInFrames: transitionDuration };
    const outgoing = { transitionIn: 'fade' as const, durationInFrames: transitionDuration };

    for (let f = 0; f <= 90; f += 3) {
      const renderOpacity = (getClipStyle(renderClip, outgoing, f).opacity as number);
      const playerOpacity = (computeClipStyle(playerClipData, outgoing, f).opacity as number);
      expect(renderOpacity).toBeCloseTo(playerOpacity, 10);
    }
  });

  it('getClipStyle and computeClipStyle produce identical opacity for outgoing fade', () => {
    const a = { ...clip('none'), durationInFrames: 90 };
    const aPlayer = { ...playerClip('none'), durationInFrames: 90 };
    const outgoing = { transitionIn: 'fade' as const, durationInFrames: transitionDuration };

    for (let f = 0; f <= 90; f += 3) {
      const renderOpacity = (getClipStyle(a, outgoing, f).opacity as number);
      const playerOpacity = (computeClipStyle(aPlayer, outgoing, f).opacity as number);
      expect(renderOpacity).toBeCloseTo(playerOpacity, 10);
    }
  });
});
