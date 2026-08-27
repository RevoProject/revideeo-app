# Plugin Permissions

> Reference for all available plugin permissions

## Permission List

| Permission | Grants Access To |
|------------|-----------------|
| `project:read` | Project name, config, track settings |
| `project:write` | Modify project settings |
| `timeline:read` | Timeline state, clips, tracks, playback control (`context.timelineApi`) |
| `timeline:write` | Modify timeline (seek, add markers) |
| `clips:read` | Read clip data (`context.clips.getAll()`, etc.) |
| `clips:write` | Add, update, remove clips |
| `assets:read` | Read global plugin assets |
| `assets:write` | Register global plugin assets |
| `effects:register` | Register custom video effects |
| `transitions:register` | Register custom transitions |
| `export:register` | Register export formats |
| `ui:panels` | Register side panels |
| `ui:tabs` | Register tab panels |
| `ui:tools` | Register toolbar tools |
| `ui:context-menus` | Register context menu items |
| `ui:settings` | Register settings sections |
| `ui:header` | Register header buttons |
| `renderer:read` | Access render/adapter information |
| `juicer:read` | Access Juicer prompt templates |
| `storage:project` | Per-project key-value storage |
| `storage:global` | Global key-value storage |
| `frame:read` | Frame API — composition state, pixel access (`context.frame`) |
| `media:read` | Media API — asset metadata, discovery (`context.media`) |
| `processing:execute` | Media Processing — server-side processing (`context.processing`) |

## New in v0.3.0

| Permission | API | Description |
|-----------|-----|-------------|
| `frame:read` | `context.frame` | Access project FPS, dimensions, frame data, clip pixel extraction |
| `media:read` | `context.media` | Discover and inspect project media assets (metadata only, no Blob access) |
| `processing:execute` | `context.processing` | Submit media to server-side processors (requires `media:read` additionally) |

## Permission Model

- Permissions are declared in the plugin manifest
- APIs are optional on `PluginContext` — `undefined` when permission is not granted
- Plugins must use optional chaining: `context.frame?.getContext().fps ?? 30`
- `processing:execute` additionally requires `media:read` for asset resolution
