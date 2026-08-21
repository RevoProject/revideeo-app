# Plugin API — `src/api/`

Full plugin system with permission-based access, event bus, manifest validation, and localStorage persistence.

## Architecture

```
PluginRegistry (singleton)
  ├── registerPlugin(definition)
  ├── activatePlugin(id) → builds PluginContext → calls definition.activate(context)
  ├── deactivatePlugin(id) → calls definition.deactivate() → removes registrations
  ├── togglePlugin(id)
  ├── removePlugin(id)
  │
  ├── PluginEventBus (system events)
  ├── PluginEventBus (per-plugin events)
  │
  └── PluginRegistrySnapshot
       ├── panels, tabs, tools, contextMenus
       ├── headerButtons, settingsSections, propertySections
       ├── effects, filters, transitions, exportFormats
       ├── globalAssets, juicerExtensions
       └── dialogQueue
```

## Manifest

```json
{
  "_type": "PluginManifest",
  "_source": "src/api/types.ts",
  "id": "com.example.my-plugin",
  "_id_note": "Lowercase, alphanumeric, dots/hyphens/underscores",
  "name": "My Plugin",
  "version": "1.0.0",
  "_version_note": "Semantic versioning (X.Y.Z)",
  "description": "Plugin description",
  "author": "Author Name",
  "icon": "optional-path",
  "minApiVersion": 1,
  "_minApiVersion_note": "Minimum API version required. Default: 1",
  "permissions": ["project:read", "ui:panels"],
  "entry": "index.js"
}
```

## Permissions (21 total)

```json
{
  "_type": "PluginPermission[]",
  "_source": "src/api/types.ts",
  "project": ["project:read", "project:write"],
  "timeline": ["timeline:read", "timeline:write"],
  "clips": ["clips:read", "clips:write"],
  "assets": ["assets:read", "assets:write"],
  "effects": ["effects:register", "transitions:register", "export:register"],
  "ui": ["ui:panels", "ui:tabs", "ui:tools", "ui:context-menus", "ui:settings", "ui:header"],
  "renderer": ["renderer:read", "juicer:read"],
  "storage": ["storage:project", "storage:global"]
}
```

**`juicer:read` permission** — Required for plugins that interact with the Juicer (e.g., reading prompt history, registering prompt templates, accessing picker fields).

## PluginContext — API Surface

```json
{
  "_type": "PluginContext",
  "_source": "src/api/types.ts",
  "_description": "Object passed to plugin's activate() function",
  "ui": {
    "registerPanel": "(options: PanelRegistration) => void",
    "registerTab": "(options: TabRegistration) => void",
    "registerTool": "(options: ToolRegistration) => void",
    "registerContextMenuItems": "(options: ContextMenuRegistration) => void",
    "registerHeaderButton": "(options: HeaderButtonRegistration) => void",
    "registerSettingsSection": "(options: SettingsSectionRegistration) => void",
    "registerPropertySection": "(options: PropertySectionRegistration) => void",
    "showDialog": "(options: DialogOptions) => void"
  },
  "project": {
    "getName": "() => string",
    "getConfig": "() => ProjectConfig",
    "getTrackCount": "() => number",
    "getTrackSettings": "() => TrackSettings[]",
    "isDirty": "() => boolean",
    "markDirty": "() => void"
  },
  "timeline": {
    "getCurrentFrame": "() => number",
    "seekTo": "(frame: number) => void",
    "getTotalFrames": "() => number",
    "addMarker": "(frame: number) => void",
    "removeMarker": "(id: string) => void",
    "getMarkers": "() => TimelineMarker[]"
  },
  "clips": {
    "getAll": "() => StoredClip[]",
    "getById": "(id: string) => StoredClip | null",
    "getSelected": "() => StoredClip[]",
    "add": "(clip: Omit<StoredClip, 'id'>) => string",
    "update": "(id: string, patch: Partial<StoredClip>) => void",
    "remove": "(id: string) => void",
    "duplicate": "(id: string) => string | null",
    "split": "(id: string, frame: number) => string | null"
  },
  "effects": {
    "registerEffect": "(effect: EffectDefinition) => void",
    "registerFilter": "(filter: FilterDefinition) => void",
    "getEffects": "() => EffectDefinition[]",
    "getFilters": "() => FilterDefinition[]"
  },
  "transitions": {
    "registerTransition": "(transition: TransitionDefinition) => void",
    "getTransitions": "() => TransitionDefinition[]"
  },
  "export": {
    "registerFormat": "(format: ExportFormatDefinition) => void",
    "getFormats": "() => ExportFormatDefinition[]"
  },
  "assets": {
    "getGlobalAssets": "() => GlobalAsset[]",
    "addGlobalAsset": "(asset: GlobalAsset) => void",
    "removeGlobalAsset": "(id: string) => void"
  },
  "storage": {
    "getProjectData": "<T>(key: string) => T | null",
    "setProjectData": "<T>(key: string, value: T) => void",
    "getGlobalData": "<T>(key: string) => T | null",
    "setGlobalData": "<T>(key: string, value: T) => void"
  },
  "events": {
    "on": "(event: string, handler: Function) => void",
    "off": "(event: string, handler: Function) => void",
    "emit": "(event: string, ...args: unknown[]) => void"
  },
  "capabilities": {
    "_ref": "ReVideeoCapabilities",
    "_description": "Read-only capabilities via getCapabilities(). Limits are capabilities, not architecture.",
    "getCapabilities": "() => ReVideeoCapabilities",
    "getMaxTracks": "() => number"
  },
  "i18n": {
    "_description": "Internationalization API for plugin-localized strings",
    "registerTranslations": "(lang: string, translations: Record<string, string>) => void",
    "t": "(key: string, params?: Record<string, string>) => string",
    "getLang": "() => string"
  },
  "juicer": {
    "_description": "Juicer integration APIs (requires juicer:read permission)",
    "registerPromptTemplate": "(template: PromptTemplateRegistration) => void",
    "getPromptHistory": "() => PromptHistoryEntry[]",
    "registerPickerField": "(field: PickerFieldRegistration) => void"
  }
}
```

### i18n API

Plugins can provide localized strings for their UI elements:

```json
{
  "_type": "i18nAPI",
  "_source": "src/api/types.ts",
  "registerTranslations": {
    "description": "Register translations for a language",
    "params": ["lang: string ('pl'|'en'|'de')", "translations: Record<string, string>"],
    "example": "registerTranslations('pl', { 'my-plugin.title': 'Mój plugin' })"
  },
  "t": {
    "description": "Translate a key using registered translations or fallback",
    "params": ["key: string", "params?: Record<string, string>"],
    "example": "t('my-plugin.title') → 'Mój plugin'"
  },
  "getLang": {
    "description": "Get the current application language",
    "returns": "string ('pl'|'en'|'de')"
  }
}
```

### Juicer Template Registration

Plugins can register prompt templates that the Juicer uses for its AI-powered editing:

```json
{
  "_type": "PromptTemplateRegistration",
  "_source": "src/api/types.ts",
  "id": "my-plugin:template-id",
  "label": "Template Display Name",
  "description": "What this template does",
  "prompt": "The actual prompt text sent to the AI",
  "category": "editing",
  "pickerFields": [
    {
      "key": "style",
      "label": "Jestem {x}",
      "options": ["dynamic", "smooth", "fast"]
    }
  ]
}
```

**Picker fields** are extensible via plugins. The Juicer renders them as dropdowns with the pattern `Jestem {x}` where `{x}` is replaced by the selected option.

### PropertiesPanel Plugins View

The PropertiesPanel includes a "Zobacz pluginy" button that opens the plugins view, allowing users to browse and manage installed plugins directly from the properties panel.

## UI Registration Types

### PanelRegistration

```json
{
  "_type": "PanelRegistration",
  "_source": "src/api/types.ts",
  "id": "my-plugin:panel",
  "_id_note": "Namespaced with plugin ID prefix",
  "label": "My Panel",
  "icon": "🔧",
  "position": "right",
  "_position_note": "'left' | 'right'",
  "priority": 10,
  "_priority_note": "Higher = displayed higher in the list",
  "render": "() => ReactNode"
}
```

### ToolRegistration

```json
{
  "_type": "ToolRegistration",
  "_source": "src/api/types.ts",
  "id": "my-plugin:tool",
  "label": "My Tool",
  "icon": "⚙️",
  "priority": 10,
  "render": "(props: ToolRenderProps) => ReactNode"
}
```

### ContextMenuRegistration

```json
{
  "_type": "ContextMenuRegistration",
  "_source": "src/api/types.ts",
  "id": "my-plugin:ctx",
  "target": "clip",
  "_target_note": "'clip' | 'asset' | 'track' | 'empty' | 'transition'",
  "separator": true,
  "_separator_note": "Adds a visual separator before these items",
  "priority": 5,
  "items": [
    {
      "label": "My Action",
      "icon": "⚡",
      "danger": false,
      "action": "(context: ContextMenuActionContext) => void"
    }
  ]
}
```

## Plugin Lifecycle

```
install → load → activate ⇄ deactivate → uninstall
```

| State | Description |
|-------|-------------|
| `installed` | Registered but inactive |
| `active` | Active, extensions registered |
| `inactive` | Deactivated, extensions unregistered |
| `error` | Error during lifecycle |

## Plugin Storage

| Key | Content |
|-----|---------|
| `revideeo:plugins` | `PluginStorageEntry[]` |
| `revideeo:plugin:global:{pluginId}:{key}` | Plugin global data |
| `revideeo:plugin:project:{pluginId}:{projectId}:{key}` | Plugin project data |
