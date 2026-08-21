import { describe, expect, it } from 'vitest';
import { getClipStyle } from '../src/editor/composition/transitionStyles';
import type { RenderClip } from '../src/editor/editorTypes';

const clip = (transitionIn: RenderClip['transitionIn']): RenderClip => ({
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
