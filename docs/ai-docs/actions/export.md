<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

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
