export type CaptionLanguage = 'pl' | 'en' | 'de' | 'auto';
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium';

export interface TranscriptionParams {
  language?: CaptionLanguage;
  model?: WhisperModel;
}

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionResult {
  clipId: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
}

export interface Caption {
  id: string;
  text: string;
  startFrame: number;
  durationFrames: number;
}
