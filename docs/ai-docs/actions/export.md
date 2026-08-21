# Export Actions

## exportProject

Export the project as a .reevproj file.

```json
{
  "_action": "exportProject",
  "_description": "Export project as .reevproj file",
  "includeAssets": true,
  "_includeAssets_note": "If true, embeds media files as base64 in the JSON."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `includeAssets` | `boolean` | No | Embed media blobs (default true) |
