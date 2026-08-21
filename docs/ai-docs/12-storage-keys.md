# Storage Keys Reference

Complete reference of all localStorage and IndexedDB keys used by ReVideeo.

## localStorage Keys

| Key | Value Type | Description |
|-----|-----------|-------------|
| `revideeo:projects` | `StoredProject[]` | Array of all project metadata |
| `revideeo:settings` | `AppSettings` | Application-wide settings |
| `revideeo:plugins` | `PluginStorageEntry[]` | Installed plugin registry |
| `revideeo:plugin:global:{pluginId}:{key}` | `unknown` | Plugin global data |
| `revideeo:plugin:project:{pluginId}:{projectId}:{key}` | `unknown` | Per-project plugin data |

## IndexedDB — Database: `revideeo` (version 2)

### Object Store: `media`

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Format: `{projectId}:{sourceId}` |
| `blob` | `Blob` | The media file binary data |

### Object Store: `exports`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID, primary key |
| `name` | `string` | Filename for download |
| `format` | `string` | 'mp4' \| 'mkv' \| 'webm' |
| `blob` | `Blob` | Rendered video binary data |
| `createdAt` | `number` | Unix timestamp ms |
| `size` | `number` | File size in bytes |
| `downloaded` | `boolean` | Whether user has downloaded it |

## Key Format Patterns

```
localStorage:
  revideeo:projects                              → StoredProject[]
  revideeo:settings                              → AppSettings
  revideeo:plugins                               → PluginStorageEntry[]
  revideeo:plugin:global:{pluginId}:{key}        → any JSON
  revideeo:plugin:project:{pluginId}:{projId}:{key} → any JSON

IndexedDB media store:
  {projectId}:{sourceId}                         → { key, blob }

IndexedDB exports store:
  {uuid}                                         → RecentExport
```
