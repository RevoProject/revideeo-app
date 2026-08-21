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
