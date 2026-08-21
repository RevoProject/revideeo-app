# Plugin Permissions — Reference

## Overview

The permissions system controls plugin access to editor resources. Plugins must declare required permissions in the manifest.

## Declaring Permissions

```json
{
  "id": "com.example.plugin",
  "permissions": [
    "project:read",
    "clips:read",
    "clips:write",
    "ui:panels"
  ]
}
```

## Available Permissions

### Project

| Permission | Description | Requires |
|------------|-------------|----------|
| `project:read` | Read project name, config, track settings | — |
| `project:write` | Mark project as dirty | — |

### Timeline

| Permission | Description | Requires |
|------------|-------------|----------|
| `timeline:read` | Read current frame, markers | — |
| `timeline:write` | Add/remove markers, seek | — |

### Clips

| Permission | Description | Requires |
|------------|-------------|----------|
| `clips:read` | Read all clips, get by ID | — |
| `clips:write` | Create, update, delete, duplicate, split clips | — |

### Assets

| Permission | Description | Requires |
|------------|-------------|----------|
| `assets:read` | Read global assets | — |
| `assets:write` | Add/remove global assets | — |

### Effects and Transitions

| Permission | Description | Requires |
|------------|-------------|----------|
| `effects:register` | Register effects and filters | — |
| `transitions:register` | Register transition types | — |
| `export:register` | Register export formats | — |

### UI

| Permission | Description | Requires |
|------------|-------------|----------|
| `ui:panels` | Register panels and property sections | — |
| `ui:tabs` | Register tabs | — |
| `ui:tools` | Register tools | — |
| `ui:context-menus` | Extend context menus | — |
| `ui:settings` | Register settings sections | — |
| `ui:header` | Register header buttons | — |

### Renderer and Juicer

| Permission | Description | Requires |
|------------|-------------|----------|
| `renderer:read` | Read render server info | — |
| `juicer:read` | Register Juicer extensions | — |

### Storage

| Permission | Description | Requires |
|------------|-------------|----------|
| `storage:project` | Store per-project data | — |
| `storage:global` | Store global data | — |

## Security Rules

1. **Least privilege** — Plugin should only declare permissions it actually needs
2. **Validation** — Unknown permissions cause manifest validation error
3. **Isolation** — Plugin has no access to API it didn't declare
4. **Runtime check** — Permissions are checked on every operation

## Examples

### Read-only Plugin

```json
{
  "permissions": ["project:read", "clips:read", "timeline:read"]
}
```

### Full Access Plugin

```json
{
  "permissions": [
    "project:read", "project:write",
    "timeline:read", "timeline:write",
    "clips:read", "clips:write",
    "assets:read", "assets:write",
    "effects:register", "transitions:register", "export:register",
    "ui:panels", "ui:tabs", "ui:tools", "ui:context-menus", "ui:settings", "ui:header",
    "renderer:read", "juicer:read",
    "storage:project", "storage:global"
  ]
}
```

### Effects Plugin

```json
{
  "permissions": [
    "effects:register",
    "transitions:register",
    "clips:read",
    "ui:panels"
  ]
}
```
