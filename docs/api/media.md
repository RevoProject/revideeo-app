# Media API

> `context.media` — requires `media:read` permission

## Purpose

Provides read-only access to project media assets: discovery, metadata, and loaded state. Does not expose raw Blob, file, or DOM references.

## Access

```typescript
const assets = context.media?.list() ?? [];
const videoAssets = assets.filter(m => m.kind === 'video');
```

## API Surface

### `list(): readonly MediaInfo[]`

Returns all project media assets as read-only snapshots.

### `get(id: string): MediaInfo | null`

Returns metadata for a specific asset by its source ID.

## Data Model

```typescript
interface MediaInfo {
  readonly id: string;              // Source ID (matches clip.sourceId)
  readonly name: string;            // Display name / filename
  readonly kind: MediaKind;         // 'video' | 'audio' | 'image'
  readonly durationInFrames: number; // Duration in frames
  readonly loaded: boolean;         // Whether blob data is available
}

type MediaKind = 'video' | 'audio' | 'image';
```

## Properties

- **No thumbnail** — Thumbnail data is not included to avoid memory duplication
- **No Blob access** — Raw file data is never exposed to plugins
- **Read-only** — All fields are `readonly`; returned objects are snapshots
- **Deterministic** — Repeated calls return identical results until the asset list changes
- **Unknown MIME types** — Safely default to `image` kind (no silent fallthrough)

## Permission

Requires `media:read`. The `media:read` permission grants metadata access only. It does **not** grant access to raw Blob content. Blob access for server-side processing is handled internally by the `processing:execute` pipeline.
