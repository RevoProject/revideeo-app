import { describe, it, expect } from 'vitest';
import { segmentsToCaptions, formatTime } from '../plugins/auto-captions/utils';
import { asTranscriptionResult, buildProcessingParams } from '../plugins/auto-captions/transcription';
import type { MediaProcessingResult } from '../src/api/types';
import type { TranscriptionSegment } from '../plugins/auto-captions/types';

describe('auto-captions/utils', () => {
  describe('segmentsToCaptions', () => {
    it('converts segments to captions with correct frame offsets', () => {
      const segments: TranscriptionSegment[] = [
        { text: 'Hello world', start: 1.0, end: 2.5 },
      ];
      const result = segmentsToCaptions(segments, 300, 30);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Hello world');
      expect(result[0].startFrame).toBe(330);
      expect(result[0].durationFrames).toBe(45);
    });

    it('filters out empty segments', () => {
      const segments: TranscriptionSegment[] = [
        { text: '', start: 0, end: 1 },
        { text: '  ', start: 1, end: 2 },
        { text: 'Valid', start: 2, end: 3 },
      ];
      const result = segmentsToCaptions(segments, 0, 30);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Valid');
    });

    it('trims whitespace from text', () => {
      const segments: TranscriptionSegment[] = [
        { text: '  Hello  ', start: 0, end: 1 },
      ];
      const result = segmentsToCaptions(segments, 0, 30);
      expect(result[0].text).toBe('Hello');
    });

    it('ensures minimum duration of 1 frame', () => {
      const segments: TranscriptionSegment[] = [
        { text: 'Quick', start: 0, end: 0.01 },
      ];
      const result = segmentsToCaptions(segments, 0, 30);
      expect(result[0].durationFrames).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array for no segments', () => {
      expect(segmentsToCaptions([], 0, 30)).toEqual([]);
    });

    it('handles multiple segments', () => {
      const segments: TranscriptionSegment[] = [
        { text: 'First', start: 0, end: 1 },
        { text: 'Second', start: 1, end: 2 },
      ];
      const result = segmentsToCaptions(segments, 60, 30);
      expect(result).toHaveLength(2);
      expect(result[0].startFrame).toBe(60);
      expect(result[1].startFrame).toBe(90);
    });
  });

  describe('formatTime', () => {
    it('formats 0 seconds', () => {
      expect(formatTime(0)).toBe('00:00.00');
    });

    it('formats 65.5 seconds', () => {
      expect(formatTime(65.5)).toBe('01:05.50');
    });

    it('formats 125.75 seconds', () => {
      expect(formatTime(125.75)).toBe('02:05.75');
    });
  });
});

describe('auto-captions/transcription', () => {
  describe('asTranscriptionResult', () => {
    it('casts successful result', () => {
      const result: MediaProcessingResult = {
        ok: true,
        processor: 'transcribe',
        data: { segments: [{ text: 'Hello', start: 0, end: 1 }], language: 'en', duration: 10 },
      };
      const parsed = asTranscriptionResult(result, 'clip-1');
      expect(parsed).not.toBeNull();
      expect(parsed!.clipId).toBe('clip-1');
      expect(parsed!.segments).toHaveLength(1);
      expect(parsed!.language).toBe('en');
    });

    it('returns null for error result', () => {
      const result: MediaProcessingResult = {
        ok: false,
        processor: 'transcribe',
        error: 'Failed',
        code: 'SERVER_ERROR',
      };
      expect(asTranscriptionResult(result, 'clip-1')).toBeNull();
    });

    it('handles missing fields gracefully', () => {
      const result: MediaProcessingResult = {
        ok: true,
        processor: 'transcribe',
        data: {},
      };
      const parsed = asTranscriptionResult(result, 'clip-1');
      expect(parsed!.segments).toEqual([]);
      expect(parsed!.language).toBe('unknown');
      expect(parsed!.duration).toBe(0);
    });
  });

  describe('buildProcessingParams', () => {
    it('builds params with defaults', () => {
      const params = buildProcessingParams({});
      expect(params.language).toBe('auto');
      expect(params.model).toBe('small');
    });

    it('preserves specified values', () => {
      const params = buildProcessingParams({ language: 'pl', model: 'medium' });
      expect(params.language).toBe('pl');
      expect(params.model).toBe('medium');
    });
  });
});

describe('VALID_PROCESSORS', () => {
  it('includes transcribe', async () => {
    const { VALID_PROCESSORS } = await import('../src/api/types');
    expect(VALID_PROCESSORS).toContain('transcribe');
  });
});
