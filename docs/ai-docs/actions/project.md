# Project Actions

## renameProject

Rename the current project.

```json
{
  "_action": "renameProject",
  "_description": "Rename the current project",
  "name": "My Short"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | New project name |

---

## updateProjectConfig

Change project resolution, orientation, or FPS. FPS changes rescale all clips.

```json
{
  "_action": "updateProjectConfig",
  "_description": "Update project video configuration",
  "resolutionLabel": "1080p",
  "_resolutionLabel_note": "Optional. One of: '360p', '480p', '720p', '1080p', '2K', '4K'",
  "orientation": "16:9",
  "_orientation_note": "Optional. '16:9' or '9:16'",
  "fps": 30,
  "_fps_note": "Optional. Frames per second. Changes rescale all clips."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resolutionLabel` | `string` | No | Resolution preset |
| `orientation` | `string` | No | Video orientation |
| `fps` | `number` | No | Frames per second (triggers rescale) |
