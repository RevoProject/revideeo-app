import { describe, expect, it } from 'vitest';
import { computeClipStyle } from '../src/clipStyle.js';
import type { PlayerClip, OutgoingTransition } from '../src/types.js';

interface LegacyClip {
  durationInFrames: number;
  transitionIn: string;
  transitionDurationInFrames: number;
  scale: number;
  posX: number;
  posY: number;
  opacity: number;
  rotation: number;
  fadeInFrames: number;
  fadeOutFrames: number;
  cropTop: number;
  cropRight: number;
  cropBottom: number;
  cropLeft: number;
  borderRadius: number;
  width: number;
  height: number;
  fitMode: 'contain' | 'cover';
}

interface LegacyOutgoing {
  transitionIn: string;
  durationInFrames: number;
}

function legacyStyle(clip: LegacyClip, outgoing: LegacyOutgoing | undefined, frame: number) {
  const d = clip.durationInFrames;
  const t = clip.transitionIn;
  const td = clip.transitionDurationInFrames;
  const p = t !== 'none' && td > 0 ? Math.min(1, frame / td) : 1;
  let s = clip.scale, o = 1, tx = 0, bl = 0, cp: string | undefined;
  switch (t) {
    case 'fade': o = p; break;
    case 'slide': tx = (1 - p) * 100; o = Math.min(1, p * 1.5); break;
    case 'wipe': cp = `inset(0 ${(1 - p) * 100}% 0 0)`; break;
    case 'push': tx = (1 - p) * 100; o = Math.min(1, p * 1.5); break;
    case 'cross-zoom': s = clip.scale * (1.2 - 0.2 * p); o = p; break;
    case 'dreamy-zoom': s = clip.scale * (1.35 - 0.35 * p); bl = (1 - p) * 18; o = Math.min(1, p * 2); break;
    case 'linear-blur': bl = (1 - p) * 12; o = 0.35 + 0.65 * p; break;
    case 'film-burn': o = 0.45 + 0.55 * Math.min(1, p * 3); s = clip.scale * (1.05 - 0.05 * p); break;
  }
  if (outgoing && outgoing.transitionIn !== 'none' && outgoing.durationInFrames > 0) {
    const op = Math.max(0, Math.min(1, (frame - (d - outgoing.durationInFrames)) / outgoing.durationInFrames));
    o *= 1 - op;
    if (outgoing.transitionIn === 'push') tx -= op * 100;
  }
  const fi = clip.fadeInFrames ? Math.min(1, frame / clip.fadeInFrames) : 1;
  const fo = clip.fadeOutFrames ? Math.min(1, (d - frame) / clip.fadeOutFrames) : 1;
  const crop = `inset(${clip.cropTop}% ${clip.cropRight}% ${clip.cropBottom}% ${clip.cropLeft}%)`;
  return {
    transform: `translateX(${clip.posX}px) translateY(${clip.posY}px) translateX(${tx}%) rotate(${clip.rotation}deg) scale(${s})`,
    transformOrigin: 'center center',
    opacity: o * clip.opacity * fi * fo,
    filter: bl > 0 ? `blur(${bl}px)` : undefined,
    clipPath: cp ?? (crop === 'inset(0% 0% 0% 0%)' ? undefined : crop),
    borderRadius: `${clip.borderRadius}px`,
    width: `${clip.width}%`,
    height: `${clip.height}%`,
    objectFit: clip.fitMode,
  };
}

const clip = (o: Partial<PlayerClip> = {}): PlayerClip => ({
  id: 'c1', type: 'video', sourceId: 'a1', trackIndex: 0,
  offsetInTimeline: 0, startFrame: 0, durationInFrames: 60,
  scale: 1, posX: 0, posY: 0,
  transitionIn: 'none', transitionDurationInFrames: 0, ...o,
});

const legacy = (o: Partial<LegacyClip> = {}): LegacyClip => ({
  durationInFrames: 60, transitionIn: 'none', transitionDurationInFrames: 0,
  scale: 1, posX: 0, posY: 0, opacity: 1, rotation: 0,
  fadeInFrames: 0, fadeOutFrames: 0,
  cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0,
  borderRadius: 0, width: 100, height: 100, fitMode: 'contain', ...o,
});

function eq(a: unknown, b: unknown, msg: string) {
  if (typeof a === 'number' && typeof b === 'number') {
    expect(Math.abs(a - b) < 1e-10 ? a : a, msg).toBe(b);
  } else {
    expect(a, msg).toBe(b);
  }
}

function compare(c: PlayerClip, lo: LegacyClip, frame: number, out?: OutgoingTransition, loOut?: LegacyOutgoing, tag = '') {
  const ns = computeClipStyle(c, out, frame);
  const os = legacyStyle(lo, loOut, frame);
  const p = (k: string) => `${tag}${k}`;
  eq(ns.transform, os.transform, p('transform'));
  expect(ns.opacity, p('opacity')).toBeCloseTo(os.opacity, 10);
  eq(ns.filter ?? null, os.filter ?? null, p('filter'));
  eq(ns.clipPath ?? null, os.clipPath ?? null, p('clipPath'));
  eq(ns.borderRadius, os.borderRadius, p('borderRadius'));
  eq(ns.width, os.width, p('width'));
  eq(ns.height, os.height, p('height'));
  eq(ns.objectFit, os.objectFit, p('objectFit'));
}

describe('PIXEL-ACCURATE: legacy getClipStyle === new computeClipStyle', () => {
  const transitions = ['none','fade','slide','wipe','push','cross-zoom','dreamy-zoom','linear-blur','film-burn'] as const;

  for (const t of transitions) {
    for (let f = 0; f <= 60; f += 5) {
      it(`${t} @ frame ${f}`, () => {
        const c = clip({ transitionIn: t, transitionDurationInFrames: 15 });
        const l = legacy({ transitionIn: t, transitionDurationInFrames: 15 });
        compare(c, l, f, undefined, undefined, `${t}@${f}:`);
      });
    }
  }

  for (const [px, py] of [[0,0],[100,50],[-200,-100],[999,0]] as const) {
    it(`position ${px},${py}`, () => {
      compare(clip({ posX: px, posY: py }), legacy({ posX: px, posY: py }), 30);
    });
  }

  for (const s of [0.5, 1, 1.5, 2, 3]) {
    it(`scale ${s}`, () => {
      compare(clip({ scale: s }), legacy({ scale: s }), 30);
    });
  }

  for (const o of [0, 0.25, 0.5, 0.75, 1]) {
    it(`opacity ${o}`, () => {
      compare(clip({ opacity: o }), legacy({ opacity: o }), 30);
    });
  }

  it('fadeIn frame 0', () => {
    compare(clip({ fadeInFrames: 10 }), legacy({ fadeInFrames: 10 }), 0);
  });
  it('fadeIn frame 5', () => {
    compare(clip({ fadeInFrames: 10 }), legacy({ fadeInFrames: 10 }), 5);
  });
  it('fadeIn frame 10', () => {
    compare(clip({ fadeInFrames: 10 }), legacy({ fadeInFrames: 10 }), 10);
  });

  it('fadeOut frame 20', () => {
    compare(clip({ durationInFrames: 30, fadeOutFrames: 10 }), legacy({ durationInFrames: 30, fadeOutFrames: 10 }), 20);
  });
  it('fadeOut frame 25', () => {
    compare(clip({ durationInFrames: 30, fadeOutFrames: 10 }), legacy({ durationInFrames: 30, fadeOutFrames: 10 }), 25);
  });
  it('fadeOut frame 30', () => {
    compare(clip({ durationInFrames: 30, fadeOutFrames: 10 }), legacy({ durationInFrames: 30, fadeOutFrames: 10 }), 30);
  });

  it('crop 10%', () => {
    compare(clip({ cropLeft: 10, cropRight: 10, cropTop: 5, cropBottom: 5 }), legacy({ cropLeft: 10, cropRight: 10, cropTop: 5, cropBottom: 5 }), 30);
  });
  it('crop 0%', () => {
    compare(clip({ cropLeft: 0, cropRight: 0, cropTop: 0, cropBottom: 0 }), legacy({ cropLeft: 0, cropRight: 0, cropTop: 0, cropBottom: 0 }), 30);
  });
  it('borderRadius 12', () => {
    compare(clip({ borderRadius: 12 }), legacy({ borderRadius: 12 }), 30);
  });
  it('rotation 45', () => {
    compare(clip({ rotation: 45 }), legacy({ rotation: 45 }), 30);
  });
  it('fitMode cover', () => {
    compare(clip({ fitMode: 'cover' }), legacy({ fitMode: 'cover' }), 30);
  });

  it('outgoing fade transition', () => {
    const c = clip({ durationInFrames: 30, transitionIn: 'none', transitionDurationInFrames: 0 });
    const l = legacy({ durationInFrames: 30, transitionIn: 'none', transitionDurationInFrames: 0 });
    const out = { transitionIn: 'fade' as const, durationInFrames: 10 };
    const loOut = { transitionIn: 'fade', durationInFrames: 10 };
    compare(c, l, 25, out, loOut, 'outFade:');
  });
  it('outgoing push transition', () => {
    const c = clip({ durationInFrames: 30, transitionIn: 'none', transitionDurationInFrames: 0 });
    const l = legacy({ durationInFrames: 30, transitionIn: 'none', transitionDurationInFrames: 0 });
    const out = { transitionIn: 'push' as const, durationInFrames: 10 };
    const loOut = { transitionIn: 'push', durationInFrames: 10 };
    compare(c, l, 25, out, loOut, 'outPush:');
  });

  it('combined: fade + fadeIn + fadeOut + crop + position + scale', () => {
    const c = clip({
      transitionIn: 'fade', transitionDurationInFrames: 15,
      fadeInFrames: 5, fadeOutFrames: 10, durationInFrames: 60,
      posX: 100, posY: -50, scale: 1.5, opacity: 0.8,
      cropLeft: 5, cropRight: 5, rotation: 10, borderRadius: 8,
    });
    const l = legacy({
      transitionIn: 'fade', transitionDurationInFrames: 15,
      fadeInFrames: 5, fadeOutFrames: 10, durationInFrames: 60,
      posX: 100, posY: -50, scale: 1.5, opacity: 0.8,
      cropLeft: 5, cropRight: 5, rotation: 10, borderRadius: 8,
    });
    for (const f of [0, 5, 10, 15, 30, 50, 55, 60]) {
      compare(c, l, f, undefined, undefined, `combined@${f}:`);
    }
  });
});
