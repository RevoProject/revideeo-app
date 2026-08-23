<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Track Actions

## addTrack

Add a new track. Maximum is determined by `capabilities.timeline.maxTracks` (currently 5, may increase in future versions).

```json
{
  "_action": "addTrack",
  "_description": "Add a new track to the project",
  "above": 0,
  "_above_note": "Optional. Track index to add above. Omit to append at end."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `above` | `number` | No | Track index to insert above |

**Capability check:** Before calling, verify `trackCount < capabilities.timeline.maxTracks`.

---

## removeTrack

Remove a track. Min 1 track.

```json
{
  "_action": "removeTrack",
  "_description": "Remove a track and all its clips",
  "trackIndex": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackIndex` | `number` | Yes | Track to remove |

---

## renameTrack

Rename a track.

```json
{
  "_action": "renameTrack",
  "_description": "Rename a track",
  "trackIndex": 0,
  "name": "Main Video"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackIndex` | `number` | Yes | Track to rename |
| `name` | `string` | Yes | New name |

---

## toggleTrackLock

Toggle lock state on a track.

```json
{
  "_action": "toggleTrackLock",
  "_description": "Toggle lock on a track",
  "trackIndex": 0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackIndex` | `number` | Yes | Track to toggle |

---

## toggleTrackMute

Toggle mute state on a track.

```json
{
  "_action": "toggleTrackMute",
  "_description": "Toggle mute on a track",
  "trackIndex": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackIndex` | `number` | Yes | Track to toggle |

---

## toggleTrackHide

Toggle visibility of a track.

```json
{
  "_action": "toggleTrackHide",
  "_description": "Toggle visibility of a track",
  "trackIndex": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackIndex` | `number` | Yes | Track to toggle |
