<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# ReVideeo Plugins — Extending the Editor

Plugins let you add custom features to ReVideeo without modifying the core application.

## What Plugins Can Do

- Add custom **panels** and **tools** to the editor
- Register new **effects** and **transitions**
- Add items to **context menus**
- Register new **export formats**
- Add **header buttons** and **settings sections**
- Store custom data per-project or globally
- Add **global assets** (images, videos, sounds)
- Register **translations** for custom languages

## The Plugins Modal

Open the Plugins modal from **App Settings** (gear icon in header) by expanding the **Plugins** section.

### Search

Use the search bar at the top of the modal to quickly filter plugins by name or description.

### Sidebar Tabs

The modal sidebar provides tabs to filter the plugin list:

| Tab | Description |
|-----|-------------|
| **Wszystkie** | Shows all available plugins |
| **Zainstalowane** | Shows only installed plugins |
| **Wyłączone** | Shows plugins that are installed but disabled |
| **Serwerowe** | Shows plugins available from the connected server |

### Server Badges

Plugins fetched from a remote server display a **server badge** to indicate their origin. This makes it easy to distinguish locally installed plugins from those available for download.

## Managing Plugins

| Action | How |
|--------|-----|
| **Enable** | Click the toggle button on a plugin |
| **Disable** | Click the toggle button again |
| **Remove** | Click the trash icon |

## Plugin Status

| Status | Meaning |
|--------|---------|
| **Active** (green) | Plugin is loaded and running |
| **Inactive** | Plugin is installed but disabled |
| **Error** | Plugin failed to load (check console) |

## Using Plugin Features

Once a plugin is active, its features appear throughout the editor:

- **Panels** appear in the right sidebar under "Plugins"
- **Tools** appear when you click "Pluginy" in the tools menu
- **Context menu items** appear when you right-click clips/assets
- **Header buttons** appear in the top toolbar
- **Effects** appear in the effects/transition lists

## Creating a Plugin

See the [Plugin API Documentation](../plugin-api/en/README.md) for the full reference.

### Quick Example

```typescript
import type { PluginDefinition } from '../src/api';

export default {
  manifest: {
    id: 'com.example.my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'A custom plugin',
    author: 'Your Name',
    permissions: ['ui:panels', 'clips:read'],
    entry: 'index.js',
  },
  activate: (context) => {
    context.ui.registerPanel({
      id: 'com.example.my-plugin:panel',
      label: 'My Plugin',
      render: () => {
        const clips = context.clips.getAll();
        return <div>Clips: {clips.length}</div>;
      },
    });
  },
} satisfies PluginDefinition;
```

## Plugin Permissions

Plugins must declare what they need access to. Common permissions:

| Permission | Use Case |
|------------|----------|
| `ui:panels` | Adding panels to the UI |
| `clips:read` | Reading clip data |
| `clips:write` | Modifying clips |
| `effects:register` | Adding custom effects |
| `transitions:register` | Adding custom transitions |
| `storage:project` | Storing per-project data |
| `storage:global` | Storing global data |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Plugin doesn't appear | Check the ID is unique and properly formatted |
| Panel is empty | Check you have the `ui:panels` permission |
| Effect not working | Check you have the `effects:register` permission |
| Error in console | Open browser dev tools and check the error message |
