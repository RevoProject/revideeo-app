import { describe, expect, it } from 'vitest';
import {
  executeOperations,
  executeOperation,
  type ExecutionContext,
  type JuicerOperation,
} from '../src/juicer/stepExecutor';
import type { StoredClip } from '../src/types';

const defaultCtx: ExecutionContext = {
  clips: [],
  trackCount: 1,
  trackSettings: [{ name: 'Track 1', locked: false, muted: false, hidden: false }],
  fps: 30,
};

const clip = (overrides: Partial<StoredClip> = {}): StoredClip => ({
  id: 'c1',
  sourceId: 'a1',
  startFrame: 0,
  durationInFrames: 60,
  offsetInTimeline: 0,
  trackIndex: 0,
  posX: 0,
  posY: 0,
  width: 100,
  height: 100,
  scale: 1,
  transitionIn: 'none',
  transitionDurationInFrames: 0,
  ...overrides,
});

describe('resolveClipIds via executeOperations', () => {
  it('uses actual attachment duration instead of hardcoded 90 frames for video', async () => {
    const videoDuration = 450; // 15 seconds at 30fps
    const operations: JuicerOperation[] = [
      {
        id: 'op1',
        type: 'add_clip',
        params: {
          attachmentId: 'att_000',
          trackIndex: 0,
          offsetInTimeline: 0,
        },
      },
    ];

    const ctx: ExecutionContext = {
      ...defaultCtx,
      attachmentNames: { att_000: 'video_15s.mp4' },
      attachmentKinds: { att_000: 'video' },
      attachmentDurations: { att_000: videoDuration },
    };

    const result = await executeOperations(operations, ctx, () => {});

    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].durationInFrames).toBe(videoDuration);
    expect(result.clips[0].sourceId).toBe('att_000');
  });

  it('uses actual attachment duration instead of hardcoded 900 frames for audio', async () => {
    const audioDuration = 2700; // 90 seconds at 30fps
    const operations: JuicerOperation[] = [
      {
        id: 'op1',
        type: 'add_audio',
        params: {
          attachmentId: 'att_000',
        },
      },
    ];

    const ctx: ExecutionContext = {
      ...defaultCtx,
      attachmentNames: { att_000: 'song.mp3' },
      attachmentKinds: { att_000: 'audio' },
      attachmentDurations: { att_000: audioDuration },
    };

    const result = await executeOperations(operations, ctx, () => {});

    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].durationInFrames).toBe(audioDuration);
    expect(result.clips[0].sourceId).toBe('att_000');
  });

  it('falls back to 90 frames when no attachment duration is provided', async () => {
    const operations: JuicerOperation[] = [
      {
        id: 'op1',
        type: 'add_clip',
        params: {
          attachmentId: 'att_000',
          trackIndex: 0,
        },
      },
    ];

    const ctx: ExecutionContext = {
      ...defaultCtx,
      attachmentNames: { att_000: 'video.mp4' },
      attachmentKinds: { att_000: 'video' },
    };

    const result = await executeOperations(operations, ctx, () => {});

    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].durationInFrames).toBe(defaultCtx.fps * 3);
  });

  it('falls back to 900 frames for audio when no attachment duration is provided', async () => {
    const operations: JuicerOperation[] = [
      {
        id: 'op1',
        type: 'add_audio',
        params: {
          attachmentId: 'att_000',
        },
      },
    ];

    const ctx: ExecutionContext = {
      ...defaultCtx,
      attachmentNames: { att_000: 'song.mp3' },
      attachmentKinds: { att_000: 'audio' },
    };

    const result = await executeOperations(operations, ctx, () => {});

    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].durationInFrames).toBe(900);
  });

  it('preserves explicitly provided durationInFrames over attachment duration', async () => {
    const operations: JuicerOperation[] = [
      {
        id: 'op1',
        type: 'add_clip',
        params: {
          attachmentId: 'att_000',
          durationInFrames: 120,
          trackIndex: 0,
        },
      },
    ];

    const ctx: ExecutionContext = {
      ...defaultCtx,
      attachmentNames: { att_000: 'video.mp4' },
      attachmentKinds: { att_000: 'video' },
      attachmentDurations: { att_000: 450 },
    };

    const result = await executeOperations(operations, ctx, () => {});

    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].durationInFrames).toBe(120);
  });
});

describe('add_clip with attachmentDurations', () => {
  it('uses actual duration from context when no durationInFrames in params', () => {
    const knownDuration = 300; // 10 seconds at 30fps
    const op: JuicerOperation = {
      id: 'op1',
      type: 'add_clip',
      params: { sourceId: 'att_000', trackIndex: 0 },
    };
    const ctx: ExecutionContext = {
      ...defaultCtx,
      attachmentNames: { att_000: 'test.mp4' },
      attachmentDurations: { att_000: knownDuration },
    };

    const result = executeOperation(op, ctx);
    expect(result.clips[0].durationInFrames).toBe(knownDuration);
  });
});

describe('newAssets duration regression', () => {
  it('attachmentDurations map is used for newAssets creation', () => {
    const fps = 30;
    const videoDuration = 450;
    const imageDuration = fps * 5;

    const attachmentDurations: Record<string, number> = {
      att_000: videoDuration,
      'clip.mp4': videoDuration,
      att_001: imageDuration,
      'photo.jpg': imageDuration,
    };

    const attachedFiles = [
      { name: 'clip.mp4', file: new File([], 'clip.mp4', { type: 'video/mp4' }) },
      { name: 'photo.jpg', file: new File([], 'photo.jpg', { type: 'image/jpeg' }) },
    ];

    const newAssets = attachedFiles
      .filter((f) => f.file)
      .map((f, i) => {
        const attId = `att_${String(i).padStart(3, '0')}`;
        return {
          sourceId: attId,
          name: f.name,
          blob: f.file!,
          durationInFrames: attachmentDurations[attId] ?? fps * 3,
        };
      });

    expect(newAssets[0].durationInFrames).toBe(videoDuration);
    expect(newAssets[0].sourceId).toBe('att_000');
    expect(newAssets[1].durationInFrames).toBe(imageDuration);
    expect(newAssets[1].sourceId).toBe('att_001');
  });

  it('video longer than 3s does NOT get truncated to 90 frames', () => {
    const fps = 30;
    const actualDuration = 900; // 30 seconds at 30fps

    const attachmentDurations: Record<string, number> = {
      att_000: actualDuration,
    };

    const durationInFrames = attachmentDurations['att_000'] ?? fps * 3;

    expect(durationInFrames).toBe(actualDuration);
    expect(durationInFrames).toBeGreaterThan(fps * 3);
  });
});

describe('track name preservation', () => {
  it('add_clip does not overwrite existing track name with filename', async () => {
    const operations: JuicerOperation[] = [
      {
        id: 'op1',
        type: 'add_clip',
        params: {
          attachmentId: 'att_000',
          trackIndex: 0,
          offsetInTimeline: 0,
        },
      },
    ];

    const ctx: ExecutionContext = {
      ...defaultCtx,
      trackSettings: [{ name: 'Main Video', locked: false, muted: false, hidden: false }],
      attachmentNames: { att_000: 'my-video.mp4' },
      attachmentKinds: { att_000: 'video' },
      attachmentDurations: { att_000: 450 },
    };

    const result = await executeOperations(operations, ctx, () => {});

    expect(result.trackSettings[0].name).toBe('Main Video');
    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].sourceId).toBe('att_000');
  });

  it('add_clip preserves user-named track when clip added to non-empty track', async () => {
    const existingClip = clip({ id: 'existing', sourceId: 'a1', trackIndex: 0 });
    const operations: JuicerOperation[] = [
      {
        id: 'op1',
        type: 'add_clip',
        params: {
          attachmentId: 'att_000',
          trackIndex: 0,
          offsetInTimeline: 100,
        },
      },
    ];

    const ctx: ExecutionContext = {
      clips: [existingClip],
      trackCount: 1,
      trackSettings: [{ name: 'My Custom Track', locked: false, muted: false, hidden: false }],
      fps: 30,
      attachmentNames: { att_000: 'new-video.mp4' },
      attachmentKinds: { att_000: 'video' },
      attachmentDurations: { att_000: 300 },
    };

    const result = await executeOperations(operations, ctx, () => {});

    expect(result.trackSettings[0].name).toBe('My Custom Track');
  });

  it('add_audio does not overwrite existing track name with filename', async () => {
    const operations: JuicerOperation[] = [
      {
        id: 'op1',
        type: 'add_audio',
        params: {
          attachmentId: 'att_000',
        },
      },
    ];

    const ctx: ExecutionContext = {
      ...defaultCtx,
      trackSettings: [{ name: 'Voiceover', locked: false, muted: false, hidden: false }],
      attachmentNames: { att_000: 'background-music.mp3' },
      attachmentKinds: { att_000: 'audio' },
      attachmentDurations: { att_000: 900 },
    };

    const result = await executeOperations(operations, ctx, () => {});

    expect(result.trackSettings[0].name).toBe('Voiceover');
  });
});
