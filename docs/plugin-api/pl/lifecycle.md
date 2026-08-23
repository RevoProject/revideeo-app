<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Plugin Lifecycle — Referencja

## Diagram lifecycle

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

     Na dowolnym etapie może wystąpić:
                    ┌─────────────┐
                    │   ERROR     │
                    └─────────────┘
```

## Stany pluginu

| Stan | Opis |
|------|------|
| `installed` | Plugin zarejestrowany, ale nieaktywny |
| `active` | Plugin aktywny, rejestruje swoje rozszerzenia |
| `inactive` | Plugin dezaktywowany, rozszerzenia wyrejestrowane |
| `error` | Wystąpił błąd podczas lifecycle |

## Metody lifecycle

### `registerPlugin(definition)`

Rejestruje nowy plugin w systemie.

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

Aktywuje zainstalowany plugin.

```typescript
await pluginRegistry.activatePlugin('com.example.plugin');
```

### `deactivatePlugin(id)`

Dezaktywuje aktywny plugin. Wyrejestrowuje wszystkie jego rozszerzenia.

```typescript
await pluginRegistry.deactivatePlugin('com.example.plugin');
```

### `togglePlugin(id)`

Przełącza stan pluginu (active ↔ inactive).

```typescript
await pluginRegistry.togglePlugin('com.example.plugin');
```

### `removePlugin(id)`

Usuwa plugin z systemu. Dezaktywuje i usuwa wszystkie dane.

```typescript
await pluginRegistry.removePlugin('com.example.plugin');
```

## Błędy lifecycle

Jeśli wystąpi błąd podczas `activate()` lub `deactivate()`:
- Stan pluginu zmienia się na `error`
- Błąd jest zapisywany w polu `error` pluginu
- Konsola显示出 szczegółowy komunikat o błędzie

```typescript
const plugin = pluginRegistry.getPlugin('com.example.plugin');
if (plugin?.state === 'error') {
  console.error('Plugin error:', plugin.error);
}
```

## Zarządzanie stanem

### Pobieranie listy pluginów

```typescript
// Wszystkie pluginy
const allPlugins = pluginRegistry.getAllPlugins();

// Tylko aktywne
const activePlugins = pluginRegistry.getActivePlugins();

// Pojedynczy plugin
const plugin = pluginRegistry.getPlugin('com.example.plugin');
```

### Persystencja stanu

Stan pluginów (włączony/wyłączony) jest przechowywany w `localStorage`:
- Klucz: `revideeo:plugins`
- Format: `[{ id: string, enabled: boolean, installedAt: number }]`
