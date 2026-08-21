# Media Actions

## addAsset

Import a media file into the library.

```json
{
  "_action": "addAsset",
  "_description": "Import a media file into the library",
  "file": "base64-encoded-data",
  "_file_note": "Base64-encoded media file or data URL",
  "name": "video.mp4",
  "_name_note": "Optional. Display name. Defaults to filename."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `string` | Yes | Base64 data URL of the media file |
| `name` | `string` | No | Display name |

---

## removeAsset

Remove an asset from the library.

```json
{
  "_action": "removeAsset",
  "_description": "Remove an asset from the library",
  "sourceId": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceId` | `string` | Yes | ID of the asset to remove |
