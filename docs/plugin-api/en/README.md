<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# ReVideeo Plugin API

## Table of Contents

1. [Overview](#overview)
2. [Plugin Manifest](#plugin-manifest)
3. [Plugin Lifecycle](#plugin-lifecycle)
4. [API Reference](#api-reference)
5. [I18n API](#i18n-api-contexti18n)
6. [Capabilities](#capabilities-contextcapabilities)
7. [Juicer API](#juicer-api-contextjuicer)
8. [Permissions](#permissions)
9. [Backward Compatibility](#backward-compatibility)
10. [Examples](#examples)

---

## Overview

The Plugin API allows extending the ReVideeo editor with new features without modifying the source code. Plugins can:

- Add custom panels, tabs, and tools to the UI
- Register new effects, transitions, and export formats
- Work with projects, timeline, and clips
- Add items to context menus
- Register header buttons
- Add sections to app settings and clip properties
- Store data globally and per-project
- Add new connection types (external operators)
- Add assets (photos, videos, SFX) globally

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  ReVideeo Editor                 │
├─────────────────────────────────────────────────┤
│              Plugin System Core                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Registry  │  │ EventBus │  │   Storage    │  │
│  └───────────┘  └──────────┘  └──────────────┘  │
├─────────────────────────────────────────────────┤
│              Plugin API Layer                    │
│  ┌────┐ ┌────────┐ ┌────────┐ ┌──────────────┐ │
│  │ UI │ │Project │ │Timeline│ │ Effects/Trans │ │
│  └────┘ └────────┘ └────────┘ └──────────────┘ │
│  ┌────────┐ ┌──────┐ ┌───────┐ ┌───────────┐  │
│  │ Assets │ │Export│ │Juicer │ │ Renderer  │  │
│  └────────┘ └──────┘ └───────┘ └───────────┘  │
├─────────────────────────────────────────────────┤
│              Plugin Instances                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Plugin 1 │ │ Plugin 2 │ │ Plugin 3 │  ...   │
│  └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────┘
```

---

## Plugin Manifest

Every plugin must have a manifest (JSON) describing its metadata.

### Manifest Structure

```json
{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Author Name",
  "icon": "path/to/icon.png",
  "minApiVersion": 1,
  "permissions": [
    "project:read",
    "timeline:read",
    "clips:read",
    "ui:panels"
  ],
  "i18n": {
    "en": {
      "pluginName": "My Plugin",
      "pluginDescription": "Plugin description"
    },
    "pl": {
      "pluginName": "Mój Plugin",
      "pluginDescription": "Opis pluginu"
    }
  },
  "entry": "index.js"
}
```

### Manifest Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique plugin identifier (lowercase, separated by dots/hyphens) |
| `name` | `string` | Yes | Display name |
| `version` | `string` | Yes | Semantic version (X.Y.Z) |
| `description` | `string` | Yes | Short description |
| `author` | `string` | Yes | Author name |
| `icon` | `string` | No | Path to icon |
| `minApiVersion` | `number` | No | Minimum API version (default 1) |
| `permissions` | `string[]` | Yes | Required permissions |
| `i18n` | `Record<string, Record<string, string>>` | No | Translation keys per language code |
| `entry` | `string` | Yes | Path to plugin entry file |

---

## Plugin Lifecycle

A plugin goes through the following phases:

```
install → load → activate ⇄ deactivate → update → uninstall
```

### Lifecycle Phases

1. **install** — Plugin is registered in the system. Manifest is validated.
2. **load** — Plugin is loaded into memory. Code is interpreted.
3. **activate** — Plugin is activated. It registers its extensions (UI, effects, etc.).
4. **deactivate** — Plugin is deactivated. It unregisters its extensions.
5. **update** — Plugin is updated to a new version.
6. **uninstall** — Plugin is removed from the system.

### Lifecycle Management

```typescript
import { pluginRegistry } from './api';

// Register plugin
await pluginRegistry.registerPlugin({
  manifest: myManifest,
  activate: (context) => {
    // Activation — register extensions
    context.ui.registerPanel({ id: 'my-panel', label: 'My Panel', render: () => <MyComponent /> });
  },
  deactivate: () => {
    // Deactivation — cleanup
  },
});

// Toggle state
await pluginRegistry.togglePlugin('com.example.my-plugin');

// Remove
await pluginRegistry.removePlugin('com.example.my-plugin');
```

---

## API Reference

### PluginContext

The object passed to the plugin's `activate` function. Contains all sub-APIs.

```typescript
interface PluginContext {
  ui: PluginUIAPI;
  project: PluginProjectAPI;
  timeline: PluginTimelineAPI;
  clips: PluginClipsAPI;
  effects: PluginEffectsAPI;
  transitions: PluginTransitionsAPI;
  export: PluginExportAPI;
  assets: PluginAssetsAPI;
  renderer: PluginRendererAPI;
  juicer: PluginJuicerAPI;
  storage: PluginStorageAPI;
  events: PluginEventAPI;
  i18n: PluginI18nAPI;
  capabilities: ReVideeoCapabilities;
}
```

---

### UI API (`context.ui`)

#### `registerPanel(options)`

Registers a new panel in the right tools panel.

```typescript
context.ui.registerPanel({
  id: 'my-plugin:panel',
  label: 'My Panel',
  icon: '🔧',
  position: 'right',
  priority: 10,
  render: () => <div>My content</div>,
});
```

#### `registerTab(options)`

Registers a new tab in the media panel.

```typescript
context.ui.registerTab({
  id: 'my-plugin:tab',
  label: 'My Tab',
  icon: '📁',
  position: 'media',
  priority: 5,
  render: () => <div>Tab content</div>,
});
```

#### `registerTool(options)`

Registers a new tool in the tools menu.

```typescript
context.ui.registerTool({
  id: 'my-plugin:tool',
  label: 'My Tool',
  icon: '⚙️',
  priority: 10,
  render: ({ activeClip, onUpdateClip }) => (
    <div>
      {/* Tool panel */}
    </div>
  ),
});
```

#### `registerContextMenuItems(options)`

Adds items to context menus.

```typescript
context.ui.registerContextMenuItems({
  id: 'my-plugin:ctx-clip',
  target: 'clip',
  separator: true,
  priority: 5,
  items: [
    {
      label: 'My action',
      icon: '⚡',
      action: ({ clipId }) => {
        // Execute action
      },
    },
  ],
});
```

#### `registerHeaderButton(options)`

Registers a button in the app header.

```typescript
context.ui.registerHeaderButton({
  id: 'my-plugin:header-btn',
  label: 'My Button',
  icon: '🎯',
  position: 'end',
  priority: 5,
  onClick: () => {
    // Click handler
  },
});
```

#### `registerSettingsSection(options)`

Registers a section in the app settings.

```typescript
context.ui.registerSettingsSection({
  id: 'my-plugin:settings',
  label: 'Plugin Settings',
  icon: '⚙️',
  priority: 10,
  render: () => <div>Settings</div>,
});
```

#### `registerPropertySection(options)`

Registers a section in the clip properties panel.

```typescript
context.ui.registerPropertySection({
  id: 'my-plugin:prop-section',
  label: 'My Section',
  icon: '🎛️',
  visible: (clip) => clip.type === 'video',
  priority: 10,
  render: ({ clip, fps, onUpdateClip }) => (
    <div>
      {/* Plugin-specific properties */}
    </div>
  ),
});
```

#### `showDialog(options)`

Displays a modal dialog.

```typescript
context.ui.showDialog({
  title: 'Dialog title',
  content: <div>Content</div>,
  actions: [
    { label: 'OK', variant: 'primary', onClick: () => {} },
    { label: 'Cancel', onClick: () => {} },
  ],
});
```

---

### Project API (`context.project`)

```typescript
context.project.getName();           // string
context.project.getConfig();         // { resolutionLabel, orientation, fps }
context.project.getTrackCount();     // number
context.project.getTrackSettings();  // TrackSettings[]
context.project.isDirty();           // boolean
context.project.markDirty();         // void
```

---

### Timeline API (`context.timeline`)

```typescript
context.timeline.getCurrentFrame();  // number
context.timeline.seekTo(frame);      // void
context.timeline.getTotalFrames();   // number
context.timeline.addMarker(frame);   // void
context.timeline.removeMarker(id);   // void
context.timeline.getMarkers();       // { id, frame }[]
```

---

### Clips API (`context.clips`)

```typescript
context.clips.getAll();              // StoredClip[]
context.clips.getById(id);           // StoredClip | null
context.clips.getSelected();         // StoredClip[]
context.clips.add(clip);            // string (new clip id)
context.clips.update(id, patch);    // void
context.clips.remove(id);           // void
context.clips.duplicate(id);        // string | null
context.clips.split(id, frame);     // string | null
```

---

### Effects API (`context.effects`)

```typescript
context.effects.registerEffect({
  id: 'my-plugin:glitch',
  name: 'Glitch Effect',
  icon: '💥',
  apply: (clip, frame) => ({
    filter: `hue-rotate(${Math.sin(frame * 0.1) * 30}deg)`,
  }),
});

context.effects.registerFilter({
  id: 'my-plugin:vintage',
  name: 'Vintage',
  icon: '📷',
  cssFilter: 'sepia(0.5) contrast(1.1)',
});
```

---

### Transitions API (`context.transitions`)

```typescript
context.transitions.registerTransition({
  type: 'fade' as TransitionType,
  label: 'Custom Fade',
  icon: '✨',
  apply: (progress) => ({
    opacity: progress,
    filter: `blur(${(1 - progress) * 5}px)`,
  }),
});
```

---

### Export API (`context.export`)

```typescript
context.export.registerFormat({
  id: 'my-plugin:gif',
  label: 'GIF',
  extension: 'gif',
  mimeType: 'image/gif',
  render: async (config) => {
    // Render logic
    return blob;
  },
});
```

---

### Assets API (`context.assets`)

```typescript
// Global assets (for all projects)
context.assets.getGlobalAssets();
context.assets.addGlobalAsset({
  id: 'my-plugin:asset-1',
  name: 'My Photo',
  category: 'Photos',
  blob: fileBlob,
  thumbnail: 'data:image/jpeg;base64,...',
});
context.assets.removeGlobalAsset('my-plugin:asset-1');
```

---

### Storage API (`context.storage`)

```typescript
// Per-project data
context.storage.getProjectData('my-key');           // T | null
context.storage.setProjectData('my-key', myValue);  // void

// Global data (across projects)
context.storage.getGlobalData('my-key');            // T | null
context.storage.setGlobalData('my-key', myValue);   // void
```

---

### Events API (`context.events`)

```typescript
context.events.on('clip:created', (clip) => { /* ... */ });
context.events.on('clip:updated', (clip) => { /* ... */ });
context.events.on('clip:removed', (clipId) => { /* ... */ });
context.events.on('timeline:seeked', (frame) => { /* ... */ });
context.events.on('project:saved', () => { /* ... */ });

context.events.emit('custom-event', data);
context.events.off('custom-event', handler);
```

---

### I18n API (`context.i18n`)

Provides internationalization support for plugins. Translations can be declared in the manifest via the `i18n` field, or registered programmatically.

#### `registerTranslations(lang, translations)`

Registers translation keys for a given language.

```typescript
context.i18n.registerTranslations('en', {
  'my-plugin:greeting': 'Hello!',
  'my-plugin:description': 'This is my plugin',
});

context.i18n.registerTranslations('pl', {
  'my-plugin:greeting': 'Cześć!',
  'my-plugin:description': 'To jest mój plugin',
});
```

#### `t(key, vars?)`

Returns a translated string for the current language. Supports interpolation with `{{var}}` syntax.

```typescript
const label = context.i18n.t('my-plugin:greeting'); // "Hello!" (if lang is 'en')
const msg = context.i18n.t('my-plugin:count', { count: 5 }); // "5 items"
```

#### `getLang()`

Returns the current active language code.

```typescript
const lang = context.i18n.getLang(); // 'en'
```

#### `getAvailableLangs()`

Returns an array of available language codes.

```typescript
const langs = context.i18n.getAvailableLangs(); // ['en', 'pl', 'de']
```

#### Manifest i18n

Plugins can declare translations directly in the manifest:

```json
{
  "id": "com.example.my-plugin",
  "i18n": {
    "en": {
      "pluginName": "My Plugin",
      "pluginDescription": "A useful plugin",
      "greeting": "Hello!"
    },
    "pl": {
      "pluginName": "Mój Plugin",
      "pluginDescription": "Przydatny plugin",
      "greeting": "Cześć!"
    }
  }
}
```

Manifest translations are automatically merged with any programmatically registered translations.

---

### Capabilities (`context.capabilities`)

A read-only object describing the current ReVideeo environment capabilities. Plugins can use this to adapt behavior based on available features.

```typescript
interface ReVideeoCapabilities {
  /** Whether hardware acceleration is available */
  hardwareAcceleration: boolean;
  /** Maximum number of tracks supported */
  maxTracks: number;
  /** Supported export formats */
  supportedFormats: string[];
  /** Whether the renderer service is available */
  rendererAvailable: boolean;
  /** Whether GPU effects are available */
  gpuEffectsAvailable: boolean;
  /** Maximum supported resolution */
  maxResolution: { width: number; height: number };
  /** Platform identifier */
  platform: 'web' | 'desktop' | 'mobile';
}
```

#### Example: Adapting to capabilities

```typescript
activate: (context) => {
  if (context.capabilities.gpuEffectsAvailable) {
    // Register GPU-accelerated effect
    context.effects.registerEffect({ id: 'my-plugin:gpu-effect', ... });
  } else {
    // Register CPU fallback effect
    context.effects.registerEffect({ id: 'my-plugin:cpu-effect', ... });
  }
}
```

---

### Juicer API (`context.juicer`)

The Juicer API allows plugins to extend the Juicer prompt generation system.

#### `registerPromptTemplate(options)`

Registers a custom prompt template that can be used by Juicer.

```typescript
context.juicer.registerPromptTemplate({
  id: 'my-plugin:summarize',
  name: 'Summarize',
  description: 'Summarize the selected clips',
  icon: '📝',
  variables: [
    {
      name: 'style',
      label: 'Summary Style',
      type: 'select',
      options: [
        { value: 'brief', label: 'Brief' },
        { value: 'detailed', label: 'Detailed' },
      ],
      default: 'brief',
    },
  ],
  render: (variables) => {
    return `Summarize the following clips in a ${variables.style} manner.`;
  },
});
```

#### Template Variables

| Variable Type | Description |
|---------------|-------------|
| `'text'` | Free text input |
| `'select'` | Dropdown selection |
| `'number'` | Numeric input |
| `'boolean'` | Toggle switch |

---

## Permissions

Plugins must declare required permissions in the manifest.

### Available Permissions

| Permission | Description |
|------------|-------------|
| `project:read` | Read project data |
| `project:write` | Write project data |
| `timeline:read` | Read timeline data |
| `timeline:write` | Write timeline data (markers) |
| `clips:read` | Read clips |
| `clips:write` | Create, modify, delete clips |
| `assets:read` | Read assets |
| `assets:write` | Manage global assets |
| `effects:register` | Register effects and filters |
| `transitions:register` | Register transition types |
| `export:register` | Register export formats |
| `ui:panels` | Register panels |
| `ui:tabs` | Register tabs |
| `ui:tools` | Register tools |
| `ui:context-menus` | Extend context menus |
| `ui:settings` | Register settings sections |
| `ui:header` | Register header buttons |
| `renderer:read` | Read render server info |
| `juicer:read` | Register Juicer extensions |
| `storage:project` | Store per-project data |
| `storage:global` | Store global data |

### Example Manifest with Permissions

```json
{
  "id": "com.example.advanced-effects",
  "name": "Advanced Effects",
  "version": "1.0.0",
  "description": "Advanced video effects",
  "author": "John Doe",
  "permissions": [
    "effects:register",
    "transitions:register",
    "ui:panels",
    "clips:read"
  ],
  "entry": "index.js"
}
```

---

## Backward Compatibility

### API Versioning

The Plugin API uses semantic versioning. The API version number is independent of the app version.

- **Major** — Breaking changes, backward incompatibility
- **Minor** — New features, backward compatible
- **Patch** — Bug fixes

### Compatibility Strategy

1. **`minApiVersion` field** — Plugin declares the minimum API version it is compatible with
2. **Deprecation warnings** — Deprecated API is marked as deprecated but still works
3. **Adapters** — Future: adapters for older API versions

```typescript
// Plugin requires API v1
{
  "minApiVersion": 1,
  ...
}
```

### When API Is Incompatible

If a plugin requires a higher API version than available:
- Plugin will not be loaded
- A message about the required version will be displayed
- Plugin remains in `installed` state but is not active

---

## Examples

### Minimal Plugin

```typescript
// manifest.json
{
  "id": "com.example.hello",
  "name": "Hello Plugin",
  "version": "1.0.0",
  "description": "Example plugin",
  "author": "John Doe",
  "permissions": ["ui:panels"],
  "entry": "index.js"
}

// index.ts
import type { PluginDefinition } from '../api';

export default {
  manifest: {
    id: 'com.example.hello',
    name: 'Hello Plugin',
    version: '1.0.0',
    description: 'Example plugin',
    author: 'John Doe',
    permissions: ['ui:panels'],
    entry: 'index.js',
  },
  activate: (context) => {
    context.ui.registerPanel({
      id: 'com.example.hello:panel',
      label: 'Hello Panel',
      render: () => '<div>Hello from plugin!</div>',
    });
  },
} satisfies PluginDefinition;
```

### Plugin with Effects

```typescript
export default {
  manifest: {
    id: 'com.example.effects',
    name: 'Custom Effects',
    version: '1.0.0',
    description: 'Custom effects',
    author: 'John Doe',
    permissions: ['effects:register', 'clips:read'],
    entry: 'index.js',
  },
  activate: (context) => {
    context.effects.registerEffect({
      id: 'com.example.effects:rainbow',
      name: 'Rainbow',
      apply: (clip, frame) => ({
        filter: `hue-rotate(${(frame * 3) % 360}deg)`,
      }),
    });

    context.effects.registerFilter({
      id: 'com.example.effects:cinematic',
      name: 'Cinematic',
      cssFilter: 'contrast(1.2) saturate(1.3) brightness(0.9)',
    });
  },
} satisfies PluginDefinition;
```

### Plugin with Context Menu

```typescript
export default {
  manifest: {
    id: 'com.example.context-actions',
    name: 'Context Actions',
    version: '1.0.0',
    description: 'Additional context menu actions',
    author: 'John Doe',
    permissions: ['ui:context-menus', 'clips:read', 'clips:write'],
    entry: 'index.js',
  },
  activate: (context) => {
    context.ui.registerContextMenuItems({
      id: 'com.example.context-actions:clip',
      target: 'clip',
      separator: true,
      items: [
        {
          label: 'Trim to 5s',
          icon: '✂️',
          action: ({ clipId }) => {
            if (clipId) {
              context.clips.update(clipId, { durationInFrames: 150 });
            }
          },
        },
        {
          label: 'Set volume 50%',
          icon: '🔊',
          action: ({ clipId }) => {
            if (clipId) {
              context.clips.update(clipId, { volume: 0.5 });
            }
          },
        },
      ],
    });
  },
} satisfies PluginDefinition;
```
