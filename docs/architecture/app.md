# Application Architecture

## Overview

The application layer (`src/`) is a React SPA built with Vite. It manages:

- Project state (clips, tracks, assets, markers)
- Plugin system (registry, lifecycle, context resolution)
- UI components (timeline, properties, modals)
- Browser preview (NativePlayer integration)
- Export orchestration

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component — state management, plugin wiring, modal system |
| `src/api/registry.ts` | PluginRegistry — context building, permission gating, Proxy-based lazy resolution |
| `src/types.ts` | Core domain types (`StoredClip`, `StoredProject`, `ProjectConfig`) |
| `src/storage.ts` | IndexedDB persistence layer |

## Plugin Context Architecture

Plugin contexts are built via `buildContext()` in `registry.ts`. The implementation uses a `Proxy` to provide lazy resolution for state-dependent APIs (`frame`, `media`, `timelineApi`, `processing`). This ensures plugins activated before a project loads still receive valid APIs when accessed later.

```
Plugin activated (before project load)
  → buildContext() returns Proxy-based context
  → context.media === undefined (no projectContext yet)

Project loaded
  → setProjectContext() stores provider references
  → context.media resolves lazily via Proxy get trap
  → context.media.list() returns real asset data
```

## State Management

Application state lives in `App.tsx` via `useState`/`useCallback`:

| State | Type | Purpose |
|-------|------|---------|
| `project` | `StoredProject \| null` | Active project |
| `clips` | `StoredClip[]` | Timeline clips |
| `assets` | `MediaAsset[]` | Imported media |
| `currentFrame` | `number` | Playhead position |
| `isPlaying` | `boolean` | Playback state |
| `trackSettings` | `TrackSettings[]` | Track configuration |
| `markers` | `TimelineMarker[]` | Timeline markers |

State is exposed to plugins through provider closures, not direct references.
