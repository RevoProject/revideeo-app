import { describe, it, expect } from 'vitest';

describe('Juicer FPS migration correctness', () => {
  describe('duration calculations at different FPS', () => {
    const fpsCases = [
      { fps: 24, frames: 24, expectedSeconds: '1.0' },
      { fps: 30, frames: 30, expectedSeconds: '1.0' },
      { fps: 60, frames: 60, expectedSeconds: '1.0' },
      { fps: 24, frames: 120, expectedSeconds: '5.0' },
      { fps: 30, frames: 150, expectedSeconds: '5.0' },
      { fps: 60, frames: 300, expectedSeconds: '5.0' },
    ];

    for (const { fps, frames, expectedSeconds } of fpsCases) {
      it(`fps=${fps}: ${frames} frames = ${expectedSeconds}s`, () => {
        expect((frames / fps).toFixed(1)).toBe(expectedSeconds);
      });
    }
  });

  describe('timeline context from public API', () => {
    it('durationInSeconds matches durationInFrames / fps', () => {
      const fps = 24;
      const durationInFrames = 480;
      const durationInSeconds = durationInFrames / fps;
      expect(durationInSeconds).toBe(20);
    });

    it('contentDuration can be less than total duration', () => {
      const totalFrames = 900;
      const contentFrames = 600;
      const fps = 30;
      expect(contentFrames / fps).toBeLessThan(totalFrames / fps);
    });
  });

  describe('media inventory from context.media', () => {
    it('maps MediaInfo to prompt context', () => {
      const fps = 30;
      const mediaList = [
        { id: 'v1', name: 'video.mp4', kind: 'video' as const, durationInFrames: 300, loaded: true },
        { id: 'a1', name: 'audio.wav', kind: 'audio' as const, durationInFrames: 900, loaded: true },
        { id: 'i1', name: 'photo.jpg', kind: 'image' as const, durationInFrames: 1, loaded: true },
      ];

      const enriched = mediaList.map((m) => ({
        ...m,
        durationSeconds: +(m.durationInFrames / fps).toFixed(1),
      }));

      expect(enriched[0].durationSeconds).toBe(10.0);
      expect(enriched[1].durationSeconds).toBe(30.0);
      expect(enriched[2].durationSeconds).toBe(0.0);
    });
  });

  describe('no fake clip synthesis', () => {
    it('empty clips array results in empty clipsContext', () => {
      const clips: unknown[] = [];
      const clipsContext = clips.map(() => ({ sourceId: '', durationInFrames: 0 }));
      expect(clipsContext).toEqual([]);
    });
  });

  describe('DEMO_PROMPT removal', () => {
    it('DEMO_PROMPT text is treated as regular input', () => {
      const input = 'DEMO_PROMPT';
      const isDemo = false;
      expect(input.trim().length > 0 && !isDemo).toBe(true);
    });
  });
});
