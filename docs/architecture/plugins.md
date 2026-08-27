# Plugin System Architecture

## Overview

The plugin system provides a secure, permission-gated mechanism for extending ReVideeo functionality. Plugins receive a `PluginContext` with access to application capabilities through defined sub-APIs.

## Plugin Lifecycle

```
1. Registration    — Plugin manifest validated, stored
2. Activation      — buildContext() constructs PluginContext, activate() called
3. Running         — Plugin receives UI events, context callbacks
4. Deactivation    — deactivate() called, registrations cleaned up
5. Removal         — Plugin data cleaned up
```

## Context Resolution

Plugin contexts use a `Proxy`-based lazy resolution pattern:

```typescript
return new Proxy(baseContext, {
  get(target, prop) {
    if (prop === 'media') {
      // Resolve from current projectContext at access time
      const provider = self.projectContext?.getMediaProvider();
      return provider ? createMediaContext(provider) : undefined;
    }
    // ... similar for frame, timelineApi, processing
    return Reflect.get(target, prop);
  }
});
```

This ensures APIs resolve correctly even when plugins are activated before a project is loaded.

## Permission Model

Permissions are declared in the manifest and checked during context construction:

```json
{
  "permissions": ["frame:read", "media:read", "timeline:read"]
}
```

Each permission gates a specific sub-API on `PluginContext`. Without the permission, the sub-API is `undefined`.

## Architecture Boundaries

| Layer | Contains | Does NOT Contain |
|-------|----------|-----------------|
| **Core** (`@revideeo/core`) | Generic interfaces, factories | React, DOM, Blob, plugin types |
| **App** (`src/api/`) | Registry, context building, wiring | Plugin-specific logic |
| **Plugins** (`plugins/`) | Plugin-specific types, UI, logic | Internal state, Blob access |

## Plugin Directory Structure

```
plugins/
└── {plugin-name}/
    ├── index.tsx          # Plugin definition + UI components
    ├── manifest.json      # Plugin metadata and permissions
    ├── types.ts           # Plugin-specific types (if needed)
    └── utils.ts           # Plugin-specific utilities (if needed)
```
