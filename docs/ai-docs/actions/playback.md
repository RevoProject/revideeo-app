<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Playback Actions

## seekTo

Move the playhead to a specific frame.

```json
{
  "_action": "seekTo",
  "_description": "Move playhead to a specific frame",
  "frame": 150
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `frame` | `number` | Yes | Target frame (clamped to 0..totalFrames) |

---

## play

Start playback.

```json
{
  "_action": "play",
  "_description": "Start video playback"
}
```

---

## pause

Pause playback.

```json
{
  "_action": "pause",
  "_description": "Pause video playback"
}
```
