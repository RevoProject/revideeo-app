import { describe, expect, it } from 'vitest';
import { getClipStyle } from '../src/editor/composition/transitionStyles';
import { computeClipStyle } from '../packages/player/src/clipStyle';
import { hasFrameDependentEffects } from '../src/editor/composition/ClipLayer';
import type { OutgoingTransition, RenderClip } from '../src/editor/editorTypes';

const baseClip: RenderClip = {
  id: 'clip', sourceId: 'asset', startFrame: 0, durationInFrames: 100, scale: 1, posX: 0,
  posY: 0, offsetInTimeline: 0, transitionIn: 'none', transitionDurationInFrames: 0, trackIndex: 0,
};

const basePlayerClip = {
  id: 'clip', sourceId: 'asset', startFrame: 0, durationInFrames: 100, scale: 1, posX: 0,
  posY: 0, offsetInTimeline: 0, transitionIn: 'none' as const, transitionDurationInFrames: 0, trackIndex: 0,
};

describe('render stability: getClipStyle returns identical output for static clips across frames', () => {
  it('single static clip with no transitions, no fades, no outgoing — all frames produce same style', () => {
    const staticClip: RenderClip = { ...baseClip };
    const reference = getClipStyle(staticClip, undefined, 0);

    for (let frame = 0; frame <= 200; frame++) {
      const style = getClipStyle(staticClip, undefined, frame);
      expect(style.transform).toBe(reference.transform);
      expect(style.opacity).toBe(reference.opacity);
      expect(style.width).toBe(reference.width);
      expect(style.height).toBe(reference.height);
      expect(style.objectFit).toBe(reference.objectFit);
      expect(style.clipPath).toBe(reference.clipPath);
      expect(style.filter).toBe(reference.filter);
      expect(style.borderRadius).toBe(reference.borderRadius);
      expect(style.transformOrigin).toBe(reference.transformOrigin);
    }
  });

  it('static clip with custom scale/position — style is frame-invariant', () => {
    const scaled: RenderClip = { ...baseClip, scale: 1.5, posX: 42, posY: -10, rotation: 5, opacity: 0.8 };
    const reference = getClipStyle(scaled, undefined, 0);

    for (let frame = 0; frame <= 150; frame++) {
      const style = getClipStyle(scaled, undefined, frame);
      expect(style.transform).toBe(reference.transform);
      expect(style.opacity).toBe(reference.opacity);
    }
  });

  it('static clip with crop — style is frame-invariant', () => {
    const cropped: RenderClip = { ...baseClip, cropTop: 5, cropLeft: 10, cropRight: 3, cropBottom: 7 };
    const reference = getClipStyle(cropped, undefined, 0);

    for (let frame = 0; frame <= 100; frame++) {
      const style = getClipStyle(cropped, undefined, frame);
      expect(style.transform).toBe(reference.transform);
      expect(style.clipPath).toBe(reference.clipPath);
      expect(style.opacity).toBe(reference.opacity);
    }
  });

  it('clip with outgoing transition = none — style is frame-invariant', () => {
    const clipA: RenderClip = { ...baseClip, durationInFrames: 90 };
    const outgoingNone: OutgoingTransition = { transitionIn: 'none', durationInFrames: 15 };
    const reference = getClipStyle(clipA, outgoingNone, 0);

    for (let frame = 0; frame <= 100; frame++) {
      const style = getClipStyle(clipA, outgoingNone, frame);
      expect(style.transform).toBe(reference.transform);
      expect(style.opacity).toBe(reference.opacity);
    }
  });

  it('style values are deep-equal (not just close) across 100 consecutive frames', () => {
    const clip2: RenderClip = { ...baseClip, scale: 2, posX: 100, posY: 50, rotation: 45, opacity: 0.7 };
    const frames: ReturnType<typeof getClipStyle>[] = [];
    for (let f = 0; f < 100; f++) {
      frames.push(getClipStyle(clip2, undefined, f));
    }
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i]).toEqual(frames[0]);
    }
  });
});

describe('render stability: computeClipStyle (player) matches getClipStyle (export)', () => {
  it('static clip — player and export produce identical styles across 100 frames', () => {
    for (let f = 0; f < 100; f++) {
      const renderStyle = getClipStyle(baseClip, undefined, f);
      const playerStyle = computeClipStyle(basePlayerClip, undefined, f);
      expect(renderStyle.transform).toBe(playerStyle.transform);
      expect(renderStyle.opacity).toBeCloseTo(playerStyle.opacity, 10);
      expect(renderStyle.width).toBe(playerStyle.width);
      expect(renderStyle.height).toBe(playerStyle.height);
      expect(renderStyle.objectFit).toBe(playerStyle.objectFit);
    }
  });

  it('clip with fade transition — player and export produce identical styles', () => {
    const fadeClip: RenderClip = { ...baseClip, transitionIn: 'fade', transitionDurationInFrames: 15 };
    const playerFadeClip = { ...basePlayerClip, transitionIn: 'fade' as const, transitionDurationInFrames: 15 };

    for (let f = 0; f <= 30; f++) {
      const renderStyle = getClipStyle(fadeClip, undefined, f);
      const playerStyle = computeClipStyle(playerFadeClip, undefined, f);
      expect(renderStyle.opacity).toBeCloseTo(playerStyle.opacity, 10);
      expect(renderStyle.transform).toBe(playerStyle.transform);
    }
  });
});

describe('render stability: transition-active clips correctly use frame', () => {
  it('fade transition — opacity changes with frame', () => {
    const fadeClip: RenderClip = { ...baseClip, transitionIn: 'fade', transitionDurationInFrames: 15 };
    const opacity0 = (getClipStyle(fadeClip, undefined, 0).opacity as number);
    const opacity7 = (getClipStyle(fadeClip, undefined, 7).opacity as number);
    const opacity15 = (getClipStyle(fadeClip, undefined, 15).opacity as number);
    expect(opacity0).toBe(0);
    expect(opacity7).toBeCloseTo(7 / 15, 10);
    expect(opacity15).toBe(1);
  });

  it('outgoing transition — opacity changes with frame', () => {
    const clipA: RenderClip = { ...baseClip, durationInFrames: 90 };
    const outgoing: OutgoingTransition = { transitionIn: 'fade', durationInFrames: 15 };
    const opacity75 = (getClipStyle(clipA, outgoing, 75).opacity as number);
    const opacity82 = (getClipStyle(clipA, outgoing, 82).opacity as number);
    expect(opacity75).toBe(1);
    expect(opacity82).toBeCloseTo(1 - 7 / 15, 10);
  });

  it('fadeIn — opacity changes with frame', () => {
    const fadeInClip: RenderClip = { ...baseClip, fadeInFrames: 10 };
    expect((getClipStyle(fadeInClip, undefined, 0).opacity as number)).toBe(0);
    expect((getClipStyle(fadeInClip, undefined, 5).opacity as number)).toBeCloseTo(0.5, 10);
    expect((getClipStyle(fadeInClip, undefined, 10).opacity as number)).toBe(1);
  });

  it('fadeOut — opacity changes with frame', () => {
    const fadeOutClip: RenderClip = { ...baseClip, fadeOutFrames: 10 };
    expect((getClipStyle(fadeOutClip, undefined, 90).opacity as number)).toBe(1);
    expect((getClipStyle(fadeOutClip, undefined, 95).opacity as number)).toBeCloseTo(0.5, 10);
    expect((getClipStyle(fadeOutClip, undefined, 100).opacity as number)).toBe(0);
  });
});

describe('render stability: hasFrameDependentEffects heuristic', () => {
  it('no transitions, no fades → false', () => {
    expect(hasFrameDependentEffects(baseClip)).toBe(false);
  });

  it('fade transition → true', () => {
    expect(hasFrameDependentEffects({ ...baseClip, transitionIn: 'fade', transitionDurationInFrames: 15 })).toBe(true);
  });

  it('transitionIn = none but transitionDurationInFrames > 0 → false (type check)', () => {
    expect(hasFrameDependentEffects({ ...baseClip, transitionIn: 'none', transitionDurationInFrames: 15 })).toBe(false);
  });

  it('fadeInFrames > 0 → true', () => {
    expect(hasFrameDependentEffects({ ...baseClip, fadeInFrames: 5 })).toBe(true);
  });

  it('fadeOutFrames > 0 → true', () => {
    expect(hasFrameDependentEffects({ ...baseClip, fadeOutFrames: 5 })).toBe(true);
  });

  it('outgoing with fade → true', () => {
    expect(hasFrameDependentEffects(baseClip, { transitionIn: 'fade', durationInFrames: 15 }));
  });

  it('outgoing with none → false', () => {
    expect(hasFrameDependentEffects(baseClip, { transitionIn: 'none', durationInFrames: 15 })).toBe(false);
  });
});
