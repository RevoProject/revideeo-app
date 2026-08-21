# Storage Module — `src/storage.ts`

Dual-layer persistence: **localStorage** for metadata/settings, **IndexedDB** for binary blobs.

## localStorage Functions

### `listProjects(): StoredProject[]`
Returns all saved projects, sorted by most recently saved.

### `getProject(id: string): StoredProject | null`
Returns a single project by ID.

### `upsertProject(project: StoredProject): void`
Saves or updates a project. Sets `savedAt = Date.now()`.

### `deleteProject(id: string): void`
Deletes a project from localStorage.

### `getSettings(): AppSettings`
Returns app settings, merging with defaults.

### `saveSettings(settings: AppSettings): void`
Saves app settings.

## IndexedDB Functions

### `putMedia(projectId, sourceId, blob): Promise<void>`
Stores a media blob in IndexedDB.

### `getMedia(projectId, sourceId): Promise<Blob | null>`
Retrieves a media blob.

### `deleteProjectMedia(projectId): Promise<void>`
Deletes all media blobs for a project.

### `addRecentExport(exp: RecentExport): Promise<void>`
Stores a recent export.

### `listRecentExports(limit = 30): Promise<RecentExport[]>`
Lists recent exports sorted by creation date.

### `deleteRecentExport(id): Promise<void>`
Deletes a recent export.

### `updateRecentExport(exp): Promise<void>`
Updates a recent export (e.g., marking as downloaded).

## Blob Conversion

### `blobToDataUrl(blob): Promise<string>`
Converts Blob to data URL (base64).

### `dataUrlToBlob(dataUrl): Promise<Blob>`
Converts data URL back to Blob.

## File Import/Export

### `exportProjectFile(project, media): Promise<void>`
Creates and downloads a `.reevproj` file.

### `readProjectFile(file): Promise<{ project, media }>`
Reads and validates a `.reevproj` file.

### `createProjectPayload(project, media): Promise<ExportFile>`
Creates the JSON payload without downloading.

## Utilities

### `generateId(): string`
UUID v4 using `crypto.getRandomValues`.

### `sha256Hex(text): Promise<string>`
Pure-JS SHA-256 (works without `crypto.subtle`).

## JSON Output — `ExportFile` (.reevproj format)

```json
{
  "_type": "ExportFile",
  "_source": "src/storage.ts",
  "_description": "On-disk project format (.reevproj). JSON with embedded base64 media.",
  "app": "revideeo",
  "_app_note": "Always 'revideeo'",
  "version": 1,
  "_version_note": "File format version, currently 1",
  "format": "reevproj",
  "checksum": "hex-sha256-of-canonical-JSON-minus-checksum",
  "_checksum_note": "SHA-256 of the JSON payload (without the checksum field). Used for integrity verification.",
  "name": "Project Name",
  "config": { "_ref": "ProjectConfig" },
  "clips": [{ "_ref": "StoredClip" }],
  "assets": [{ "_ref": "MediaAssetMeta" }],
  "trackCount": 3,
  "markers": [{ "_ref": "TimelineMarker" }],
  "trackSettings": [{ "_ref": "TrackSettings" }],
  "media": {
    "sourceId1": "data:video/mp4;base64,...",
    "_media_note": "Map of sourceId → data URL. Only included when exporting with assets."
  }
}
```

## JSON Output — `RecentExport`

```json
{
  "_type": "RecentExport",
  "_source": "src/storage.ts",
  "_description": "A previously rendered video stored in IndexedDB",
  "id": "uuid",
  "name": "render-project_name",
  "format": "mp4",
  "_format_note": "'mp4' | 'mkv' | 'webm'",
  "blob": "<Blob>",
  "_blob_note": "The rendered video file as a Blob",
  "createdAt": 1700000000000,
  "_createdAt_note": "Unix timestamp in milliseconds",
  "size": 12345678,
  "_size_note": "File size in bytes",
  "downloaded": false,
  "_downloaded_note": "true after user downloads from recent exports list"
}
```

## Storage Keys Reference

| Key | Store | Content |
|-----|-------|---------|
| `revideeo:projects` | localStorage | `StoredProject[]` |
| `revideeo:settings` | localStorage | `AppSettings` |
| `revideeo:plugins` | localStorage | `PluginStorageEntry[]` |
| `revideeo:plugin:global:{pluginId}:{key}` | localStorage | Plugin global data |
| `revideeo:plugin:project:{pluginId}:{projectId}:{key}` | localStorage | Plugin project data |
| `{projectId}:{sourceId}` | IndexedDB `media` | `{ key, blob }` |
| `{id}` | IndexedDB `exports` | `RecentExport` |
