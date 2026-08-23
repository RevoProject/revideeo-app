<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Plugin Actions

## registerEffect

Register a custom visual effect via the plugin API.

```json
{
  "_action": "registerEffect",
  "_description": "Register a custom visual effect",
  "pluginId": "com.example.plugin",
  "effectId": "my-effect",
  "name": "My Effect",
  "cssFilter": "hue-rotate(90deg)",
  "_cssFilter_note": "CSS filter string applied to the clip"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pluginId` | `string` | Yes | Plugin registering the effect |
| `effectId` | `string` | Yes | Unique effect ID |
| `name` | `string` | Yes | Display name |
| `cssFilter` | `string` | Yes | CSS filter value |

---

## registerTransition

Register a custom transition type via the plugin API.

```json
{
  "_action": "registerTransition",
  "_description": "Register a custom transition type",
  "pluginId": "com.example.plugin",
  "type": "fade",
  "_type_note": "Must be a valid TransitionType value",
  "label": "My Transition"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pluginId` | `string` | Yes | Plugin registering the transition |
| `type` | `string` | Yes | Transition type key |
| `label` | `string` | Yes | Display name |

---

## registerPromptTemplate

Register a prompt template for the Juicer AI assistant. Requires `juicer:read` permission.

```json
{
  "_action": "registerPromptTemplate",
  "_description": "Register a Juicer prompt template",
  "pluginId": "com.example.plugin",
  "templateId": "my-plugin:auto-color",
  "label": "Auto Color Correction",
  "description": "Automatically adjust clip colors",
  "prompt": "Analyze the selected clips and apply color correction based on their content. Adjust brightness, contrast, and saturation for optimal visual quality.",
  "category": "editing",
  "pickerFields": [
    {
      "key": "intensity",
      "label": "Jestem {x}",
      "options": ["subtle", "moderate", "strong"]
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pluginId` | `string` | Yes | Plugin registering the template |
| `templateId` | `string` | Yes | Unique template ID (namespaced with plugin ID) |
| `label` | `string` | Yes | Display name in Juicer UI |
| `description` | `string` | Yes | Short description of what the template does |
| `prompt` | `string` | Yes | The prompt text sent to the AI |
| `category` | `string` | Yes | Category for grouping (e.g. `'editing'`, `'effects'`, `'transitions'`) |
| `pickerFields` | `PickerField[]` | No | Extensible picker fields rendered as `Jestem {x}` dropdowns |

### Picker Fields

Picker fields are extensible via plugins. Each field is rendered as a dropdown in the Juicer UI:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | `string` | Yes | Unique identifier for the field |
| `label` | `string` | Yes | Display pattern (e.g. `'Jestem {x}'` where `{x}` is replaced by selection) |
| `options` | `string[]` | Yes | Available options for the dropdown |
| `defaultValue` | `string` | No | Default selection (first option if not set) |

**Built-in picker fields:**
- `Jestem {x}` — base editing style selector

**Plugin-registered picker fields:**
- Plugins with `juicer:read` permission can register additional picker fields
- Fields are namespaced by plugin ID to avoid conflicts

### Template Categories

| Category | Description |
|----------|-------------|
| `editing` | Clip manipulation, trimming, splitting |
| `effects` | Visual effects, filters, color grading |
| `transitions` | Transition effects between clips |
| `audio` | Audio adjustments, mixing |
| `text` | Text layer operations |

### Execution Flow

1. User selects a template from the Juicer UI
2. Picker fields are populated with user selections
3. The prompt is interpolated with picker field values
4. The Juicer enters `analyzing` phase and sends the prompt to the AI
5. AI response is parsed into a plan of changes
6. User reviews changes in "Zobacz zmiany" (plan phase)
7. Individual changes can be removed with confirmation
8. Approved changes are executed (executing phase)
9. Results shown in done phase
