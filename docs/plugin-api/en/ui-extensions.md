<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Plugin UI Extensions — Reference

## Overview

Plugins can extend the editor interface with:

- **Panels** — in the right tools panel
- **Tabs** — in the media panel (left panel)
- **Tools** — in the tools menu (5 buttons)
- **Context menus** — on right-click
- **Header buttons** — in the top toolbar
- **Settings sections** — in the settings modal
- **Property sections** — in the clip properties panel
- **Dialogs** — modal dialog windows

---

## Panels

Panels displayed in the right tools panel (next to clip properties).

```typescript
context.ui.registerPanel({
  id: 'my-plugin:panel',
  label: 'My Panel',
  icon: '🔧',
  position: 'right',
  priority: 10,
  render: () => <div>Panel content</div>,
});
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | — | Unique panel ID |
| `label` | `string` | — | Display name |
| `icon` | `string` | — | Icon (emoji or path) |
| `position` | `'left' \| 'right'` | `'right'` | Position in UI |
| `priority` | `number` | `0` | Sort order (higher = higher) |
| `render` | `() => ReactNode` | — | Content render function |

---

## Tabs

Tabs displayed in the media panel (left panel).

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

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | — | Unique tab ID |
| `label` | `string` | — | Display name |
| `icon` | `string` | — | Icon |
| `position` | `'media' \| 'right'` | `'media'` | Position |
| `priority` | `number` | `0` | Sort order |
| `render` | `() => ReactNode` | — | Render function |

---

## Tools

Tools displayed in the tools menu (5 buttons in the right panel).

```typescript
context.ui.registerTool({
  id: 'my-plugin:tool',
  label: 'My Tool',
  icon: '⚙️',
  priority: 10,
  render: ({ activeClip, fps, onUpdateClip, onClose }) => (
    <div>
      <h3>Tool</h3>
      {activeClip && (
        <button onClick={() => onUpdateClip({ volume: 0.5 })}>
          Set volume 50%
        </button>
      )}
    </div>
  ),
});
```

### Render Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `activeClip` | `StoredClip \| null` | Currently selected clip |
| `clipIndex` | `number` | Clip index on track |
| `totalFrames` | `number` | Total frame count |
| `fps` | `number` | Frames per second |
| `asset` | `{ name: string } \| undefined` | Active asset info |
| `onUpdateClip` | `(patch) => void` | Update clip |
| `onClose` | `() => void` | Close panel |

---

## Context Menus

Extending context menus with additional actions.

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
      action: ({ clipId, trackIndex }) => {
        if (clipId) {
          context.clips.update(clipId, { volume: 0.5 });
        }
      },
    },
  ],
});
```

### Menu Targets

| Target | Description |
|--------|-------------|
| `'clip'` | Clip context menu |
| `'asset'` | Asset context menu |
| `'track'` | Track context menu |
| `'empty'` | Empty area context menu |
| `'transition'` | Transition context menu |

---

## Header Buttons

Buttons added to the top toolbar. The header includes a built-in "Zobacz pluginy" (View Plugins) button that opens the plugin manager. Plugins can register additional buttons around it using the `'plugins'` position.

```typescript
context.ui.registerHeaderButton({
  id: 'my-plugin:header-btn',
  label: 'My Button',
  icon: '🎯',
  position: 'end',
  priority: 5,
  onClick: () => {
    context.ui.showDialog({
      title: 'Clicked!',
      content: <div>Button was clicked</div>,
    });
  },
});
```

### Positions

| Position | Description |
|----------|-------------|
| `'before-export'` | Before the export button |
| `'after-export'` | After the export button |
| `'plugins'` | Next to the "Zobacz pluginy" (View Plugins) button |
| `'end'` | At the end of the toolbar |

---

## Settings Sections

Sections added to the app settings modal.

```typescript
context.ui.registerSettingsSection({
  id: 'my-plugin:settings',
  label: 'Plugin Settings',
  icon: '⚙️',
  priority: 10,
  render: () => (
    <div>
      <label>
        Plugin option
        <input type="checkbox" />
      </label>
    </div>
  ),
});
```

---

## Property Sections

Sections added to the clip properties panel.

```typescript
context.ui.registerPropertySection({
  id: 'my-plugin:prop-section',
  label: 'My Section',
  icon: '🎛️',
  visible: (clip) => clip.type === 'video',
  priority: 10,
  render: ({ clip, fps, onUpdateClip }) => (
    <div>
      <label>
        Custom value
        <input
          type="range"
          min={0}
          max={100}
          value={clip.volume ?? 1}
          onChange={(e) => onUpdateClip({ volume: Number(e.target.value) / 100 })}
        />
      </label>
    </div>
  ),
});
```

### Render Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `clip` | `StoredClip` | Current clip |
| `fps` | `number` | Frames per second |
| `onUpdateClip` | `(patch) => void` | Update clip |

---

## Dialogs

Modal dialog windows displayed by plugins.

```typescript
context.ui.showDialog({
  title: 'Confirmation',
  content: (
    <div>
      <p>Are you sure you want to perform this action?</p>
    </div>
  ),
  actions: [
    { label: 'Yes', variant: 'primary', onClick: () => { /* action */ } },
    { label: 'Cancel', onClick: () => {} },
  ],
});
```

### Button Variants

| Variant | Description |
|---------|-------------|
| `'default'` | Default (gray) |
| `'primary'` | Primary (blue) |
| `'danger'` | Danger (red) |
