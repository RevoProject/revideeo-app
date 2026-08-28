# ReVideeo Architecture

> Version: 0.3.1

## Overview

ReVideeo is a browser-first video editor with server-side rendering capabilities. The system separates concerns across three main boundaries:

1. **Application** — React UI, state management, plugin orchestration
2. **Core** (`@revideeo/core`) — Generic public contracts, render adapters, manifest processing
3. **Player** (`@revideeo/player`) — Browser-native playback, clip rendering, media registry
4. **Server** — Separate repository: render execution, AI processing, Whisper transcription

## Architecture Areas

| Area | Entry Point | Description |
|------|-------------|-------------|
| [Application](architecture/app.md) | React SPA, state management, plugin registry |
| [Core Package](architecture/core.md) | `@revideeo/core` — generic contracts, adapters, frame/media/timeline APIs |
| [Player](architecture/player.md) | `@revideeo/player` — NativePlayer, ClipRenderer, media registry |
| [Timeline](architecture/timeline.md) | Frame management, clip positioning, transitions |
| [Media](architecture/media.md) | Asset management, Media API, asset lifecycle |
| [Plugin System](architecture/plugins.md) | Plugin lifecycle, context resolution, permissions |
| [Public APIs](API.md) | Frame API, Media API, Timeline API, Media Processing |
| [AI / Juicer](ai-docs/00-index.md) | AI-powered editing, prompt templates, action schemas |
| [Media Processing](api/media-processing.md) | Server-side processing, processor registry |

## Module Dependency Graph

```
Application (src/)
  ├── @revideeo/core (packages/core/)
  │   ├── frame/      — FrameContext, ClipFrameInfo, FrameAPI
  │   ├── media/      — MediaInfo, MediaAPI
  │   ├── timeline/   — TimelineState, TimelineAPI
  │   ├── manifest/   — Project manifest, timeline computation
  │   └── adapters/   — Remotion, FFmpeg, ReVideo render adapters
  │
  ├── @revideeo/player (packages/player/)
  │   ├── NativePlayer     — RAF loop, frame display, playback control
  │   ├── ClipRenderer     — Media element rendering, seek sync
  │   ├── mediaRegistry    — DOM element → plugin bridge
  │   └── clipStyle        — CSS transform computation
  │
  ├── src/api/         — Plugin system, registry, event bus
  ├── src/frame/       — BrowserFrameProvider (canvas-based)
  ├── src/media/       — AppMediaProvider (asset state bridge)
  ├── src/timeline/    — AppTimelineProvider (state bridge)
  └── src/editor/      — Timeline UI, composition, export

Server (separate repo)
  ├── render-server.mjs  — Express server, API routes
  ├── modules/render.mjs — Remotion render execution
  ├── modules/ai.mjs     — AI provider integration
  ├── modules/transcribe.mjs — /api/process endpoint
  └── modules/plugins.mjs   — Marketplace installation
```

## Key Architectural Patterns

### Provider Pattern

New APIs (Frame, Media, Timeline, Processing) use a provider pattern:
- `@revideeo/core` defines generic interfaces (`FrameProvider`, `MediaProvider`, `TimelineProvider`)
- App-level implementations bridge internal state (`AppMediaProvider`, `AppTimelineProvider`)
- `createXContext()` factories wrap providers with derived query logic
- Plugins receive the API via `PluginContext`, never the provider directly

### Lazy Context Resolution

Plugin contexts use `Proxy`-based lazy resolution for state-dependent APIs (`frame`, `media`, `timelineApi`, `processing`). This ensures APIs resolve correctly even when plugins are activated before a project is loaded.

### Permission Gating

Every new API sub-context is gated by a permission. The plugin manifest declares required permissions; the registry only constructs the sub-API when the permission is granted.

## Further Reading

- [Public API Reference](API.md)
- [Plugin System](architecture/plugins.md)
- [Testing Strategy](TESTING.md)
