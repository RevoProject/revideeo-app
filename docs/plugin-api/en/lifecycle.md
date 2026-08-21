# Plugin Lifecycle — Reference

## Lifecycle Diagram

```
                    ┌─────────────┐
                    │  REGISTER   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  INSTALLED  │
                    └──────┬──────┘
                           │ activate()
                    ┌──────▼──────┐
              ┌─────│   ACTIVE    │─────┐
              │     └──────┬──────┘     │
              │            │ deactivate()│
              │     ┌──────▼──────┐     │
              │     │  INACTIVE   │     │
              │     └──────┬──────┘     │
              │            │ activate() │
              │            └────────────┘
              │
              │ remove()
              └──────────┐
                    ┌─────▼──────┐
                    │ UNREGISTER │
                    └────────────┘

     At any stage, the following may occur:
                    ┌─────────────┐
                    │   ERROR     │
                    └─────────────┘
```

## Plugin States

| State | Description |
|-------|-------------|
| `installed` | Plugin registered but inactive |
| `active` | Plugin active, registers its extensions |
| `inactive` | Plugin deactivated, extensions unregistered |
| `error` | Error occurred during lifecycle |

## Lifecycle Methods

### `registerPlugin(definition)`

Registers a new plugin in the system.

```typescript
await pluginRegistry.registerPlugin({
  manifest: {
    id: 'com.example.plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Example',
    author: 'Author',
    permissions: ['ui:panels'],
    entry: 'index.js',
  },
  activate: (context) => {
    context.ui.registerPanel({
      id: 'com.example.plugin:panel',
      label: 'My Panel',
      render: () => '<div>Hello</div>',
    });
  },
  deactivate: () => {
    console.log('Plugin deactivated');
  },
});
```

### `activatePlugin(id)`

Activates an installed plugin.

```typescript
await pluginRegistry.activatePlugin('com.example.plugin');
```

### `deactivatePlugin(id)`

Deactivates an active plugin. Unregisters all its extensions.

```typescript
await pluginRegistry.deactivatePlugin('com.example.plugin');
```

### `togglePlugin(id)`

Toggles plugin state (active ↔ inactive).

```typescript
await pluginRegistry.togglePlugin('com.example.plugin');
```

### `removePlugin(id)`

Removes plugin from the system. Deactivates and deletes all data.

```typescript
await pluginRegistry.removePlugin('com.example.plugin');
```

## Lifecycle Errors

If an error occurs during `activate()` or `deactivate()`:
- Plugin state changes to `error`
- Error is stored in the plugin's `error` field
- Console shows detailed error message

```typescript
const plugin = pluginRegistry.getPlugin('com.example.plugin');
if (plugin?.state === 'error') {
  console.error('Plugin error:', plugin.error);
}
```

## State Management

### Getting Plugin List

```typescript
// All plugins
const allPlugins = pluginRegistry.getAllPlugins();

// Only active
const activePlugins = pluginRegistry.getActivePlugins();

// Single plugin
const plugin = pluginRegistry.getPlugin('com.example.plugin');
```

### State Persistence

Plugin state (enabled/disabled) is stored in `localStorage`:
- Key: `revideeo:plugins`
- Format: `[{ id: string, enabled: boolean, installedAt: number }]`
