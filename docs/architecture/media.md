# Media Architecture

## Overview

The media system manages imported assets, provides metadata to plugins through the Media API, and bridges between internal blob storage and the public API surface.

## Asset Lifecycle

```
User imports file
  → Blob stored in IndexedDB (via storage.ts)
  → MediaAsset created: { sourceId, name, blob, durationInFrames, thumbnails }
  → App state updated (setAssets)
  → AppMediaProvider snapshot rebuilt (cache invalidated)
  → context.media.list() reflects new asset
```

## MediaRegistry vs MediaAPI

| System | Purpose | Scope |
|--------|---------|-------|
| `mediaRegistry` | DOM element references for pixel extraction | Internal to player |
| `MediaAPI` | Read-only metadata access for plugins | Public API |

These are separate systems that serve different purposes. The `MediaRegistry` stores live DOM elements; the `MediaAPI` returns `MediaInfo` metadata snapshots.

## MIME Type Handling

The `AppMediaProvider` infers `MediaKind` from blob MIME types:
- `video/*` → `'video'`
- `audio/*` → `'audio'`
- `image/*` → `'image'`
- Unknown → `'image'` (safe default, no silent fallthrough)
