<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# JSON Structures — Complete Reference

All JSON structures used in ReVideeo with annotations.

## System Structures

### ReVideeoCapabilities

```json
{
  "_type": "ReVideeoCapabilities",
  "_source": "src/capabilities.ts",
  "_description": "System limits. Read dynamically via getCapabilities(). May change between versions.",
  "timeline": {
    "maxTracks": 5,
    "_note": "v1 limit. Will increase. Always check dynamically.",
    "maxTransitionDuration": 30,
    "minTransitionDuration": 5
  },
  "export": {
    "supportedFormats": ["mp4", "mkv", "webm"]
  },
  "ui": {
    "maxRecentExports": 30
  }
}
```

## Core Structures

### StoredClip

```json
{
  "_type": "StoredClip",
  "_source": "src/types.ts",
  "_description": "A single clip on the timeline",
  "id": "string (UUID)",
  "type": "string (optional: 'video'|'text'|'audio'|'image')",
  "sourceId": "string (UUID, references MediaAssetMeta.sourceId)",
  "trackIndex": "number (0-based)",
  "offsetInTimeline": "number (start frame on timeline)",
  "startFrame": "number (frame offset into source media)",
  "durationInFrames": "number (clip length in frames)",
  "scale": "number (1.0 = original size)",
  "posX": "number (pixels from center, negative = left)",
  "posY": "number (pixels from center, negative = up)",
  "width": "number (percentage of composition, 1-100)",
  "height": "number (percentage of composition, 1-100)",
  "groupId": "string (optional, clips with same ID move together)",
  "rotation": "number (degrees)",
  "opacity": "number (0-1)",
  "fitMode": "string ('contain'|'cover')",
  "borderRadius": "number (pixels)",
  "cropLeft": "number (percentage 0-49)",
  "cropTop": "number (percentage 0-49)",
  "cropRight": "number (percentage 0-49)",
  "cropBottom": "number (percentage 0-49)",
  "playbackRate": "number (0.25-4.0)",
  "fadeInFrames": "number (visual fade in)",
  "fadeOutFrames": "number (visual fade out)",
  "volume": "number (0.0-2.0)",
  "audioFadeInFrames": "number",
  "audioFadeOutFrames": "number",
  "text": "string (text clips only)",
  "fontSize": "number (text clips only)",
  "fontFamily": "string (text clips only)",
  "fontWeight": "number (text clips only: 400|600|700)",
  "textColor": "string (text clips only, hex color)",
  "textAlign": "string (text clips only: 'left'|'center'|'right')",
  "textBackground": "string (text clips only, CSS color)",
  "transitionIn": "string (TransitionType)",
  "transitionDurationInFrames": "number (5-30)"
}
```

### StoredProject

```json
{
  "_type": "StoredProject",
  "_source": "src/types.ts",
  "_description": "Complete project metadata (no media blobs)",
  "id": "string (UUID)",
  "name": "string",
  "savedAt": "number (Unix timestamp ms)",
  "config": { "_ref": "ProjectConfig" },
  "clips": [{ "_ref": "StoredClip" }],
  "assets": [{ "_ref": "MediaAssetMeta" }],
  "trackCount": "number (1-5, validated against getCapabilities().timeline.maxTracks)",
  "markers": [{ "_ref": "TimelineMarker" }],
  "trackSettings": [{ "_ref": "TrackSettings" }]
}
```

### ProjectConfig

```json
{
  "_type": "ProjectConfig",
  "_source": "src/types.ts",
  "resolutionLabel": "string ('360p'|'480p'|'720p'|'1080p'|'2K'|'4K')",
  "orientation": "string ('16:9'|'9:16')",
  "fps": "number (commonly 24|25|30|60)"
}
```

### MediaAssetMeta

```json
{
  "_type": "MediaAssetMeta",
  "_source": "src/types.ts",
  "sourceId": "string (UUID)",
  "name": "string (filename)",
  "durationInFrames": "number"
}
```

### TimelineMarker

```json
{
  "_type": "TimelineMarker",
  "_source": "src/types.ts",
  "id": "string (UUID)",
  "frame": "number"
}
```

### TrackSettings

```json
{
  "_type": "TrackSettings",
  "_source": "src/types.ts",
  "name": "string (display name)",
  "locked": "boolean",
  "muted": "boolean",
  "hidden": "boolean"
}
```

### AppSettings

```json
{
  "_type": "AppSettings",
  "_source": "src/types.ts",
  "autoSaveIntervalMinutes": "number (0|1|2|3|5|10|15|30)",
  "language": "string ('pl'|'en'|'de')",
  "renderServers": [{ "_ref": "RenderServer" }],
  "mobileRenderEnabled": "boolean"
}
```

### RenderServer

```json
{
  "_type": "RenderServer",
  "_source": "src/types.ts",
  "id": "string (UUID)",
  "url": "string (http://...)",
  "alias": "string (optional display name)"
}
```

## Runtime Structures

### RenderClip

```json
{
  "_type": "RenderClip",
  "_source": "src/editor/editorTypes.ts",
  "_extends": "StoredClip",
  "url": "string (blob: or http:// URL, resolved at runtime)"
}
```

### MediaAsset

```json
{
  "_type": "MediaAsset",
  "_source": "src/editor/editorTypes.ts",
  "sourceId": "string (UUID)",
  "name": "string",
  "durationInFrames": "number",
  "blob": "Blob (binary media data)",
  "thumbnails": "string[] (optional, base64 JPEG data URLs)"
}
```

### OpenProject

```json
{
  "_type": "OpenProject",
  "_source": "src/editor/editorTypes.ts",
  "_description": "In-memory project (clips/assets are separate state)",
  "id": "string (UUID)",
  "name": "string",
  "config": { "_ref": "ProjectConfig" },
  "trackCount": "number",
  "trackSettings": [{ "_ref": "TrackSettings" }]
}
```

## Juicer Structures

### JuicerSnapshot

```json
{
  "_type": "JuicerSnapshot",
  "_source": "src/juicer/",
  "_description": "Captures the full editor state before Juicer begins executing changes. Used for undo/restore.",
  "clips": [{ "_ref": "StoredClip" }],
  "trackCount": "number",
  "trackSettings": [{ "_ref": "TrackSettings" }],
  "markers": [{ "_ref": "TimelineMarker" }],
  "capturedAt": "number (Unix timestamp ms)",
  "phase": "string ('idle'|'analyzing'|'plan'|'executing'|'done')"
}
```

### PromptHistoryEntry

```json
{
  "_type": "PromptHistoryEntry",
  "_source": "src/juicer/",
  "_description": "A single entry in the Juicer prompt history, persisted in localStorage",
  "id": "string (UUID)",
  "prompt": "string (user's input text)",
  "response": "string (AI's response text)",
  "changes": [{ "_ref": "JuicerChange" }],
  "createdAt": "number (Unix timestamp ms)",
  "projectId": "string | null (null for global 'Wszystkie' tab, project ID for 'Projekt' tab)",
  "tab": "string ('Wszystkie' | 'Projekt')"
}
```

### JuicerChange

```json
{
  "_type": "JuicerChange",
  "_source": "src/juicer/",
  "_description": "A single change applied by the Juicer. Can be individually removed with confirmation.",
  "id": "string (UUID)",
  "action": "string (action type, e.g. 'addClip', 'updateClip')",
  "description": "string (human-readable description of the change)",
  "applied": "boolean (whether the change has been applied)",
  "removed": "boolean (whether the user removed this change)",
  "data": "object (action-specific data)"
}
```

### PickerField

```json
{
  "_type": "PickerField",
  "_source": "src/juicer/",
  "_description": "Extensible picker field for the Juicer. Plugins can register additional fields.",
  "key": "string (unique identifier)",
  "label": "string (display pattern, e.g. 'Jestem {x}')",
  "options": ["string (available options)"],
  "defaultValue": "string (optional, first option if not set)",
  "pluginId": "string | null (null for built-in fields, plugin ID for plugin-registered fields)"
}
```

### PromptTemplateRegistration

```json
{
  "_type": "PromptTemplateRegistration",
  "_source": "src/api/types.ts",
  "_description": "Registered by plugins via context.juicer.registerPromptTemplate()",
  "id": "string (namespaced, e.g. 'my-plugin:template-id')",
  "label": "string (display name)",
  "description": "string (what this template does)",
  "prompt": "string (prompt text sent to AI)",
  "category": "string (e.g. 'editing', 'effects', 'transitions')",
  "pickerFields": [
    {
      "key": "string",
      "label": "string (pattern with {x})",
      "options": ["string"]
    }
  ]
}
```

## Export Structures

### ExportFile (.reevproj)

```json
{
  "_type": "ExportFile",
  "_source": "src/storage.ts",
  "app": "revideeo",
  "version": 1,
  "format": "reevproj",
  "checksum": "string (SHA-256 hex)",
  "name": "string",
  "config": { "_ref": "ProjectConfig" },
  "clips": [{ "_ref": "StoredClip" }],
  "assets": [{ "_ref": "MediaAssetMeta" }],
  "trackCount": "number",
  "markers": [{ "_ref": "TimelineMarker" }],
  "trackSettings": [{ "_ref": "TrackSettings" }],
  "media": { "string": "string (data URL)" }
}
```

### VideoExportInput

```json
{
  "_type": "VideoExportInput",
  "_source": "src/export/videoExporter.ts",
  "clips": [{ "_ref": "StoredClip" }],
  "assets": [{ "sourceId": "string", "blob": "Blob" }],
  "trackSettings": [{ "_ref": "TrackSettings" }],
  "width": "number",
  "height": "number",
  "fps": "number",
  "durationInFrames": "number",
  "renderEndFrame": "number (optional)",
  "startFrame": "number (optional)",
  "format": "string ('mp4'|'mkv'|'webm')",
  "onProgress": "function (optional)",
  "signal": "AbortSignal (optional)",
  "serverUrl": "string (optional)",
  "normalize": "boolean (optional)"
}
```

### RecentExport

```json
{
  "_type": "RecentExport",
  "_source": "src/storage.ts",
  "id": "string (UUID)",
  "name": "string",
  "format": "string ('mp4'|'mkv'|'webm')",
  "blob": "Blob",
  "createdAt": "number (Unix timestamp ms)",
  "size": "number (bytes)",
  "downloaded": "boolean (optional)"
}
```

## Plugin Structures

### PluginManifest

```json
{
  "_type": "PluginManifest",
  "_source": "src/api/types.ts",
  "id": "string (lowercase, alphanumeric, dots/hyphens)",
  "name": "string",
  "version": "string (semver X.Y.Z)",
  "description": "string",
  "author": "string",
  "icon": "string (optional)",
  "minApiVersion": "number (optional, default 1)",
  "permissions": ["string (PluginPermission)"],
  "entry": "string (path to entry file)"
}
```

### RegisteredPlugin

```json
{
  "_type": "RegisteredPlugin",
  "_source": "src/api/types.ts",
  "manifest": { "_ref": "PluginManifest" },
  "state": "string ('installed'|'active'|'inactive'|'error')",
  "context": "PluginContext | null",
  "error": "string | null",
  "registeredAt": "number (Unix timestamp ms)"
}
```

### PluginStorageEntry

```json
{
  "_type": "PluginStorageEntry",
  "_source": "src/api/pluginStorage.ts",
  "id": "string (plugin ID)",
  "enabled": "boolean",
  "installedAt": "number (Unix timestamp ms)"
}
```

## Modal Structures

### AlertModal

```json
{
  "_type": "AlertModal",
  "_source": "src/components/modals/",
  "_description": "Informational dialog, replaces browser alert(). Used for messages, errors, confirmations.",
  "title": "string",
  "message": "string",
  "onClose": "() => void"
}
```

### ConfirmModal

```json
{
  "_type": "ConfirmModal",
  "_source": "src/components/modals/",
  "_description": "Confirmation dialog, replaces browser confirm(). Returns boolean.",
  "title": "string",
  "message": "string",
  "confirmLabel": "string (optional, default: 'OK')",
  "cancelLabel": "string (optional, default: 'Anuluj')",
  "danger": "boolean (optional, styles as destructive action)",
  "onConfirm": "() => void",
  "onCancel": "() => void"
}
```

### PluginsModal

```json
{
  "_type": "PluginsModal",
  "_source": "src/components/modals/",
  "_description": "Plugin management modal with search, sidebar categories, and status badges.",
  "search": "string (filter query)",
  "sidebar": "string ('Wszystkie' | 'Zainstalowane' | 'Wyłączone' | 'Serwerowe')",
  "plugins": [{ "_ref": "RegisteredPlugin" }],
  "badges": {
    "installed": "number (count)",
    "active": "number (count)",
    "inactive": "number (count)"
  }
}
```
