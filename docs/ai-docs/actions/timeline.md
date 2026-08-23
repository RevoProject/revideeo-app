<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Timeline Actions

## addClip

Add a new clip to the timeline.

```json
{
  "_action": "addClip",
  "_description": "Add a new clip to the timeline",
  "type": "video",
  "_type_note": "'video' | 'text' | 'audio' | 'image'",
  "sourceId": "uuid",
  "_sourceId_note": "Reference to a MediaAsset in the library. For text clips, use any unique ID.",
  "trackIndex": 0,
  "offsetInTimeline": 150,
  "startFrame": 0,
  "durationInFrames": 300,
  "text": "Hello World",
  "_text_note": "Only for type='text' clips"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | No | `'video' \| 'text' \| 'audio' \| 'image'` |
| `sourceId` | `string` | Yes | Media asset reference |
| `trackIndex` | `number` | Yes | Target track (0-based) |
| `offsetInTimeline` | `number` | Yes | Start frame on timeline |
| `startFrame` | `number` | No | Source frame offset (default 0) |
| `durationInFrames` | `number` | Yes | Clip length in frames |
| `text` | `string` | No | Text content (text clips only) |
| `fontSize` | `number` | No | Font size (text clips only) |
| `textColor` | `string` | No | Text color hex (text clips only) |

---

## removeClip

Remove a clip from the timeline.

```json
{
  "_action": "removeClip",
  "_description": "Remove a clip from the timeline",
  "clipId": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the clip to remove |

---

## moveClip

Move an existing clip to a new position and/or track.

```json
{
  "_action": "moveClip",
  "_description": "Move an existing clip on the timeline",
  "clipId": "uuid",
  "offsetInTimeline": 300,
  "_offsetInTimeline_note": "New start frame on timeline",
  "trackIndex": 1,
  "_trackIndex_note": "New track index (0-based)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the clip to move |
| `offsetInTimeline` | `number` | No | New timeline position |
| `trackIndex` | `number` | No | New track index |

---

## trimClip

Trim clip start or end.

```json
{
  "_action": "trimClip",
  "_description": "Trim clip start or end frame",
  "clipId": "uuid",
  "side": "left",
  "_side_note": "'left' trims start, 'right' trims end",
  "frame": 50,
  "_frame_note": "New start frame (left) or end frame (right)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the clip to trim |
| `side` | `string` | Yes | `'left' \| 'right'` |
| `frame` | `number` | Yes | New boundary frame |

---

## splitClip

Split a clip at a specific frame.

```json
{
  "_action": "splitClip",
  "_description": "Split a clip into two at the given frame",
  "clipId": "uuid",
  "frame": 200,
  "_frame_note": "Frame position to split at (must be within clip duration)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the clip to split |
| `frame` | `number` | Yes | Frame to split at |

---

## duplicateClip

Clone a clip, placing the copy after the original.

```json
{
  "_action": "duplicateClip",
  "_description": "Clone a clip, placing copy after original",
  "clipId": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the clip to duplicate |

---

## updateClip

Update properties of an existing clip.

```json
{
  "_action": "updateClip",
  "_description": "Update properties of an existing clip",
  "clipId": "uuid",
  "changes": {
    "scale": 1.2,
    "_note": "Any StoredClip field can be changed",
    "opacity": 0.8,
    "posX": 50,
    "volume": 0.5,
    "playbackRate": 1.5
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the clip to update |
| `changes` | `Partial<StoredClip>` | Yes | Fields to change |

---

## addMarker

Add a marker at a specific frame.

```json
{
  "_action": "addMarker",
  "_description": "Add a marker at a specific frame",
  "frame": 150
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `frame` | `number` | Yes | Frame position |

---

## removeMarker

Remove a marker by ID.

```json
{
  "_action": "removeMarker",
  "_description": "Remove a timeline marker",
  "markerId": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `markerId` | `string` | Yes | ID of the marker to remove |
