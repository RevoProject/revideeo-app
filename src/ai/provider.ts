import type {
  AIProviderConfig,
  AIProviderCapabilities,
  AIPlanRequest,
  AIPlanResponse,
  AIAnalysisResult,
  AIProviderStatus,
  AIProgressEvent,
} from './types';

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly type: AIProviderConfig['type'];
  readonly modelName?: string;
  onProgress?: ((event: import('./types').AIProgressEvent) => void) | null;

  getConfig(): AIProviderConfig;
  getStatus(): AIProviderStatus;
  getCapabilities(): AIProviderCapabilities;

  analyze(request: AIPlanRequest): Promise<AIAnalysisResult>;
  generatePlan(request: AIPlanRequest): Promise<AIPlanResponse>;
  validateApiKey(): Promise<boolean>;
}

const LOCAL_CAPABILITIES: AIProviderCapabilities = {
  canAnalyze: true,
  canGeneratePlan: false,
  canExecute: false,
  maxTokens: 0,
  supportsStreaming: false,
};

const DEMO_ANALYSIS = (request: AIPlanRequest): AIAnalysisResult => ({
  provider: 'local',
  clips: request.context.clips.map((c) => ({
    sourceId: c.sourceId,
    name: c.name,
    durationInFrames: c.durationInFrames,
    silenceDetected: Math.random() > 0.7,
    sceneType: ['indoor', 'outdoor', 'studio'][Math.floor(Math.random() * 3)],
  })),
  totalDurationSeconds: request.context.clips.reduce((acc, c) => acc + c.durationInFrames / request.context.fps, 0),
  detectedScenes: Math.max(1, request.context.clips.length),
  recommendations: [
    'Można usunąć ciszę z 2-3 fragmentów',
    'Wykryto podobne ujęcia — warto rozważyć selekcję',
    'Brak napisów — dodaj captiony dla lepszej dostępności',
  ],
  metadata: { latencyMs: Math.floor(Math.random() * 200) + 50 },
});

const DEMO_PLAN = (request: AIPlanRequest): AIPlanResponse => ({
  provider: 'local',
  model: 'demo',
  steps: [
    { id: 's1', type: 'remove-silence', title: 'Usuń ciszę', description: 'Wykryto fragmenty ciszy w materiałach', params: { threshold: 0.01 }, required: false },
    { id: 's2', type: 'select-fragments', title: 'Wybierz najlepsze fragmenty', description: 'Analiza jakości ujęć', params: { maxFragments: 6 }, required: false },
    { id: 's3', type: 'add-captions', title: 'Dodaj napisy', description: 'Automatyczne generowanie napisów', params: { style: 'bold', fontSize: 48 }, required: false },
    { id: 's4', type: 'add-animations', title: 'Dodaj animacje wejścia', description: 'Zoom + slide dla klipów', params: { zoom: 1.1, duration: 15 }, required: false },
    { id: 's5', type: 'add-transitions', title: 'Dodaj przejścia', description: 'Cross-zoom i fade między klipami', params: { types: ['cross-zoom', 'fade'] }, required: false },
  ],
  analysis: {
    totalClips: request.context.clips.length,
    totalTracks: request.context.trackCount,
    durationSeconds: request.context.clips.reduce((acc, c) => acc + c.durationInFrames / request.context.fps, 0),
    detectedScenes: request.context.clips.length,
  },
  metadata: { latencyMs: Math.floor(Math.random() * 300) + 100, cached: false },
});

class LocalAIProvider implements AIProvider {
  readonly id = 'local';
  readonly name = 'Local AI (Demo)';
  readonly type = 'local' as const;
  private config: AIProviderConfig;
  private status: AIProviderStatus = 'ready';

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  getConfig() { return this.config; }
  getStatus() { return this.status; }
  getCapabilities() { return LOCAL_CAPABILITIES; }

  async analyze(request: AIPlanRequest): Promise<AIAnalysisResult> {
    await new Promise((r) => setTimeout(r, 200));
    return DEMO_ANALYSIS(request);
  }

  async generatePlan(request: AIPlanRequest): Promise<AIPlanResponse> {
    await new Promise((r) => setTimeout(r, 300));
    return DEMO_PLAN(request);
  }

  async validateApiKey() { return true; }
}

class GeminiAIProvider implements AIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly type = 'gemini' as const;
  private config: AIProviderConfig;
  private status: AIProviderStatus = 'idle';

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  getConfig() { return this.config; }
  getStatus() { return this.status; }
  getCapabilities(): AIProviderCapabilities {
    return { canAnalyze: true, canGeneratePlan: true, canExecute: false, maxTokens: 8192, supportsStreaming: true };
  }

  async analyze(request: AIPlanRequest): Promise<AIAnalysisResult> {
    if (!this.config.apiKey) {
      this.status = 'error';
      throw new Error('Gemini API key not configured');
    }
    this.status = 'connecting';
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model ?? 'gemini-3.1-flash-lite'}:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Analizuję materiał filmowy. ${request.prompt}\n\nKontekst: ${request.context.clips.length} klipów, ${request.context.trackCount} ścieżek, ${request.context.fps} fps, ${request.context.resolution} ${request.context.orientation}` }] }],
        }),
      });
      if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      this.status = 'ready';
      return {
        provider: 'gemini',
        clips: request.context.clips.map((c) => ({ sourceId: c.sourceId, name: c.name, durationInFrames: c.durationInFrames })),
        totalDurationSeconds: request.context.clips.reduce((acc, c) => acc + c.durationInFrames / request.context.fps, 0),
        detectedScenes: request.context.clips.length,
        recommendations: text.split('\n').filter(Boolean).slice(0, 5),
        metadata: { latencyMs: 0 },
      };
    } catch (err) {
      this.status = 'error';
      throw err;
    }
  }

  async generatePlan(request: AIPlanRequest): Promise<AIPlanResponse> {
    if (!this.config.apiKey) {
      this.status = 'error';
      throw new Error('Gemini API key not configured');
    }
    this.status = 'connecting';
    try {
      const prompt = `Wygeneruj plan edycji filmu. Prompt: ${request.prompt}\nKontekst: ${JSON.stringify(request.context)}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model ?? 'gemini-3.1-flash-lite'}:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
      const parsed = JSON.parse(text);
      this.status = 'ready';
      return {
        provider: 'gemini',
        model: this.config.model ?? 'gemini-3.1-flash-lite',
        steps: Array.isArray(parsed) ? parsed : parsed.steps ?? [],
        analysis: {
          totalClips: request.context.clips.length,
          totalTracks: request.context.trackCount,
          durationSeconds: request.context.clips.reduce((acc, c) => acc + c.durationInFrames / request.context.fps, 0),
        },
        metadata: { latencyMs: 0, cached: false },
      };
    } catch (err) {
      this.status = 'error';
      throw err;
    }
  }

  async validateApiKey(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

class CustomAIProvider implements AIProvider {
  readonly id: string;
  readonly name: string;
  readonly type = 'custom' as const;
  private config: AIProviderConfig;
  private status: AIProviderStatus = 'idle';

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
  }

  getConfig() { return this.config; }
  getStatus() { return this.status; }
  getCapabilities(): AIProviderCapabilities {
    return { canAnalyze: true, canGeneratePlan: true, canExecute: false, maxTokens: 4096, supportsStreaming: false };
  }

  async analyze(request: AIPlanRequest): Promise<AIAnalysisResult> {
    if (!this.config.baseUrl) throw new Error('Custom provider baseUrl not configured');
    this.status = 'connecting';
    try {
      const response = await fetch(`${this.config.baseUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}) },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`Custom provider error: ${response.status}`);
      const data = await response.json();
      this.status = 'ready';
      return data as AIAnalysisResult;
    } catch (err) {
      this.status = 'error';
      throw err;
    }
  }

  async generatePlan(request: AIPlanRequest): Promise<AIPlanResponse> {
    if (!this.config.baseUrl) throw new Error('Custom provider baseUrl not configured');
    this.status = 'connecting';
    try {
      const response = await fetch(`${this.config.baseUrl}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}) },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`Custom provider error: ${response.status}`);
      const data = await response.json();
      this.status = 'ready';
      return data as AIPlanResponse;
    } catch (err) {
      this.status = 'error';
      throw err;
    }
  }

  async validateApiKey(): Promise<boolean> {
    if (!this.config.baseUrl) return false;
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, { headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {} });
      return response.ok;
    } catch {
      return false;
    }
  }
}

const describeOperation = (type: string, params: Record<string, unknown>, attachments?: { name: string; attachmentId?: string }[]): string => {
  const p = params;
  const attName = (id?: string) => {
    if (!id || !attachments) return '';
    const att = attachments.find((a) => a.attachmentId === id);
    return att ? att.name : id;
  };
  switch (type) {
    case 'set_project_config': {
      const parts: string[] = [];
      if (p.orientation) parts.push(`orientacja ${p.orientation}`);
      if (p.resolution) parts.push(`rozdzielczość ${p.resolution}`);
      return parts.length ? `Ustaw projekt: ${parts.join(', ')}` : 'Zmień ustawienia projektu';
    }
    case 'add_track': return `Dodaj ścieżkę${p.name ? `: ${p.name}` : ''}`;
    case 'add_clip': {
      const name = attName(p.sourceId as string) || attName(p.attachmentId as string) || '';
      return `Dodaj klip${name ? `: ${name}` : ''} na ścieżkę ${(Number(p.trackIndex) || 0) + 1}`;
    }
    case 'move_clip': return `Przesuń klip ${attName(p.clipId as string)}`;
    case 'split_clip': return `Rozdziel klip ${attName(p.clipId as string)} w klatce ${p.atFrame ?? '?'}`;
    case 'trim_clip': return `Przecięcie klipu ${attName(p.clipId as string)} (${p.startFrame ?? '?'} → ${p.endFrame ?? '?'})`;
    case 'remove_clip': return `Usuń klip ${attName(p.clipId as string)}`;
    case 'set_clip_properties': {
      const changes = (p.changes ?? p) as Record<string, unknown>;
      const keys = Object.keys(changes).filter((k) => k !== 'clipId');
      return `Zmień właściwości klipu ${attName(p.clipId as string)}: ${keys.join(', ')}`;
    }
    case 'create_text': return `Dodaj tekst: "${String(p.text ?? '').slice(0, 25)}${String(p.text ?? '').length > 25 ? '...' : ''}"`;
    case 'add_transition': return `Przejście ${p.type ?? 'fade'} na klipie ${attName(p.clipId as string)}`;
    case 'add_audio': {
      const name = attName(p.sourceId as string) || attName(p.attachmentId as string) || '';
      return `Dodaj audio${name ? `: ${name}` : ''} na ścieżkę ${(Number(p.trackIndex) || 0) + 1}`;
    }
    case 'set_track_name': return `Nazwij ścieżkę: ${p.name ?? '?'}`;
    case 'set_clip_name': return `Nazwij klip: ${attName(p.clipId as string)} → ${p.name ?? '?'}`;
    case 'set_audio_name': return `Nazwij audio: ${attName(p.clipId as string)} → ${p.name ?? '?'}`;
    case 'set_markers': return `Ustaw markery`;
    default: return type.replace(/_/g, ' ');
  }
};

const describeOperationDetail = (type: string, params: Record<string, unknown>): string => {
  const p = params;
  switch (type) {
    case 'add_clip': {
      const dur = (p.durationInFrames as number) ?? 0;
      const start = (p.startFrame as number) ?? 0;
      const parts = [`ścieżka ${(Number(p.trackIndex) || 0) + 1}`];
      if (start > 0) parts.push(`od klatki ${start}`);
      if (dur > 0) parts.push(`${(dur / 30).toFixed(1)}s`);
      return parts.join(', ');
    }
    case 'add_audio': {
      const vol = p.volume as number;
      return `głośność ${vol != null ? Math.round(vol * 100) + '%' : 'domyślna'}`;
    }
    case 'add_transition': {
      const dur = (p.durationInFrames as number) ?? 15;
      return `${p.type ?? 'fade'}, ${(dur / 30).toFixed(1)}s`;
    }
    case 'create_text': {
      const size = (p.fontSize as number) ?? 48;
      return `"${String(p.text ?? '').slice(0, 40)}", rozmiar ${size}px`;
    }
    case 'set_clip_properties': {
      const changes = (p.changes ?? p) as Record<string, unknown>;
      const parts: string[] = [];
      if (changes.scale) parts.push(`skala ${changes.scale}x`);
      if (changes.posX != null || changes.posY != null) parts.push(`pozycja`);
      if (changes.opacity != null) parts.push(`przezroczystość ${Math.round((changes.opacity as number) * 100)}%`);
      if (changes.rotation) parts.push(`obrót ${changes.rotation}°`);
      if (changes.volume != null) parts.push(`głośność ${Math.round((changes.volume as number) * 100)}%`);
      if (changes.fadeInFrames) parts.push(`fade-in ${(changes.fadeInFrames as number) / 30}s`);
      if (changes.fadeOutFrames) parts.push(`fade-out ${(changes.fadeOutFrames as number) / 30}s`);
      return parts.join(', ') || 'zmiana właściwości';
    }
    case 'trim_clip': {
      const parts: string[] = [];
      if (p.startFrame != null) parts.push(`start: klatka ${p.startFrame}`);
      if (p.endFrame != null) parts.push(`koniec: klatka ${p.endFrame}`);
      return parts.join(', ') || 'przycięcie';
    }
    case 'split_clip': return `punkt: klatka ${p.atFrame ?? '?'}`;
    case 'move_clip': {
      const parts: string[] = [];
      if (p.offsetInTimeline != null) parts.push(`offset: ${p.offsetInTimeline}`);
      if (p.trackIndex != null) parts.push(`ścieżka ${(p.trackIndex as number) + 1}`);
      return parts.join(', ') || 'przesunięcie';
    }
    default: return '';
  }
};

class ServerAIProvider implements AIProvider {
  readonly id: string;
  readonly name: string;
  readonly type = 'custom' as const;
  private config: AIProviderConfig;
  private status: AIProviderStatus = 'idle';
  private serverUrl: string;
  private profileName: string;
  onProgress: ((event: AIProgressEvent) => void) | null = null;

  constructor(config: AIProviderConfig, serverUrl: string, profileName: string) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.serverUrl = serverUrl;
    this.profileName = profileName;
  }

  getConfig() { return this.config; }
  getStatus() { return this.status; }
  getCapabilities(): AIProviderCapabilities {
    return { canAnalyze: true, canGeneratePlan: true, canExecute: false, maxTokens: 4096, supportsStreaming: true };
  }

  private async consumeSSE<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Server AI error: ${response.status}`);

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: T | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'progress') {
            this.onProgress?.({ step: event.step, progress: event.progress });
          } else if (event.type === 'result') {
            result = event.result;
          } else if (event.type === 'error') {
            throw new Error(event.error);
          }
        } catch (e) {
          if (e instanceof Error && !e.message.includes('JSON')) throw e;
        }
      }
    }
    if (!result) throw new Error('No result from server AI');
    return result;
  }

  async analyze(request: AIPlanRequest): Promise<AIAnalysisResult> {
    this.status = 'connecting';
    try {
      const result = await this.consumeSSE<{ detectedScenes?: number; suggestions?: string[] }>(
        `${this.serverUrl}/api/juicer/analyze`,
        { prompt: request.prompt, context: request.context },
      );
      this.status = 'ready';
      return {
        provider: this.id,
        clips: request.context.clips.map((c) => ({ sourceId: c.sourceId, name: c.name, durationInFrames: c.durationInFrames })),
        totalDurationSeconds: request.context.clips.reduce((acc, c) => acc + c.durationInFrames / request.context.fps, 0),
        detectedScenes: result.detectedScenes ?? request.context.clips.length,
        recommendations: result.suggestions ?? [],
        metadata: { latencyMs: 0 },
      };
    } catch (err) {
      this.status = 'error';
      throw err;
    }
  }

  async generatePlan(request: AIPlanRequest): Promise<AIPlanResponse> {
    this.status = 'connecting';
    try {
      const raw = await this.consumeSSE<{ steps?: AIPlanResponse['steps']; operations?: { id: string; type: string; params: Record<string, unknown> }[]; summary?: string; status?: string; question?: string; analysis?: Record<string, unknown> }>(
        `${this.serverUrl}/api/juicer/plan`,
        { prompt: request.prompt, context: request.context, attachments: request.attachments ?? [] },
      );
      this.status = 'ready';

      let steps: AIPlanResponse['steps'];
      const atts = request.attachments ?? [];

      if (raw.status === 'clarification_required') {
        return {
          provider: this.id,
          model: this.profileName,
          status: 'clarification_required',
          question: raw.question ?? 'Potrzebuję więcej informacji.',
          steps: [],
          analysis: { totalClips: request.context.clips.length, totalTracks: request.context.trackCount, durationSeconds: request.context.clips.reduce((acc, c) => acc + c.durationInFrames / request.context.fps, 0) },
          metadata: { latencyMs: 0, cached: false },
        };
      }

      if (raw.operations && raw.operations.length > 0) {
        steps = raw.operations.map((op) => ({
          id: op.id,
          type: op.type as AIPlanResponse['steps'][number]['type'],
          title: describeOperation(op.type, op.params, atts),
          description: describeOperationDetail(op.type, op.params),
          params: op.params,
          required: true,
        }));
      } else {
        steps = raw.steps ?? [];
      }

      return {
        provider: this.id,
        model: this.profileName,
        steps,
        analysis: {
          totalClips: request.context.clips.length,
          totalTracks: request.context.trackCount,
          durationSeconds: request.context.clips.reduce((acc, c) => acc + c.durationInFrames / request.context.fps, 0),
        },
        metadata: { latencyMs: 0, cached: false },
      };
    } catch (err) {
      this.status = 'error';
      throw err;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) return false;
      const data = await response.json();
      return data.ai?.enabled === true;
    } catch {
      return false;
    }
  }
}

const PROVIDER_STORAGE_KEY = 'revideeo:ai:providers';

const loadProviders = (): AIProviderConfig[] => {
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (!raw) return getDefaultProviders();
    return JSON.parse(raw);
  } catch {
    return getDefaultProviders();
  }
};

const saveProviders = (providers: AIProviderConfig[]): void => {
  localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(providers));
};

const getDefaultProviders = (): AIProviderConfig[] => [
  { id: 'local', name: 'Local AI (Demo)', type: 'local', enabled: true, priority: 1 },
  { id: 'gemini', name: 'Google Gemini', type: 'gemini', enabled: false, priority: 2 },
];

export class AIProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private configs: AIProviderConfig[];

  constructor() {
    this.configs = loadProviders();
    this.initProviders();
  }

  private initProviders(): void {
    for (const config of this.configs) {
      this.createProvider(config);
    }
  }

  private createProvider(config: AIProviderConfig): AIProvider {
    let provider: AIProvider;
    switch (config.type) {
      case 'local':
        provider = new LocalAIProvider(config);
        break;
      case 'gemini':
        provider = new GeminiAIProvider(config);
        break;
      case 'custom':
        provider = new CustomAIProvider(config);
        break;
      default:
        provider = new LocalAIProvider(config);
    }
    this.providers.set(config.id, provider);
    return provider;
  }

  getProviders(): AIProvider[] {
    return [...this.providers.values()].sort((a, b) => a.getConfig().priority - b.getConfig().priority);
  }

  getEnabledProviders(): AIProvider[] {
    return this.getProviders().filter((p) => p.getConfig().enabled);
  }

  getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  getConfigs(): AIProviderConfig[] {
    return [...this.configs];
  }

  updateConfig(id: string, patch: Partial<AIProviderConfig>): void {
    const idx = this.configs.findIndex((c) => c.id === id);
    if (idx === -1) return;
    this.configs[idx] = { ...this.configs[idx], ...patch };
    saveProviders(this.configs);
    const existing = this.providers.get(id);
    if (existing) {
      this.providers.set(id, this.createProvider(this.configs[idx]));
    }
  }

  addProvider(config: AIProviderConfig): void {
    if (this.configs.some((c) => c.id === config.id)) return;
    this.configs.push(config);
    saveProviders(this.configs);
    this.createProvider(config);
  }

  removeProvider(id: string): void {
    if (id === 'local') return;
    this.configs = this.configs.filter((c) => c.id !== id);
    this.providers.delete(id);
    saveProviders(this.configs);
  }

  setApiKey(id: string, apiKey: string): void {
    this.updateConfig(id, { apiKey });
  }

  async testConnection(id: string): Promise<boolean> {
    const provider = this.providers.get(id);
    if (!provider) return false;
    return provider.validateApiKey();
  }

  registerServerProvider(serverUrl: string, providerLabel: string, modelName: string): void {
    const id = `server-${serverUrl}`;
    const existing = this.providers.get(id);
    if (existing) {
      this.providers.delete(id);
    }
    const config: AIProviderConfig = {
      id,
      name: providerLabel || 'AI',
      type: providerLabel?.toLowerCase().includes('gemini') ? 'gemini' : 'custom',
      baseUrl: serverUrl,
      enabled: true,
      priority: 0,
    };
    const provider = new ServerAIProvider(config, serverUrl, modelName);
    this.providers.set(id, provider);
    if (!this.configs.some((c) => c.id === id)) {
      this.configs.push(config);
      saveProviders(this.configs);
    }
  }

  removeServerProvider(serverUrl: string): void {
    const id = `server-${serverUrl}`;
    this.providers.delete(id);
    this.configs = this.configs.filter((c) => c.id !== id);
    saveProviders(this.configs);
  }
}

export const aiProviderRegistry = new AIProviderRegistry();
