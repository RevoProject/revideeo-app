# Media Processing

> `context.processing` — requires `processing:execute` + `media:read` permissions

## Purpose

Provides a generic, privacy-first capability for submitting media assets to server-side processors. The application handles blob access, server URL configuration, and processor routing internally. Plugins never receive raw media data.

## Access

```typescript
const result = await context.processing?.processMedia(
  ['asset-id-1', 'asset-id-2'],
  'transcribe',
  { language: 'auto', model: 'small' }
);
if (result?.ok) {
  const data = result.data; // opaque — cast to plugin-specific types
}
```

## API Surface

### `processMedia(mediaIds, processor, params): Promise<MediaProcessingResult>`

Submits media assets for server-side processing.

- **`mediaIds`**: Array of asset source IDs to process
- **`processor`**: Processor name — restricted to `VALID_PROCESSORS` whitelist (currently `['transcribe']`)
- **`params`**: Processor-specific parameters — opaque to the shared API (`Record<string, unknown>`)

### Result Type

```typescript
interface MediaProcessingSuccess {
  readonly ok: true;
  readonly processor: string;
  readonly data: unknown;              // Plugin casts to its own types
  readonly metadata?: Record<string, unknown>;
}

interface MediaProcessingError {
  readonly ok: false;
  readonly processor: string;
  readonly error: string;
  readonly code: string;               // e.g. 'UNKNOWN_PROCESSOR', 'NO_SERVER'
}

type MediaProcessingResult = MediaProcessingSuccess | MediaProcessingError;
```

## Architecture Boundaries

| Boundary | Description |
|----------|-------------|
| **Shared API** (generic) | `processMedia()`, `MediaProcessingResult`, `VALID_PROCESSORS` |
| **App layer** (internal) | Blob access, server URL, FormData construction, fetch |
| **Plugin layer** (specific) | `TranscriptionSegment`, `WhisperModel`, `CaptionLanguage` — in `plugins/auto-captions/types.ts` |

**The shared API does NOT contain:**
- Whisper-specific types or model names
- Language codes or caption formats
- Any Auto Captions domain logic
- Raw Blob or file references

## Error Codes

| Code | Meaning |
|------|---------|
| `UNKNOWN_PROCESSOR` | Processor name not in whitelist |
| `NO_SERVER` | No render server configured |
| `MEDIA_NOT_FOUND` | Asset ID not found in project |
| `MEDIA_NOT_LOADED` | Asset blob is empty |
| `SERVER_ERROR` | Server returned error |
| `NETWORK_ERROR` | Network request failed |

## Privacy

- Media blobs are resolved internally from project assets — never exposed to plugin scope
- Server URL is application-controlled (from settings) — plugins cannot override it
- Processor routing is validated against `VALID_PROCESSORS` — no arbitrary commands
- All processing runs on the local server — no external data upload
