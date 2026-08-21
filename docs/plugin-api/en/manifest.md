# Plugin Manifest — Reference

## File Structure

```json
{
  "id": "string",
  "name": "string",
  "version": "string",
  "description": "string",
  "author": "string",
  "icon": "string",
  "minApiVersion": "number",
  "permissions": ["string"],
  "entry": "string"
}
```

## Fields

### `id` (required)

Unique plugin identifier.

- Format: `com.organisation.plugin-name` or `plugin-name`
- Allowed characters: lowercase, digits, dots, hyphens, underscores
- Must start and end with a letter or digit

```
✓ "com.example.my-plugin"
✓ "my-plugin"
✓ "plugin_v2"
✗ "My-Plugin"    (uppercase)
✗ "-plugin"      (starts with hyphen)
✗ "plugin-"      (ends with hyphen)
```

### `name` (required)

Display name in the UI.

```
"My Plugin"
"Advanced Effects Pack"
"Transitions Pro"
```

### `version` (required)

Plugin version in semantic versioning format (X.Y.Z).

```
"1.0.0"
"2.1.3"
"0.1.0-beta"
```

### `description` (required)

Short plugin description (max ~200 characters).

### `author` (required)

Author or organization name.

### `icon` (optional)

Path to plugin icon (relative or data URL).

### `minApiVersion` (optional)

Minimum API version required by the plugin. Default: `1`.

```json
"minApiVersion": 1
```

If the app has a lower API version than required, the plugin will not be loaded.

### `permissions` (required)

Array of required permissions.

```json
"permissions": [
  "project:read",
  "ui:panels",
  "effects:register"
]
```

### `entry` (required)

Path to plugin entry file (relative to manifest).

```
"entry": "index.js"
"entry": "dist/plugin.js"
"entry": "src/main.ts"
```

## Full Example

```json
{
  "id": "com.example.advanced-effects",
  "name": "Advanced Effects",
  "version": "1.2.0",
  "description": "Advanced video effects and transitions",
  "author": "John Doe",
  "icon": "icon.png",
  "minApiVersion": 1,
  "permissions": [
    "project:read",
    "clips:read",
    "clips:write",
    "effects:register",
    "transitions:register",
    "ui:panels",
    "ui:context-menus",
    "storage:project"
  ],
  "entry": "dist/index.js"
}
```

## Validation

The manifest is validated upon plugin registration. Validation errors:

| Error | Description |
|-------|-------------|
| `manifest.id is required` | Missing `id` field |
| `manifest.id must contain only lowercase letters...` | Invalid ID format |
| `manifest.name is required` | Missing `name` field |
| `manifest.version must follow semantic versioning` | Invalid version format |
| `manifest.description is required` | Missing `description` field |
| `manifest.author is required` | Missing `author` field |
| `manifest.entry is required` | Missing `entry` field |
| `manifest.permissions must be an array` | Permissions is not an array |
| `Invalid permission: "..."` | Unknown permission |
| `manifest.minApiVersion must be a positive integer` | Invalid API version |
