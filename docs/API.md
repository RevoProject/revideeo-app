# ReVideeo Public API

> Version: 0.3.1

The public plugin API is accessed through `PluginContext` in the `activate(context)` callback. Each sub-API is permission-gated and available as an optional property on the context.

## APIs

| API | Context Property | Permission | Documentation |
|-----|-----------------|------------|---------------|
| Frame API | `context.frame` | `frame:read` | [api/frame.md](api/frame.md) |
| Media API | `context.media` | `media:read` | [api/media.md](api/media.md) |
| Timeline API | `context.timelineApi` | `timeline:read` | [api/timeline.md](api/timeline.md) |
| Media Processing | `context.processing` | `processing:execute` + `media:read` | [api/media-processing.md](api/media-processing.md) |
| Legacy Timeline | `context.timeline` | *(always available)* | [api/legacy-timeline.md](api/legacy-timeline.md) |
| Permissions Reference | — | — | [api/permissions.md](api/permissions.md) |

## Availability

All new APIs (`context.frame`, `context.media`, `context.timelineApi`, `context.processing`) are **optional** properties. They are `undefined` when:

- The plugin does not declare the required permission
- The required runtime provider is not available

Plugins must use optional chaining: `context.frame?.getContext().fps ?? defaultValue`

## Architecture Rule

- `@revideeo/core` contains **generic contracts only** — no plugin-specific types, no Whisper concepts, no language codes
- App-level code owns private state, media blobs, and infrastructure
- Plugin-specific types and logic remain inside `plugins/{plugin-name}/`
- The shared API layer (`src/api/types.ts`) defines generic capabilities that multiple plugins can consume

## Example

```typescript
import type { PluginDefinition } from 'src/api/types';

const myPlugin: PluginDefinition = {
  manifest: {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    permissions: ['frame:read', 'media:read'],
    // ...
  },
  activate(context) {
    // Frame API — project FPS and composition dimensions
    const fps = context.frame?.getContext().fps ?? 30;

    // Media API — discover project assets
    const media = context.media?.list() ?? [];
    const videos = media.filter(m => m.kind === 'video');

    // Timeline API — playback state and clip queries
    const state = context.timelineApi?.getState();
    const clips = context.timelineApi?.getClips() ?? [];
  },
};
```
