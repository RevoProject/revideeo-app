import type { MediaProcessingResult } from '../../src/api/types';
import type { TranscriptionResult, TranscriptionParams } from './types';

export function asTranscriptionResult(
  result: MediaProcessingResult,
  clipId: string,
): TranscriptionResult | null {
  if (!result.ok) return null;
  const data = result.data as Record<string, unknown>;
  return {
    clipId,
    segments: (data.segments as { text: string; start: number; end: number }[]) ?? [],
    language: (data.language as string) ?? 'unknown',
    duration: (data.duration as number) ?? 0,
  };
}

export function buildProcessingParams(params: TranscriptionParams): Record<string, unknown> {
  return {
    language: params.language ?? 'auto',
    model: params.model ?? 'small',
  };
}
