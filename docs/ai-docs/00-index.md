# ReVideeo — AI Documentation Index

This documentation is designed for AI agents working with the ReVideeo codebase.

## Modules

| Module | File | Description |
|--------|------|-------------|
| [Domain Types](./01-domain-types.md) | `src/types.ts` | Core data structures: StoredClip, StoredProject, AppSettings, etc. |
| [Editor Types](./02-editor-types.md) | `src/editor/editorTypes.ts` | Runtime types: RenderClip, MediaAsset, ContextMenuState |
| [Storage](./03-storage.md) | `src/storage.ts` | localStorage + IndexedDB persistence layer |
| [App Core](./04-app-core.md) | `src/App.tsx` | State management, mutations, undo/redo, keyboard shortcuts, capabilities |
| [Timeline](./05-timeline.md) | `src/editor/timeline/` | Multi-track timeline, drag/trim, zoom |
| [Media Panel](./06-media-panel.md) | `src/editor/media/` | Asset import, library, text layers |
| [Properties](./07-properties.md) | `src/editor/tools/` | Clip editing, transitions, plugin tools, plugins view |
| [Composition](./08-composition.md) | `src/editor/composition/` | Remotion rendering, clip styles, transitions |
| [Export](./09-export.md) | `src/export/` | Video export, render server, format selection |
| [Plugin API](./10-plugin-api.md) | `src/api/` | Plugin system, registry, permissions, UI extensions, i18n, Juicer templates |
| [Modals](./11-modals.md) | `src/components/modals/` | AlertModal, ConfirmModal, PluginsModal |
| [Storage Keys](./12-storage-keys.md) | — | Complete localStorage + IndexedDB key reference |
| [JSON Structures](./13-json-structures.md) | — | Complete JSON structure reference with annotations |
| [AI Actions](./AI_ACTIONS.md) | — | All actions available to the Juicer AI system |

## Key Systems

### Juicer (AI Assistant)

The Juicer is the AI-powered editing assistant. It operates through 5 phases:

| Phase | Description |
|-------|-------------|
| `idle` | Awaiting user input |
| `analyzing` | Processing the user's request |
| `plan` | Presenting proposed changes for review |
| `executing` | Applying approved changes to the timeline |
| `done` | Changes complete, showing results |

**Features:**
- **Prompt history** — persisted in localStorage with tabs (Wszystkie / Projekt)
- **Picker fields** — `Jestem {x}` extensible via plugins
- **Individual change removal** — with confirmation in "Zobacz zmiany" dialog
- **DEMO_PROMPT mode** — simulation mode for testing without API calls
- **Plugin prompt templates** — plugins can register templates via `registerPromptTemplate`

### Capabilities System

Editor limits are NOT hardcoded. They are read dynamically via `getCapabilities()`:

```json
{
  "timeline": { "maxTracks": 5 },
  "export": { "supportedFormats": ["mp4", "mkv", "webm"] },
  "ui": { "maxRecentExports": 30 }
}
```

When limits change between versions, all code adapts automatically.

### Modal System

All user-facing dialogs use dedicated modal components instead of browser `alert()`/`confirm()`:

| Modal | Purpose |
|-------|---------|
| `AlertModal` | Informational messages, replacing `alert()` |
| `ConfirmModal` | Confirmation dialogs, replacing `confirm()` |
| `PluginsModal` | Plugin management with search, sidebar (Wszystkie/Zainstalowane/Wyłączone/Serwerowe), badges |

### Plugin System

Plugins extend ReVideeo via the PluginAPI with:
- 21 permissions including `juicer:read`
- i18n support (`registerTranslations`, `t()`, `getLang()`)
- Juicer prompt template registration
- "Zobacz pluginy" button in PropertiesPanel plugins view

## Conventions

### JSON Output Annotation Format

When returning JSON data in responses, use this annotation format:

```json
{
  "_type": "StoredClip",
  "_source": "src/types.ts",
  "_description": "A clip on the timeline",
  "id": "uuid",
  "type": "video",
  "sourceId": "uuid",
  "trackIndex": 0,
  "offsetInTimeline": 0,
  "startFrame": 0,
  "durationInFrames": 300,
  "scale": 1.0,
  "posX": 0,
  "posY": 0,
  "width": 100,
  "height": 100,
  "transitionIn": "none",
  "transitionDurationInFrames": 15
}
```

### Function Signature Format

When documenting functions, use:

```json
{
  "_type": "FunctionSignature",
  "_source": "src/storage.ts",
  "name": "upsertProject",
  "params": [
    { "name": "project", "type": "StoredProject", "description": "Project to save" }
  ],
  "returns": "void",
  "sideEffects": ["Writes to localStorage key 'revideeo:projects'"]
}
```
