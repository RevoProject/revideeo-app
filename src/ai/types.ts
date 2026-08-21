export interface AIProviderConfig {
  id: string;
  name: string;
  type: 'local' | 'gemini' | 'openai' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
  priority: number;
}

export interface AIProviderCapabilities {
  canAnalyze: boolean;
  canGeneratePlan: boolean;
  canExecute: boolean;
  maxTokens?: number;
  supportsStreaming?: boolean;
}

export interface AIPlanRequest {
  prompt: string;
  context: {
    clips: { sourceId: string; name: string; durationInFrames: number }[];
    trackCount: number;
    fps: number;
    resolution: string;
    orientation: string;
  };
  attachments?: { attachmentId?: string; name: string; mimeType?: string; kind?: string; metadata?: Record<string, unknown> }[];
  template?: string;
  scope: 'global' | 'project';
}

export interface AIPlanStep {
  id: string;
  type: 'remove-silence' | 'select-fragments' | 'add-captions' | 'add-animations' | 'add-transitions' | 'normalize-audio' | 'custom';
  title: string;
  description: string;
  params: Record<string, unknown>;
  required?: boolean;
}

export interface AIPlanResponse {
  provider: string;
  model: string;
  status?: 'plan_ready' | 'clarification_required';
  question?: string;
  summary?: string;
  steps: AIPlanStep[];
  analysis: {
    totalClips: number;
    totalTracks: number;
    durationSeconds: number;
    detectedScenes?: number;
  };
  metadata: {
    tokensUsed?: number;
    latencyMs: number;
    cached: boolean;
  };
}

export interface AIAnalysisResult {
  provider: string;
  clips: { sourceId: string; name: string; durationInFrames: number; silenceDetected?: boolean; sceneType?: string }[];
  totalDurationSeconds: number;
  detectedScenes: number;
  recommendations: string[];
  metadata: {
    tokensUsed?: number;
    latencyMs: number;
  };
}

export type AIProviderStatus = 'idle' | 'connecting' | 'ready' | 'error' | 'disabled';

export interface AIProgressEvent {
  step: string;
  progress: number;
}

export interface AIProviderError {
  code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'MODEL_UNAVAILABLE' | 'NETWORK_ERROR' | 'INVALID_RESPONSE' | 'PROVIDER_DISABLED';
  message: string;
  provider: string;
  retryAfterMs?: number;
}
