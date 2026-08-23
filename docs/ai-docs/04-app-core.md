<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# App Core — `src/App.tsx`

The monolithic root component managing all editor state and orchestrating all modules.

## Capabilities System

Editor limits are NOT hardcoded — they are read from `src/capabilities.ts` via `getCapabilities()`:

```json
{
  "_type": "ReVideeoCapabilities",
  "_source": "src/capabilities.ts",
  "_description": "System limits. Read dynamically via getCapabilities(). May change between versions.",
  "timeline": {
    "maxTracks": 5,
    "_note": "v1 limit. Will increase in future. Always check dynamically.",
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

**Key principle:** Treat limits as capabilities, not architecture. The `trackCount` field is a `number` — validation uses `getMaxTracks()` which reads from capabilities. When the limit increases, all code automatically works with the new limit.

**Access patterns:**
- `getCapabilities()` — returns the full capabilities object (called by Juicer, plugins, and UI)
- `getMaxTracks()` — convenience wrapper for `capabilities.timeline.maxTracks`
- Used in track insertion/removal validation, Juicer planning, and plugin capability checks

## Key State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `project` | `OpenProject \| null` | Currently open project |
| `clips` | `StoredClip[]` | All timeline clips |
| `assets` | `MediaAsset[]` | In-memory media library |
| `markers` | `TimelineMarker[]` | Timeline markers |
| `currentFrame` | `number` | Playhead position (frames) |
| `selectedClipId` | `string \| null` | Primary selected clip |
| `selectedClipIds` | `string[]` | Multi-selection |
| `selectedTrack` | `number` | Active track index |
| `dirty` | `boolean` | Unsaved changes flag |
| `settings` | `AppSettings` | Application settings |
| `modal` | `string \| null` | Active modal ID |
| `toolView` | `ToolView` | Active properties panel tab |
| `propertiesOpen` | `boolean` | Properties panel visible |
| `isPlaying` | `boolean` | Playback state |

## Juicer Snapshot Undo

The Juicer maintains its own undo/redo mechanism separate from the main editor undo:

- **JuicerSnapshot** — captures the full clip state before Juicer begins executing changes
- When the user cancels or undoes Juicer changes, the snapshot is restored
- Individual Juicer changes can be removed via the "Zobacz zmiany" dialog with confirmation
- The snapshot does NOT interfere with the main undo/redo stack (`past`/`future` refs)

**Integration with main undo:**
- Juicer execution creates a single undo entry (not per-change)
- Undoing a Juicer operation restores the pre-Juicer snapshot
- The Juicer's internal change list is cleared on undo

## Key Callbacks

### Clip Mutations

```json
{
  "_type": "CallbackSignature",
  "_source": "src/App.tsx",
  "updateClip": {
    "params": ["id: string", "patch: Partial<StoredClip>"],
    "returns": "void",
    "sideEffects": ["Creates undo entry", "Sets dirty=true"]
  },
  "applyClipDrag": {
    "params": ["id: string", "patch: Partial<StoredClip>"],
    "returns": "void",
    "sideEffects": ["No undo entry (during drag)"]
  },
  "handleDeleteClip": {
    "params": ["id: string"],
    "returns": "void",
    "sideEffects": ["Creates undo entry", "Removes from selection"]
  },
  "cutClip": {
    "params": ["id: string"],
    "returns": "void",
    "sideEffects": ["Copies to clipboard, then deletes"]
  },
  "copyClip": {
    "params": ["id: string"],
    "returns": "void",
    "sideEffects": ["Copies to clipboard ref"]
  },
  "pasteClip": {
    "params": ["targetTrack?: number"],
    "returns": "void",
    "sideEffects": ["Creates undo entry", "Inserts at currentFrame"]
  },
  "duplicateClip": {
    "params": ["id: string"],
    "returns": "void",
    "sideEffects": ["Creates undo entry", "Places after original"]
  },
  "splitClipAt": {
    "params": ["frame: number"],
    "returns": "void",
    "sideEffects": ["Creates undo entry", "Splits clip at frame"]
  }
}
```

### Transition Mutations

```json
{
  "_type": "CallbackSignature",
  "_source": "src/App.tsx",
  "setTransitionType": {
    "params": ["clipId: string", "type: TransitionType"],
    "returns": "void",
    "sideEffects": ["Creates undo entry", "Snaps to previous clip junction"]
  },
  "applyTransitionResize": {
    "params": ["clipId: string", "td: number"],
    "returns": "void",
    "sideEffects": ["No undo entry (during drag)"]
  }
}
```

### Track Operations

```json
{
  "_type": "CallbackSignature",
  "_source": "src/App.tsx",
  "insertTrack": {
    "params": ["trackIndex: number", "above: boolean"],
    "returns": "void",
    "sideEffects": ["Respects getCapabilities().timeline.maxTracks", "Shifts clips on affected tracks"]
  },
  "removeTrack": {
    "params": ["trackIndex: number"],
    "returns": "void",
    "sideEffects": ["Min 1 track", "Removes clips on deleted track"]
  },
  "moveTrack": {
    "params": ["trackIndex: number", "direction: 1 | -1"],
    "returns": "void",
    "sideEffects": ["Swaps track settings"]
  }
}
```

### Media Operations

```json
{
  "_type": "CallbackSignature",
  "_source": "src/App.tsx",
  "addAsset": {
    "params": ["file: File"],
    "returns": "Promise<string>",
    "_returns_note": "Returns the new sourceId",
    "sideEffects": ["Probes duration", "Generates thumbnails", "Adds to assets state"]
  },
  "importFiles": {
    "params": ["files: File[]"],
    "returns": "Promise<void>",
    "sideEffects": ["Batch import with progress display"]
  },
  "removeAssetFromLibrary": {
    "params": ["sourceId: string"],
    "returns": "void",
    "sideEffects": ["Adds to undo history for restore"]
  },
  "replaceAsset": {
    "params": ["sourceId: string", "file: File"],
    "returns": "Promise<void>",
    "sideEffects": ["Re-probes duration", "Regenerates thumbnails", "Clips referencing this asset are updated"]
  }
}
```

### Project Operations

```json
{
  "_type": "CallbackSignature",
  "_source": "src/App.tsx",
  "saveProject": {
    "params": [],
    "returns": "Promise<void>",
    "sideEffects": ["Saves to localStorage + IndexedDB"]
  },
  "openProject": {
    "params": ["stored: StoredProject", "remoteId?: string"],
    "returns": "Promise<void>",
    "sideEffects": ["Loads all media blobs from IndexedDB", "Resolves URLs"]
  },
  "createProject": {
    "params": ["name: string", "config: ProjectConfig"],
    "returns": "void",
    "sideEffects": ["Resets all state", "Creates new project"]
  }
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Toggle play/pause |
| `ArrowLeft` | Seek -1 frame (-10 with Shift) |
| `ArrowRight` | Seek +1 frame (+10 with Shift) |
| `Alt+ArrowLeft` | Jump to previous clip junction |
| `Alt+ArrowRight` | Jump to next clip junction |
| `Backspace/Delete` | Delete selected clip |
| `S` | Split clip at playhead |
| `T` | Add marker at playhead |
| `F` | Cycle transition type at playhead |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |

## Undo/Redo System

- History stored in `useRef<{ past, future }>` — only clip state is tracked
- `beginEdit()` pushes current clips to `past` before each mutation
- Also tracks `deletedAssetsHistoryRef` and `replacedAssetsHistoryRef` for asset undo
- Max history depth: 100 entries
- Juicer operations create a single undo entry that restores the full pre-Juicer snapshot

## Media URL Resolution

- **Dev mode**: Assets POSTed to Vite dev server at `/__revideeo_media/{hash}` for HTTP URLs (blob: blocked in insecure mobile contexts)
- **Production**: `URL.createObjectURL()` cached in `mediaUrls` ref
- `clipsForPlayer` merges `StoredClip` with resolved URLs → `RenderClip[]`
