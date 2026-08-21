# Selection Actions

## selectClip

Select a clip.

```json
{
  "_action": "selectClip",
  "_description": "Select a clip on the timeline",
  "clipId": "uuid",
  "additive": false,
  "_additive_note": "If true, adds to current selection. If false, replaces selection."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the clip to select |
| `additive` | `boolean` | No | Add to selection (default false) |

---

## selectTrack

Select a track.

```json
{
  "_action": "selectTrack",
  "_description": "Select a track",
  "trackIndex": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackIndex` | `number` | Yes | Track to select |

---

## clearSelection

Deselect all clips.

```json
{
  "_action": "clearSelection",
  "_description": "Deselect all clips"
}
```
