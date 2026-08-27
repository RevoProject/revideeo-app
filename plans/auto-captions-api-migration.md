# Auto Captions — API Migration Plan (v0.3.0) — Final (Revised)

> Status: PROPOSAL — Awaiting approval before implementation.

---

## 1. Architectural Verdict on PluginTranscriptionAPI

### Is PluginTranscriptionAPI a generic public capability?

**No.** The previous proposal's `PluginTranscriptionAPI` with `transcribe(clipIds, { language, model })` returning typed `TranscriptionResult[]` embeds Whisper-specific concepts into the shared API:

| Element | Problem |
|---------|---------|
| `language: string` (pl/en/de/auto) | Whisper language codes — not a generic concept |
| `model: string` (tiny/base/small/medium) | Whisper model names — not a generic concept |
| `TranscriptionSegment { text, start, end }` | Whisper output format — other STT services differ |
| `TranscriptionResult { segments, language, duration }` | Caption-specific result shape |
| `transcribe()` method name | Transcription-specific |

### What IS generic?

The underlying capability — "submit media to a local server for processing and get structured results back" — IS generic. Multiple future plugins could use it:

| Plugin | Processing | Shared capability? |
|--------|-----------|-------------------|
| Auto Captions | Transcription | Yes — submit media, get segments |
| Smart Transitions | Scene analysis | Yes — submit media, get scene data |
| Audio Description | Speech-to-description | Yes — submit media, get descriptions |
| Music Sync | Beat detection | Yes — submit media, get beat data |
| AI Enhancement | Image/video enhancement | Yes — submit media, get enhanced output |

### Decision

Replace `PluginTranscriptionAPI` with a generic **`PluginMediaProcessingAPI`** in the shared layer. All transcription/Whisper-specific types, options, and result mapping live exclusively in `plugins/auto-captions/`.

---

## 2. Dependency Rule

```
┌─────────────────────────────────────────────────────────┐
│  @revideeo/core                                          │
│  Generic interfaces only.                                │
│  No plugin-specific types, no Whisper concepts,          │
│  no language codes, no model names.                      │
└──────────────────────────────┬──────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────┐
│  src/api/types.ts (shared plugin API)                    │
│  PluginMediaProcessingAPI — generic processMedia()       │
│  MediaProcessingResult — opaque result envelope          │
│  processing:execute permission                           │
│  No transcription types, no caption types.               │
└──────────────────────────────┬──────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────┐
│  src/api/registry.ts + src/App.tsx (app implementation)  │
│  Implements processMedia():                               │
│    - Reads blob from internal MediaAsset state            │
│    - Sends to app-configured server URL                   │
│    - Returns opaque result to plugin                      │
│  Plugin never sees Blob, <video>, DOM, or server URL.    │
└──────────────────────────────┬──────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────┐
│  plugins/auto-captions/                                  │
│  ALL transcription-specific logic:                        │
│    - types.ts: TranscriptionSegment, TranscriptionResult │
│    - transcription.ts: server communication, result cast  │
│    - utils.ts: frame conversion, caption clip creation    │
│    - index.tsx: UI, orchestration                         │
│  No types leak into shared API or core.                  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Shared API: Generic Only

### 3.1 Types (in `src/api/types.ts` — NOT in `@revideeo/core`)

```typescript
// --- Generic media processing capability ---

export interface MediaProcessingResult {
  /** Name of the processor that produced this result */
  readonly processor: string;
  /** Opaque result data — the casting plugin defines the shape */
  readonly data: unknown;
  /** Optional metadata (timing, model used, etc.) */
  readonly metadata?: Record<string, unknown>;
}

export interface PluginMediaProcessingAPI {
  /**
   * Submit media assets for server-side processing.
   *
   * The server URL and processor routing are app-controlled.
   * The media blobs are resolved internally — the plugin never receives them.
   * Returns an opaque result that the plugin must cast to its expected type.
   *
   * @param mediaIds - Source IDs of media assets to process
   * @param processor - Registered processor name (e.g., 'transcribe')
   * @param params - Processor-specific parameters (opaque to shared API)
   * @returns Opaque processing result
   */
  processMedia(
    mediaIds: string[],
    processor: string,
    params?: Record<string, unknown>,
  ): Promise<MediaProcessingResult>;
}
```

### 3.2 Permission

```typescript
'processing:execute'  // allows submitting media to local server for processing
```

### 3.3 PluginContext Extension

```typescript
interface PluginContext {
  // ... existing ...
  processing?: PluginMediaProcessingAPI;  // gated behind 'processing:execute'
}
```

### 3.4 What the shared API does NOT contain

| Not in shared API | Why |
|-------------------|-----|
| `TranscriptionSegment` | Whisper-specific output format |
| `TranscriptionResult` | Caption-specific result shape |
| `TranscriptionOptions` | Whisper model/language selection |
| `language: 'pl' \| 'en' \| 'de'` | Whisper language codes |
| `model: 'tiny' \| 'base' \| 'small'` | Whisper model names |
| `transcribe()` method name | Transcription-specific |
| Any caption/timing/frame logic | Plugin business logic |

---

## 4. Plugin: All Transcription Logic

### 4.1 File Layout

```
plugins/auto-captions/
├── index.tsx              # UI component + plugin definition
├── manifest.json          # Plugin manifest with permissions
├── types.ts               # ALL transcription-specific types
├── transcription.ts       # Result casting + server param building
└── utils.ts               # Frame conversion + caption clip creation
```

### 4.2 `plugins/auto-captions/types.ts`

```typescript
/** Whisper language codes — Auto Captions-specific */
export type CaptionLanguage = 'pl' | 'en' | 'de' | 'auto';

/** Whisper model sizes — Auto Captions-specific */
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium';

/** Parameters sent to the transcription server */
export interface TranscriptionParams {
  language?: CaptionLanguage;
  model?: WhisperModel;
}

/** A single transcription segment from Whisper output */
export interface TranscriptionSegment {
  text: string;
  start: number;  // seconds
  end: number;    // seconds
}

/** Transcription result for a single clip */
export interface TranscriptionResult {
  clipId: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
}

/** Internal caption representation before clip creation */
export interface Caption {
  id: string;
  text: string;
  startFrame: number;
  durationFrames: number;
  trackIndex: number;
}
```

### 4.3 `plugins/auto-captions/transcription.ts`

```typescript
import type { MediaProcessingResult } from '../../src/api/types';
import type { TranscriptionResult, TranscriptionParams } from './types';

/** Cast opaque MediaProcessingResult to TranscriptionResult */
export function asTranscriptionResult(
  result: MediaProcessingResult,
  clipId: string,
): TranscriptionResult {
  const data = result.data as Record<string, unknown>;
  return {
    clipId,
    segments: (data.segments as { text: string; start: number; end: number }[]) ?? [],
    language: (data.language as string) ?? 'unknown',
    duration: (data.duration as number) ?? 0,
  };
}

/** Build params record from plugin-specific TranscriptionParams */
export function buildProcessingParams(params: TranscriptionParams): Record<string, unknown> {
  return {
    language: params.language ?? 'auto',
    model: params.model ?? 'small',
  };
}
```

### 4.4 `plugins/auto-captions/utils.ts`

```typescript
import type { Caption, TranscriptionSegment } from './types';

/** Convert transcription segments to timeline-aware captions */
export function segmentsToCaptions(
  segments: TranscriptionSegment[],
  clipOffsetInTimeline: number,
  fps: number,
  trackIndex: number,
): Caption[] {
  return segments
    .filter((s) => s.text.trim().length > 0)
    .map((s, i) => ({
      id: `cap-${clipOffsetInTimeline}-${i}`,
      text: s.text.trim(),
      startFrame: clipOffsetInTimeline + Math.round(s.start * fps),
      durationFrames: Math.max(1, Math.round((s.end - s.start) * fps)),
      trackIndex,
    }));
}

/** Format seconds to MM:SS.ms */
export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}
```

---

## 5. App Implementation: Blob Access + Server Communication

### 5.1 Registry Implementation

```typescript
// In registry.ts buildContext()
let processing: PluginMediaProcessingAPI | undefined;
if (hasPermission('processing:execute') && hasPermission('media:read')) {
  processing = {
    async processMedia(mediaIds, processor, params) {
      // 1. Resolve server URL (app-controlled)
      const serverUrl = getActiveRenderServerUrl();
      if (!serverUrl) throw new Error('No render server configured');

      // 2. For each media ID, get blob from internal state
      const assets = this.projectContext?.getAssets() ?? [];
      const results = [];

      for (const mediaId of mediaIds) {
        const asset = assets.find(a => a.sourceId === mediaId);
        if (!asset) throw new Error(`Media not found: ${mediaId}`);
        if (asset.blob.size === 0) throw new Error(`Media not loaded: ${mediaId}`);

        // 3. Send to server (blob NEVER enters plugin scope)
        const formData = new FormData();
        formData.append('file', asset.blob, asset.name);
        formData.append('processor', processor);
        if (params) {
          formData.append('params', JSON.stringify(params));
        }

        const response = await fetch(`${serverUrl}/api/process`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error ?? `Processing failed: ${response.status}`);
        }

        const data = await response.json();
        results.push(data as MediaProcessingResult);
      }

      return results.length === 1 ? results[0] : { processor, data: results };
    },
  };
}
```

### 5.2 Key Security Properties

| Property | Guarantee |
|----------|-----------|
| Blob never in plugin scope | Blob read from `assets` state internally; plugin receives only `MediaProcessingResult` |
| Server URL app-controlled | Plugin cannot specify endpoint; app resolves from settings |
| Processor routing app-controlled | Server maps `processor` string to internal endpoint |
| Media scoped to project | Only assets from current project are accessible |
| No external upload | Server runs locally; no data leaves machine |

---

## 6. Server Endpoint: Generic Processor

### 6.1 Updated Endpoint

```
POST /api/process
Content-Type: multipart/form-data

Fields:
  file: Blob              — media file (required)
  processor: string       — 'transcribe' (required)
  params: JSON string     — processor-specific parameters (optional)

Response 200:
{
  processor: string,
  data: { ... },         // processor-specific opaque data
  metadata: { ... }      // optional timing/model info
}
```

### 6.2 Server Router

The server maps processor names to handlers:

```javascript
// server/modules/transcribe.mjs
const PROCESSORS = {
  'transcribe': handleTranscription,
  // future: 'analyze': handleSceneAnalysis,
  // future: 'enhance': handleEnhancement,
};

app.post('/api/process', upload.single('file'), async (req, res) => {
  const processor = req.body.processor;
  const handler = PROCESSORS[processor];
  if (!handler) return res.status(400).json({ error: `Unknown processor: ${processor}` });
  // ... handle with handler(req.file, JSON.parse(req.body.params || '{}'))
});
```

---

## 7. Plugin Orchestration: Updated index.tsx

```typescript
const handleGenerate = async () => {
  setGenerating(true);
  try {
    // 1. Get FPS from public API
    const fps = context.frame?.getContext().fps ?? context.project.getConfig().fps ?? 30;

    // 2. Discover transcribable media
    const media = context.media?.list() ?? [];
    const transcribable = media.filter(m => m.kind === 'video' || m.kind === 'audio');
    if (transcribable.length === 0) { /* show error */ return; }

    // 3. Match to clips on timeline
    const allClips = context.clips.getAll();
    const targetClips = allClips.filter(c =>
      c.type !== 'text' && transcribable.some(m => m.id === c.sourceId)
    );
    if (targetClips.length === 0) { /* show error */ return; }

    // 4. Submit for processing via generic API
    const mediaIds = [...new Set(targetClips.map(c => c.sourceId))];
    const result = await context.processing?.processMedia(
      mediaIds, 'transcribe', buildProcessingParams({ language, model })
    );
    if (!result) { /* show error */ return; }

    // 5. Cast opaque result to plugin-specific type
    const transcription = asTranscriptionResult(result, mediaIds[0]);

    // 6. Convert segments → caption clips
    const captionsTrackIndex = findOrCreateCaptionsTrack();
    for (const clip of targetClips) {
      const clipResult = /* match result to clip */;
      const captions = segmentsToCaptions(
        clipResult.segments, clip.offsetInTimeline, fps, captionsTrackIndex
      );
      for (const cap of captions) {
        context.clips.add({
          type: 'text', sourceId: cap.id,
          trackIndex: cap.trackIndex,
          offsetInTimeline: cap.startFrame,
          startFrame: 0, durationInFrames: cap.durationFrames,
          text: cap.text, fontSize: Number(fontSize), fontWeight: 600,
          textColor: '#ffffff', textAlign: 'center',
          transitionIn: 'none', transitionDurationInFrames: 0,
          opacity: 1,
        });
      }
    }
  } finally {
    setGenerating(false);
  }
};
```

---

## 8. Files to Create/Modify

### New Files (2)

| File | Purpose |
|------|---------|
| `plugins/auto-captions/types.ts` | All transcription-specific types |
| `server/modules/transcribe.mjs` | `/api/process` endpoint, ffmpeg extraction, Whisper invocation |

### Modified Files (7)

| File | Change |
|------|--------|
| `plugins/auto-captions/index.tsx` | Migrate to real APIs, use plugin-local types |
| `plugins/auto-captions/manifest.json` | Add `processing:execute`, `frame:read`, `media:read` |
| `src/api/types.ts` | Add `MediaProcessingResult`, `PluginMediaProcessingAPI`, `processing:execute` |
| `src/api/registry.ts` | Implement `processing` in `buildContext()` |
| `src/App.tsx` | Wire blob access + server URL into processing implementation |
| `server/render-server.mjs` | Register transcription routes |
| `server/modules/transcribe.mjs` | NEW — server processing pipeline |

### Files NOT Modified

| File | Why |
|------|-----|
| `packages/core/src/media/api.ts` | No `getBlob()` — blob stays internal |
| `packages/core/src/media/provider.ts` | Unchanged |
| `packages/core/src/media/types.ts` | Unchanged |
| Any `@revideeo/core` file | No plugin-specific types in core |

---

## 9. Complete File Tree

```
plugins/
├── auto-captions/
│   ├── index.tsx           # UI + orchestration (MODIFIED)
│   ├── manifest.json       # Permissions (MODIFIED)
│   ├── types.ts            # Transcription types (NEW)
│   ├── transcription.ts    # Result casting (NEW — or inline in index.tsx)
│   └── utils.ts            # Frame conversion + formatTime (NEW — or inline)
│
server/
├── modules/
│   ├── transcribe.mjs      # /api/process + Whisper (NEW)
│   └── render.mjs          # (existing, unchanged)
├── render-server.mjs       # Register routes (MODIFIED)
│
src/
├── api/
│   ├── types.ts            # PluginMediaProcessingAPI (MODIFIED)
│   └── registry.ts         # processing implementation (MODIFIED)
├── App.tsx                 # Wire blob access (MODIFIED)
│
packages/core/
├── src/media/              # UNCHANGED — no getBlob
│   ├── api.ts
│   ├── provider.ts
│   └── types.ts
```

---

## 10. Test Plan

### 10.1 Shared API Tests

| Test | Description |
|------|-------------|
| `processing:execute` permission | `context.processing` available with permission |
| Without permission | `context.processing` is undefined |
| `processMedia` delegates | Calls server with correct FormData |
| Blob not exposed | Plugin receives `MediaProcessingResult`, not Blob |
| Server URL controlled | Plugin cannot override server URL |
| Unknown processor | Server returns 400 for unregistered processor |

### 10.2 Plugin Tests (`plugins/auto-captions/`)

| Test | Description |
|------|-------------|
| `asTranscriptionResult` | Correctly casts opaque data to `TranscriptionResult` |
| `buildProcessingParams` | Maps `TranscriptionParams` to `Record<string, unknown>` |
| `segmentsToCaptions` | Converts segments to frame-based `Caption[]` |
| Frame offset calculation | `startFrame = clip.offsetInTimeline + Math.round(start * fps)` |
| Duration calculation | `durationFrames = Math.round((end - start) * fps)` |
| Empty segments filtered | Segments with empty text are excluded |
| Multiple clips | Each clip's segments offset by its `offsetInTimeline` |
| `formatTime` | Correct MM:SS.ms formatting |

### 10.3 Server Tests

| Test | Description |
|------|-------------|
| `/api/process` endpoint | Accepts POST with file + processor |
| ffmpeg extraction | Extracts audio from video to WAV |
| Whisper invocation | Calls whisper with correct args |
| Temp cleanup on success | Temp files deleted |
| Temp cleanup on failure | Temp files deleted on error |
| Concurrent requests | Separate temp dirs via `randomUUID()` |
| File size limit | 500 MB max |
| MIME validation | Rejects non-audio/video |
| Timeout | 5-minute limit |
| Unknown processor | Returns 400 |

---

*Awaiting approval before implementation.*
