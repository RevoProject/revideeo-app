# Plugin Quickstart

Quick start for creating a ReVideeo plugin.

## Step 1: Create the manifest

Create a `manifest.json` file:

```json
{
  "id": "com.example.my-first-plugin",
  "name": "My First Plugin",
  "version": "1.0.0",
  "description": "A simple plugin adding a panel with a button",
  "author": "John Doe",
  "permissions": ["ui:panels", "clips:read"],
  "entry": "index.js"
}
```

## Step 2: Create the plugin code

Create an `index.ts` file:

```typescript
import type { PluginDefinition } from '../src/api';

const myPlugin: PluginDefinition = {
  manifest: {
    id: 'com.example.my-first-plugin',
    name: 'My First Plugin',
    version: '1.0.0',
    description: 'A simple plugin adding a panel with a button',
    author: 'John Doe',
    permissions: ['ui:panels', 'clips:read'],
    entry: 'index.js',
  },

  activate: (context) => {
    console.log('Plugin activated!');

    // Register panel
    context.ui.registerPanel({
      id: 'com.example.my-first-plugin:panel',
      label: 'My Plugin',
      icon: '🎉',
      priority: 10,
      render: () => {
        const clips = context.clips.getAll();
        return (
          <div style={{ padding: '12px' }}>
            <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>
              My Plugin
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>
              Clip count: {clips.length}
            </p>
          </div>
        );
      },
    });
  },

  deactivate: () => {
    console.log('Plugin deactivated');
  },
};

export default myPlugin;
```

## Step 3: Install the plugin

1. Open app settings (gear icon in the header)
2. Navigate to the "Plugins" section
3. Plugin should appear in the list (if registered)

## Step 4: Test

1. Open a project
2. Go to the tools panel (right panel)
3. Click "Plugins" — your panel should appear
4. Check the browser console — "Plugin activated!" should be logged

---

## Common Patterns

### Adding an Effect

```typescript
activate: (context) => {
  context.effects.registerEffect({
    id: 'my-plugin:neon-glow',
    name: 'Neon Glow',
    apply: (clip, frame) => ({
      filter: `drop-shadow(0 0 ${10 + Math.sin(frame * 0.1) * 5}px #00f)`,
    }),
  });
},
```

### Adding a Context Menu Action

```typescript
activate: (context) => {
  context.ui.registerContextMenuItems({
    id: 'my-plugin:ctx',
    target: 'clip',
    separator: true,
    items: [
      {
        label: 'Set volume 75%',
        icon: '🔊',
        action: ({ clipId }) => {
          if (clipId) context.clips.update(clipId, { volume: 0.75 });
        },
      },
    ],
  });
},
```

### Storing Data

```typescript
activate: (context) => {
  // Save preference
  context.storage.setGlobalData('my-preference', 'dark');

  // Read preference
  const pref = context.storage.getGlobalData<string>('my-preference');
  console.log('Preference:', pref);

  // Per-project data
  context.storage.setProjectData('my-counter', 42);
},
```

### Listening to Events

```typescript
activate: (context) => {
  context.events.on('clip:created', (clip) => {
    console.log('New clip:', clip);
  });

  context.events.on('timeline:seeked', (frame) => {
    console.log('Playhead at frame:', frame);
  });
},
```

---

## Plugin Structure

```
my-plugin/
├── manifest.json      # Plugin manifest
├── index.ts           # Main plugin code
├── package.json       # Dependencies (optional)
└── README.md          # Documentation (optional)
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Plugin doesn't appear | Check that `id` is unique and properly formatted |
| Panel doesn't render | Check that you have the `ui:panels` permission |
| Effect doesn't work | Check that you have the `effects:register` permission |
| Console error | Check that `activate()` doesn't throw exceptions |
| Plugin doesn't activate | Check that `minApiVersion` is not higher than current API |
