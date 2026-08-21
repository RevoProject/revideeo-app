# Timeline Module — `src/editor/timeline/`

Multi-track timeline with drag, trim, marquee selection, zoom, and transition management.

## Main Component — `Timeline.tsx`

### Key Props

```json
{
  "_type": "TimelineProps",
  "_source": "src/editor/timeline/Timeline.tsx",
  "clips": [{ "_ref": "StoredClip" }],
  "markers": [{ "_ref": "TimelineMarker" }],
  "assets": [{ "_ref": "MediaAsset" }],
  "totalFrames": 900,
  "currentFrame": 150,
  "fps": 30,
  "selectedClipIds": ["uuid"],
  "selectedTrack": 0,
  "trackCount": 3,
  "trackSettings": [{ "_ref": "TrackSettings" }],
  "height": 320,
  "_height_note": "Resizable timeline height in pixels",
  "mobile": false
}
```

### Key Behaviors

- Multi-track rendering: highest track index at top, track 0 at bottom
- `groupByTrack()` sorts clips by `offsetInTimeline` per track
- Drag interactions via `dragRef<TimelineDrag>`:
  - **clip**: Move clips between tracks and along timeline
  - **marquee**: Rubber-band box selection
  - **trim-left/trim-right**: Trim clip start/end
  - **transition**: Resize transition duration
- Touch pinch-to-zoom on mobile
- Auto-scroll to keep playhead visible
- Media drag-and-drop from MediaPanel using `dataTransfer.setData('application/x-revideeo', sourceId)`

## Sub-components

| Component | Purpose |
|-----------|---------|
| `TimelineControls` | Play/pause, split, add track buttons, timecode display |
| `TimelineRuler` | Time ruler with adaptive tick spacing |
| `TimelineClip` | Individual clip rendering with thumbnails and labels |
| `TrackHeader` | Track name (editable), lock/mute/hide toggles |
| `ClipTrimHandles` | Left/right trim drag handles |
| `TransitionHandle` | Transition duration drag zone between clips |
| `ClipThumbnailStrip` | Video thumbnail strip inside clips |

## Utilities

### `utils/timelineGeometry.ts`

```json
{
  "_type": "UtilityFunctions",
  "_source": "src/editor/timeline/utils/timelineGeometry.ts",
  "formatTimecode": {
    "params": ["frame: number", "fps: number"],
    "returns": "string",
    "_returns_note": "Format: 'HH:MM:SS'"
  },
  "parsePositionInput": {
    "params": ["value: string", "fps: number"],
    "returns": "number | null"
  },
  "getRulerStepSeconds": {
    "params": ["totalFrames: number", "fps: number"],
    "returns": "number",
    "_returns_note": "Adaptive tick spacing in seconds"
  }
}
```

### `utils/timelineInteraction.ts`

```json
{
  "_type": "TimelineDrag",
  "_source": "src/editor/timeline/utils/timelineInteraction.ts",
  "_description": "Discriminated union for all timeline drag interactions",
  "_variants": [
    {
      "kind": "clip",
      "clipId": "uuid",
      "clipIds": ["uuid"],
      "_note": "clipIds = all selected clips being dragged",
      "originals": [{ "id": "uuid", "offset": 0, "track": 0 }],
      "startX": 100,
      "startY": 50,
      "originalTrack": 0,
      "moved": false
    },
    {
      "kind": "marquee",
      "startX": 100,
      "startY": 50,
      "moved": false
    },
    {
      "kind": "trim-left",
      "clipId": "uuid",
      "startX": 100,
      "originalOffset": 0,
      "originalStartFrame": 0,
      "originalDuration": 300,
      "sourceDuration": 900,
      "moved": false
    },
    {
      "kind": "trim-right",
      "_note": "Same fields as trim-left",
      "moved": false
    },
    {
      "kind": "transition",
      "clipId": "uuid",
      "startX": 100,
      "startY": 50,
      "originalTd": 15,
      "moved": false
    }
  ]
}
```

### `hooks/useTimelineZoom.ts`

```json
{
  "_type": "Hook",
  "_source": "src/editor/timeline/hooks/useTimelineZoom.ts",
  "useTimelineZoom": {
    "params": ["minZoom?: number", "maxZoom?: number"],
    "returns": {
      "zoom": "number (0.25 to 4.0)",
      "zoomIn": "() => void",
      "zoomOut": "() => void",
      "setZoom": "(z: number) => void",
      "reset": "() => void"
    },
    "_note": "Handles Ctrl+/- keyboard shortcuts automatically"
  }
}
```

## Data Flow

```
App.tsx
  ├── clips: StoredClip[] ─────────→ Timeline
  ├── markers: TimelineMarker[] ───→ Timeline
  ├── assets: MediaAsset[] ────────→ Timeline (for thumbnails)
  │
  ├── onUpdateClipFromDrag ────────→ Timeline (during drag, no undo)
  ├── onClipDragEnd ───────────────→ Timeline (on drop, resolve overlaps)
  ├── onMediaDrop ─────────────────→ Timeline (creates clip from asset)
  ├── onTransitionResize ──────────→ Timeline (during transition drag)
  ├── onTransitionDrop ────────────→ Timeline (move transition to new junction)
  │
  └── Timeline → App.tsx
       ├── onSelectClip/SelectClips
       ├── onSelectTrack
       ├── onSeek
       └── onContextMenuClip/Track/Empty/Transition
```
