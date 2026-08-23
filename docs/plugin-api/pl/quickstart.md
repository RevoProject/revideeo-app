<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Plugin Quickstart

Szybki start tworzenia pluginu dla ReVideeo.

## Krok 1: Utwórz manifest

Utwórz plik `manifest.json`:

```json
{
  "id": "com.example.my-first-plugin",
  "name": "Mój Pierwszy Plugin",
  "version": "1.0.0",
  "description": "Prosty plugin dodający panel z przyciskiem",
  "author": "Jan Kowalski",
  "permissions": ["ui:panels", "clips:read"],
  "entry": "index.js"
}
```

## Krok 2: Utwórz kod pluginu

Utwórz plik `index.ts`:

```typescript
import type { PluginDefinition } from '../src/api';

const myPlugin: PluginDefinition = {
  manifest: {
    id: 'com.example.my-first-plugin',
    name: 'Mój Pierwszy Plugin',
    version: '1.0.0',
    description: 'Prosty plugin dodający panel z przyciskiem',
    author: 'Jan Kowalski',
    permissions: ['ui:panels', 'clips:read'],
    entry: 'index.js',
  },

  activate: (context) => {
    console.log('Plugin aktywowany!');

    // Rejestruj panel
    context.ui.registerPanel({
      id: 'com.example.my-first-plugin:panel',
      label: 'Mój Plugin',
      icon: '🎉',
      priority: 10,
      render: () => {
        const clips = context.clips.getAll();
        return (
          <div style={{ padding: '12px' }}>
            <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>
              Mój Plugin
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>
              Liczba klipów: {clips.length}
            </p>
          </div>
        );
      },
    });
  },

  deactivate: () => {
    console.log('Plugin dezaktywowany');
  },
};

export default myPlugin;
```

## Krok 3: Zainstaluj plugin

1. Otwórz ustawienia aplikacji (gear icon w headerze)
2. Przejdź do sekcji "Pluginy"
3. Plugin powinien pojawić się na liście (jeśli jest zarejestrowany)

## Krok 4: Testuj

1. Otwórz projekt
2. Przejdź do panelu narzędzi (prawy panel)
3. Kliknij "Pluginy" — powinien pojawić się Twój panel
4. Sprawdź konsolę przeglądarki — powinien pojawić się log "Plugin aktywowany!"

---

## Popularne wzorce

### Dodawanie efektu

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

### Dodawanie akcji do menu kontekstowego

```typescript
activate: (context) => {
  context.ui.registerContextMenuItems({
    id: 'my-plugin:ctx',
    target: 'clip',
    separator: true,
    items: [
      {
        label: 'Ustaw głośność 75%',
        icon: '🔊',
        action: ({ clipId }) => {
          if (clipId) context.clips.update(clipId, { volume: 0.75 });
        },
      },
    ],
  });
},
```

### Przechowywanie danych

```typescript
activate: (context) => {
  // Zapisz preferencje
  context.storage.setGlobalData('my-preference', 'dark');

  // Odczytaj preferencje
  const pref = context.storage.getGlobalData<string>('my-preference');
  console.log('Preferencja:', pref);

  // Dane per-projekt
  context.storage.setProjectData('my-counter', 42);
},
```

### Nasłuchiwanie zdarzeń

```typescript
activate: (context) => {
  context.events.on('clip:created', (clip) => {
    console.log('Nowy klip:', clip);
  });

  context.events.on('timeline:seeked', (frame) => {
    console.log('Playhead na klatce:', frame);
  });
},
```

---

## Struktura pluginu

```
my-plugin/
├── manifest.json      # Manifest pluginu
├── index.ts           # Główny kod pluginu
├── package.json       # Zależności (opcjonalnie)
└── README.md          # Dokumentacja (opcjonalnie)
```

## Troubleshooting

| Problem | Rozwiązanie |
|---------|-------------|
| Plugin się nie pojawia | Sprawdź czy `id` jest unikalne i formatowane poprawnie |
| Panel się nie renderuje | Sprawdź czy masz uprawnienie `ui:panels` |
| Efekt nie działa | Sprawdź czy masz uprawnienie `effects:register` |
| Błąd w konsoli | Sprawdź czy `activate()` nie rzuca wyjątków |
| Plugin nie aktywuje się | Sprawdź czy `minApiVersion` nie jest wyższa niż aktualna API |
