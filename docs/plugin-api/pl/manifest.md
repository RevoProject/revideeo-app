<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Plugin Manifest — Referencja

## Struktura pliku

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

## Pola

### `id` (wymagany)

Unikalny identyfikator pluginu.

- Format: `com.organisation.plugin-name` lub `plugin-name`
- Dozwolone znaki: lowercase, cyfry, kropki, myślniki, podkreślenia
- Musi się zaczynać i kończyć literą lub cyfrą

```
✓ "com.example.my-plugin"
✓ "my-plugin"
✓ "plugin_v2"
✗ "My-Plugin"    (uppercase)
✗ "-plugin"      (zaczyna się od myślnika)
✗ "plugin-"      (kończy się myślnikiem)
```

### `name` (wymagany)

Nazwa wyświetlana w UI.

```
"Mój Plugin"
"Advanced Effects Pack"
"Transitions Pro"
```

### `version` (wymagany)

Wersja pluginu w formacie semantic versioning (X.Y.Z).

```
"1.0.0"
"2.1.3"
"0.1.0-beta"
```

### `description` (wymagany)

Krótki opis pluginu (max ~200 znaków).

### `author` (wymagany)

Nazwa autora lub organizacji.

### `icon` (opcjonalny)

Ścieżka do ikony pluginu (relative lub data URL).

### `minApiVersion` (opcjonalny)

Minimalna wersja API wymagana przez plugin. Domyślnie: `1`.

```json
"minApiVersion": 1
```

Jeśli aplikacja ma niższą wersję API niż wymagana, plugin nie zostanie załadowany.

### `permissions` (wymagany)

Tablica wymaganych uprawnień.

```json
"permissions": [
  "project:read",
  "ui:panels",
  "effects:register"
]
```

### `entry` (wymagany)

Ścieżka do pliku wejściowego pluginu (relative do manifestu).

```
"entry": "index.js"
"entry": "dist/plugin.js"
"entry": "src/main.ts"
```

## Pełny przykład

```json
{
  "id": "com.example.advanced-effects",
  "name": "Advanced Effects",
  "version": "1.2.0",
  "description": "Zaawansowane efekty wideo i przejścia",
  "author": "Jan Kowalski",
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

## Walidacja

Manifest jest walidowany przy rejestracji pluginu. Błędy walidacji:

| Błąd | Opis |
|------|------|
| `manifest.id is required` | Brak pola `id` |
| `manifest.id must contain only lowercase letters...` | Nieprawidłowy format ID |
| `manifest.name is required` | Brak pola `name` |
| `manifest.version must follow semantic versioning` | Nieprawidłowy format wersji |
| `manifest.description is required` | Brak pola `description` |
| `manifest.author is required` | Brak pola `author` |
| `manifest.entry is required` | Brak pola `entry` |
| `manifest.permissions must be an array` | Permissions nie jest tablicą |
| `Invalid permission: "..."` | Nieznane uprawnienie |
| `manifest.minApiVersion must be a positive integer` | Nieprawidłowa wersja API |
