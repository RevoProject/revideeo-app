<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Editor Types — `src/editor/editorTypes.ts`

Runtime types used in the editor that are NOT persisted to storage.

## `RenderClip`

`StoredClip` extended with a resolved URL for Remotion playback.

```json
{
  "_type": "RenderClip",
  "_source": "src/editor/editorTypes.ts",
  "_extends": "StoredClip",
  "_description": "StoredClip + resolved media URL for rendering",
  "id": "uuid",
  "type": "video",
  "sourceId": "uuid",
  "trackIndex": 0,
  "offsetInTimeline": 0,
  "startFrame": 0,
  "durationInFrames": 300,
  "scale": 1.0,
  "posX": 0,
  "posY": 0,
  "width": 100,
  "height": 100,
  "transitionIn": "none",
  "transitionDurationInFrames": 15,
  "url": "blob:http://localhost:5173/abc-123",
  "_url_note": "Resolved at runtime. 'blob:' in production, HTTP URL in dev mode."
}
```

## `OpenProject`

In-memory representation of an open project (no clips/assets — those are separate state).

```json
{
  "_type": "OpenProject",
  "_source": "src/editor/editorTypes.ts",
  "_description": "In-memory project state (clips/assets are separate React state)",
  "id": "uuid",
  "name": "My Project",
  "config": { "_ref": "ProjectConfig" },
  "trackCount": 3,
  "trackSettings": [{ "_ref": "TrackSettings" }]
}
```

## `MediaAsset`

Full in-memory media asset with binary blob and optional thumbnails.

```json
{
  "_type": "MediaAsset",
  "_source": "src/editor/editorTypes.ts",
  "_description": "In-memory media asset with binary data (not directly persisted)",
  "sourceId": "uuid",
  "_sourceId_note": "Same ID used in StoredClip.sourceId and MediaAssetMeta.sourceId",
  "name": "video_file.mp4",
  "durationInFrames": 900,
  "blob": "<Blob>",
  "_blob_note": "The actual media file as a Blob object",
  "thumbnails": ["data:image/jpeg;base64,..."],
  "_thumbnails_note": "Optional. Array of base64 JPEG thumbnail data URLs."
}
```

## `OutgoingTransition`

Used to pass transition info from one clip to the next during rendering.

```json
{
  "_type": "OutgoingTransition",
  "_source": "src/editor/editorTypes.ts",
  "_description": "Transition info for the outgoing edge of a clip",
  "transitionIn": "fade",
  "_transitionIn_note": "The transition type of the NEXT clip",
  "durationInFrames": 15,
  "_durationInFrames_note": "Duration of the transition"
}
```

## `ContextMenuTarget`

Discriminated union for context menu targets.

```json
{
  "_type": "ContextMenuTarget",
  "_source": "src/editor/editorTypes.ts",
  "_description": "Identifies what was right-clicked to open a context menu",
  "_variants": [
    { "kind": "clip", "clipId": "uuid" },
    { "kind": "asset", "sourceId": "uuid" },
    { "kind": "track", "trackIndex": 0 },
    { "kind": "empty", "trackIndex": 0 },
    { "kind": "transition", "clipId": "uuid", "trackIndex": 0 }
  ]
}
```

## `ContextMenuState`

```json
{
  "_type": "ContextMenuState",
  "_source": "src/editor/editorTypes.ts",
  "_description": "Active context menu state: target + screen coordinates, or null",
  "_note": "Type is (ContextMenuTarget & { x: number; y: number }) | null"
}
```
