# Export System — `src/export/`

Video export pipeline: format selection, transition computation, render server communication.

## Export Formats

```json
{
  "_type": "VideoExportFormat",
  "_source": "src/export/videoExporter.ts",
  "values": ["mp4", "mkv", "webm"],
  "labels": {
    "mp4": "MP4 (H.264)",
    "mkv": "MKV (VP9)",
    "webm": "WebM (VP9)"
  }
}
```

## Export Input

```json
{
  "_type": "VideoExportInput",
  "_source": "src/export/videoExporter.ts",
  "_description": "Complete configuration for a render request",
  "clips": [{ "_ref": "StoredClip" }],
  "assets": [{ "sourceId": "uuid", "blob": "<Blob>" }],
  "trackSettings": [{ "_ref": "TrackSettings" }],
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "durationInFrames": 900,
  "renderEndFrame": 900,
  "_renderEndFrame_note": "Optional. Final frame to render.",
  "startFrame": 1,
  "_startFrame_note": "Optional. First frame to render (for range export).",
  "format": "mp4",
  "onProgress": "(progress: number) => void",
  "_onProgress_note": "Progress callback, 0.0 to 1.0",
  "signal": "<AbortSignal>",
  "serverUrl": "http://localhost:3000",
  "normalize": false,
  "_normalize_note": "true for mobile transcoding"
}
```

## Key Functions

### `videoExporter.ts`

```json
{
  "_type": "FunctionSignature",
  "_source": "src/export/videoExporter.ts",
  "exportVideo": {
    "params": ["input: VideoExportInput"],
    "returns": "Promise<Blob>",
    "_returns_note": "The rendered video as a Blob"
  },
  "downloadVideoBlob": {
    "params": ["blob: Blob", "name: string", "format: VideoExportFormat"],
    "returns": "void",
    "_note": "Triggers browser download"
  },
  "serializeName": {
    "params": ["name: string"],
    "returns": "string",
    "_returns_note": "Filename-safe string"
  },
  "correctAssetDurationsBeforeExport": {
    "params": ["assets: {sourceId, blob}[]", "fps: number", "signal: AbortSignal"],
    "returns": "Promise<Map<string, number>>",
    "_returns_note": "Map of sourceId → true duration in frames"
  }
}
```

### `renderClient.ts`

```json
{
  "_type": "FunctionSignature",
  "_source": "src/export/renderClient.ts",
  "exportVideoViaRenderServer": {
    "params": ["input: VideoExportInput"],
    "returns": "Promise<Blob>",
    "_note": "POST /api/render → SSE progress → GET /api/render/{jobId}/file"
  },
  "exportProjectToRenderServer": {
    "params": ["project: StoredProject", "media: Record<string,Blob>", "serverUrl: string", "remoteProjectId?: string"],
    "returns": "Promise<void>",
    "_note": "POST/PUT /api/space-render/projects"
  },
  "listRemoteProjects": {
    "params": ["serverUrl: string"],
    "returns": "Promise<RemoteProjectSummary[]>"
  },
  "loadRemoteProject": {
    "params": ["id: string", "serverUrl: string"],
    "returns": "Promise<{ project: StoredProject, media: Record<string,Blob> }>"
  }
}
```

## Render Server API

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/health` | GET | — | `{ modules: { "space-render": boolean } }` |
| `/api/render` | POST | FormData: `config` (JSON) + media blobs | `{ jobId: string }` |
| `/api/render/{jobId}/events` | GET | — | SSE: `{ type: "progress", value: 0-1 }`, `{ type: "done" }`, `{ type: "error", message }` |
| `/api/render/{jobId}/file` | GET | — | Video blob download |
| `/api/render/{jobId}` | DELETE | — | Cancel render job |
| `/api/space-render/projects` | GET | — | `RemoteProjectSummary[]` |
| `/api/space-render/projects` | POST | Project JSON + media | — |
| `/api/space-render/projects/{id}` | PUT | Project JSON + media | — |
| `/api/space-render/projects/{id}` | GET | — | `{ project, media }` |

## JSON Output — `RemoteProjectSummary`

```json
{
  "_type": "RemoteProjectSummary",
  "_source": "src/export/renderClient.ts",
  "id": "uuid",
  "name": "Project Name",
  "savedAt": 1700000000000,
  "assets": 5,
  "_assets_note": "Number of media assets"
}
```
