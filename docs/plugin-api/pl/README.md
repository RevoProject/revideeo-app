<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# ReVideeo Plugin API

## Spis treści

1. [Przegląd](#przegląd)
2. [Manifest pluginu](#manifest-pluginu)
3. [Lifecycle pluginu](#lifecycle-pluginu)
4. [API Referencja](#api-referencja)
5. [API I18n](#api-i18n-contexti18n)
6. [Możliwości](#możliwości-contextcapabilities)
7. [API Juicera](#api-juicera-contextjuicer)
8. [Uprawnienia](#uprawnienia)
9. [Kompatybilność wsteczna](#kompatybilność-wsteczna)
10. [Przykłady](#przykłady)

---

## Przegląd

Plugin API pozwala na rozszerzanie edytora ReVideeo o nowe funkcje bez modyfikowania kodu źródłowego. Pluginy mogą:

- Dodawać własne panele, zakładki i narzędzia do UI
- Rejestrować nowe efekty, przejścia i formaty eksportu
- Pracować z projektem, timeline i klipami
- Dodawać elementy do menu kontekstowych
- Rejestrować przyciski w nagłówku
- Dodawać sekcje w ustawieniach aplikacji i właściwościach klipów
- Przechowywać dane globalnie i per-projekt
- Dodawać nowe typy połączeń (zewnętrzni operatorzy)
- Dodawać zasoby (zdjęcia, filmy, SFX) globalnie

### Architektura

```
┌─────────────────────────────────────────────────┐
│                  ReVideeo Editor                 │
├─────────────────────────────────────────────────┤
│              Plugin System Core                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Registry  │  │ EventBus │  │   Storage    │  │
│  └───────────┘  └──────────┘  └──────────────┘  │
├─────────────────────────────────────────────────┤
│              Plugin API Layer                    │
│  ┌────┐ ┌────────┐ ┌────────┐ ┌──────────────┐ │
│  │ UI │ │Project │ │Timeline│ │ Effects/Trans │ │
│  └────┘ └────────┘ └────────┘ └──────────────┘ │
│  ┌────────┐ ┌──────┐ ┌───────┐ ┌───────────┐  │
│  │ Assets │ │Export│ │Juicer │ │ Renderer  │  │
│  └────────┘ └──────┘ └───────┘ └───────────┘  │
├─────────────────────────────────────────────────┤
│              Plugin Instances                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Plugin 1 │ │ Plugin 2 │ │ Plugin 3 │  ...   │
│  └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────┘
```

---

## Manifest pluginu

Każdy plugin musi mieć manifest (JSON) opisujący jego metadane.

### Struktura manifestu

```json
{
  "id": "com.example.my-plugin",
  "name": "Mój Plugin",
  "version": "1.0.0",
  "description": "Opis pluginu",
  "author": "Nazwa autora",
  "icon": "path/to/icon.png",
  "minApiVersion": 1,
  "permissions": [
    "project:read",
    "timeline:read",
    "clips:read",
    "ui:panels"
  ],
  "i18n": {
    "en": {
      "pluginName": "My Plugin",
      "pluginDescription": "Plugin description"
    },
    "pl": {
      "pluginName": "Mój Plugin",
      "pluginDescription": "Opis pluginu"
    }
  },
  "entry": "index.js"
}
```

### Pola manifestu

| Pole | Typ | Wymagany | Opis |
|------|-----|----------|------|
| `id` | `string` | Tak | Unikalny identyfikator pluginu (lowercase, separated by dots/hyphens) |
| `name` | `string` | Tak | Nazwa wyświetlana |
| `version` | `string` | Tak | Wersja semantic (X.Y.Z) |
| `description` | `string` | Tak | Krótki opis |
| `author` | `string` | Tak | Nazwa autora |
| `icon` | `string` | Nie | Ścieżka do ikony |
| `minApiVersion` | `number` | Nie | Minimalna wersja API (domyślnie 1) |
| `permissions` | `string[]` | Tak | Lista wymaganych uprawnień |
| `i18n` | `Record<string, Record<string, string>>` | Nie | Klucze tłumaczeń per kod języka |
| `entry` | `string` | Tak | Ścieżka do pliku wejściowego pluginu |

---

## Lifecycle pluginu

Plugin przechodzi przez następujące fazy:

```
install → load → activate ⇄ deactivate → update → uninstall
```

### Fazy lifecycle

1. **install** — Plugin jest rejestrowany w systemie. Manifest jest walidowany.
2. **load** — Plugin jest ładowany do pamięci. Kod jest interpretowany.
3. **activate** — Plugin jest aktywowany. Rejestruje swoje rozszerzenia (UI, efekty, itp.).
4. **deactivate** — Plugin jest dezaktywowany. Wyrejestrowuje swoje rozszerzenia.
5. **update** — Plugin jest aktualizowany do nowej wersji.
6. **uninstall** — Plugin jest usuwany z systemu.

### Zarządzanie lifecycle

```typescript
import { pluginRegistry } from './api';

// Rejestracja pluginu
await pluginRegistry.registerPlugin({
  manifest: myManifest,
  activate: (context) => {
    // Aktywacja — rejestracja rozszerzeń
    context.ui.registerPanel({ id: 'my-panel', label: 'Mój Panel', render: () => <MyComponent /> });
  },
  deactivate: () => {
    // Dezaktywacja — czyszczenie
  },
});

// Przełączanie stanu
await pluginRegistry.togglePlugin('com.example.my-plugin');

// Usuwanie
await pluginRegistry.removePlugin('com.example.my-plugin');
```

---

## API Referencja

### PluginContext

Obiekt przekazywany do funkcji `activate` pluginu. Zawiera wszystkie pod-API.

```typescript
interface PluginContext {
  ui: PluginUIAPI;
  project: PluginProjectAPI;
  timeline: PluginTimelineAPI;
  clips: PluginClipsAPI;
  effects: PluginEffectsAPI;
  transitions: PluginTransitionsAPI;
  export: PluginExportAPI;
  assets: PluginAssetsAPI;
  renderer: PluginRendererAPI;
  juicer: PluginJuicerAPI;
  storage: PluginStorageAPI;
  events: PluginEventAPI;
  i18n: PluginI18nAPI;
  capabilities: ReVideeoCapabilities;
}
```

---

### UI API (`context.ui`)

#### `registerPanel(options)`

Rejestruje nowy panel w prawym panelu narzędzi.

```typescript
context.ui.registerPanel({
  id: 'my-plugin:panel',
  label: 'Mój Panel',
  icon: '🔧',
  position: 'right',
  priority: 10,
  render: () => <div>Moja zawartość</div>,
});
```

#### `registerTab(options)`

Rejestruje nową zakładkę w panelu mediów.

```typescript
context.ui.registerTab({
  id: 'my-plugin:tab',
  label: 'Moja Zakładka',
  icon: '📁',
  position: 'media',
  priority: 5,
  render: () => <div>Zawartość zakładki</div>,
});
```

#### `registerTool(options)`

Rejestruje nowe narzędzie w menu narzędzi.

```typescript
context.ui.registerTool({
  id: 'my-plugin:tool',
  label: 'Moje Narzędzie',
  icon: '⚙️',
  priority: 10,
  render: ({ activeClip, onUpdateClip }) => (
    <div>
      {/* Panel narzędziowy */}
    </div>
  ),
});
```

#### `registerContextMenuItems(options)`

Dodaje elementy do menu kontekstowego.

```typescript
context.ui.registerContextMenuItems({
  id: 'my-plugin:ctx-clip',
  target: 'clip',
  separator: true,
  priority: 5,
  items: [
    {
      label: 'Moja akcja',
      icon: '⚡',
      action: ({ clipId }) => {
        // Wykonanie akcji
      },
    },
  ],
});
```

#### `registerHeaderButton(options)`

Rejestruje przycisk w nagłówku aplikacji.

```typescript
context.ui.registerHeaderButton({
  id: 'my-plugin:header-btn',
  label: 'Mój Przycisk',
  icon: '🎯',
  position: 'end',
  priority: 5,
  onClick: () => {
    // Akcja po kliknięciu
  },
});
```

#### `registerSettingsSection(options)`

Rejestruje sekcję w ustawieniach aplikacji.

```typescript
context.ui.registerSettingsSection({
  id: 'my-plugin:settings',
  label: 'Ustawienia Pluginu',
  icon: '⚙️',
  priority: 10,
  render: () => <div>Ustawienia</div>,
});
```

#### `registerPropertySection(options)`

Rejestruje sekcję w właściwościach klipu.

```typescript
context.ui.registerPropertySection({
  id: 'my-plugin:prop-section',
  label: 'Moja Sekcja',
  icon: '🎛️',
  visible: (clip) => clip.type === 'video',
  priority: 10,
  render: ({ clip, fps, onUpdateClip }) => (
    <div>
      {/* Właściwości specyficzne dla pluginu */}
    </div>
  ),
});
```

#### `showDialog(options)`

Wyświetla dialog modalny.

```typescript
context.ui.showDialog({
  title: 'Tytuł dialogu',
  content: <div>Zawartość</div>,
  actions: [
    { label: 'OK', variant: 'primary', onClick: () => {} },
    { label: 'Anuluj', onClick: () => {} },
  ],
});
```

---

### Project API (`context.project`)

```typescript
context.project.getName();           // string
context.project.getConfig();         // { resolutionLabel, orientation, fps }
context.project.getTrackCount();     // number
context.project.getTrackSettings();  // TrackSettings[]
context.project.isDirty();           // boolean
context.project.markDirty();         // void
```

---

### Timeline API (`context.timeline`)

```typescript
context.timeline.getCurrentFrame();  // number
context.timeline.seekTo(frame);      // void
context.timeline.getTotalFrames();   // number
context.timeline.addMarker(frame);   // void
context.timeline.removeMarker(id);   // void
context.timeline.getMarkers();       // { id, frame }[]
```

---

### Clips API (`context.clips`)

```typescript
context.clips.getAll();              // StoredClip[]
context.clips.getById(id);           // StoredClip | null
context.clips.getSelected();         // StoredClip[]
context.clips.add(clip);            // string (id nowego klipu)
context.clips.update(id, patch);    // void
context.clips.remove(id);           // void
context.clips.duplicate(id);        // string | null
context.clips.split(id, frame);     // string | null
```

---

### Effects API (`context.effects`)

```typescript
context.effects.registerEffect({
  id: 'my-plugin:glitch',
  name: 'Glitch Effect',
  icon: '💥',
  apply: (clip, frame) => ({
    filter: `hue-rotate(${Math.sin(frame * 0.1) * 30}deg)`,
  }),
});

context.effects.registerFilter({
  id: 'my-plugin:vintage',
  name: 'Vintage',
  icon: '📷',
  cssFilter: 'sepia(0.5) contrast(1.1)',
});
```

---

### Transitions API (`context.transitions`)

```typescript
context.transitions.registerTransition({
  type: 'fade' as TransitionType,
  label: 'Custom Fade',
  icon: '✨',
  apply: (progress) => ({
    opacity: progress,
    filter: `blur(${(1 - progress) * 5}px)`,
  }),
});
```

---

### Export API (`context.export`)

```typescript
context.export.registerFormat({
  id: 'my-plugin:gif',
  label: 'GIF',
  extension: 'gif',
  mimeType: 'image/gif',
  render: async (config) => {
    // Logika renderowania
    return blob;
  },
});
```

---

### Assets API (`context.assets`)

```typescript
// Globalne zasoby (dla wszystkich projektów)
context.assets.getGlobalAssets();
context.assets.addGlobalAsset({
  id: 'my-plugin:asset-1',
  name: 'Moje Zdjęcie',
  category: 'Zdjęcia',
  blob: fileBlob,
  thumbnail: 'data:image/jpeg;base64,...',
});
context.assets.removeGlobalAsset('my-plugin:asset-1');
```

---

### Storage API (`context.storage`)

```typescript
// Dane per-projekt
context.storage.getProjectData('my-key');           // T | null
context.storage.setProjectData('my-key', myValue);  // void

// Dane globalne (między projektami)
context.storage.getGlobalData('my-key');            // T | null
context.storage.setGlobalData('my-key', myValue);   // void
```

---

### Events API (`context.events`)

```typescript
context.events.on('clip:created', (clip) => { /* ... */ });
context.events.on('clip:updated', (clip) => { /* ... */ });
context.events.on('clip:removed', (clipId) => { /* ... */ });
context.events.on('timeline:seeked', (frame) => { /* ... */ });
context.events.on('project:saved', () => { /* ... */ });

context.events.emit('custom-event', data);
context.events.off('custom-event', handler);
```

---

### API I18n (`context.i18n`)

Zapewnia wsparcie internacjonalizacji dla pluginów. Tłumaczenia można deklarować w manifeście poprzez pole `i18n` lub rejestrować programatycznie.

#### `registerTranslations(lang, translations)`

Rejestruje klucze tłumaczeń dla podanego języka.

```typescript
context.i18n.registerTranslations('en', {
  'my-plugin:greeting': 'Hello!',
  'my-plugin:description': 'This is my plugin',
});

context.i18n.registerTranslations('pl', {
  'my-plugin:greeting': 'Cześć!',
  'my-plugin:description': 'To jest mój plugin',
});
```

#### `t(key, vars?)`

Zwraca przetłumaczony tekst dla aktualnego języka. Wspiera interpolację składnią `{{var}}`.

```typescript
const label = context.i18n.t('my-plugin:greeting'); // "Hello!" (jeśli język to 'en')
const msg = context.i18n.t('my-plugin:count', { count: 5 }); // "5 items"
```

#### `getLang()`

Zwraca aktualny aktywny kod języka.

```typescript
const lang = context.i18n.getLang(); // 'en'
```

#### `getAvailableLangs()`

Zwraca tablicę dostępnych kodów języków.

```typescript
const langs = context.i18n.getAvailableLangs(); // ['en', 'pl', 'de']
```

#### i18n w manifeście

Pluginy mogą deklarować tłumaczenia bezpośrednio w manifeście:

```json
{
  "id": "com.example.my-plugin",
  "i18n": {
    "en": {
      "pluginName": "My Plugin",
      "pluginDescription": "A useful plugin",
      "greeting": "Hello!"
    },
    "pl": {
      "pluginName": "Mój Plugin",
      "pluginDescription": "Przydatny plugin",
      "greeting": "Cześć!"
    }
  }
}
```

Tłumaczenia z manifestu są automatycznie łączone z tłumaczeniami rejestrowanymi programatycznie.

---

### Możliwości (`context.capabilities`)

Tylko do odczytu obiekt opisujący możliwości aktualnego środowiska ReVideeo. Pluginy mogą go używać do dostosowywania zachowania w zależności od dostępnych funkcji.

```typescript
interface ReVideeoCapabilities {
  /** Czy dostępna jest akceleracja sprzętowa */
  hardwareAcceleration: boolean;
  /** Maksymalna liczba obsługiwanych ścieżek */
  maxTracks: number;
  /** Obsługiwane formaty eksportu */
  supportedFormats: string[];
  /** Czy serwer renderu jest dostępny */
  rendererAvailable: boolean;
  /** Czy efekty GPU są dostępne */
  gpuEffectsAvailable: boolean;
  /** Maksymalna obsługiwana rozdzielczość */
  maxResolution: { width: number; height: number };
  /** Identyfikator platformy */
  platform: 'web' | 'desktop' | 'mobile';
}
```

#### Przykład: dostosowanie do możliwości

```typescript
activate: (context) => {
  if (context.capabilities.gpuEffectsAvailable) {
    // Rejestracja efektu przyspieszanego przez GPU
    context.effects.registerEffect({ id: 'my-plugin:gpu-effect', ... });
  } else {
    // Rejestracja efektu CPU jako alternatywy
    context.effects.registerEffect({ id: 'my-plugin:cpu-effect', ... });
  }
}
```

---

### API Juicera (`context.juicer`)

API Juicera pozwala pluginom rozszerzać system generowania promptów Juicera.

#### `registerPromptTemplate(options)**

Rejestruje niestandardowy szablon promptu, który może być używany przez Juicera.

```typescript
context.juicer.registerPromptTemplate({
  id: 'my-plugin:summarize',
  name: 'Summarize',
  description: 'Podsumuj wybrane klipy',
  icon: '📝',
  variables: [
    {
      name: 'style',
      label: 'Styl podsumowania',
      type: 'select',
      options: [
        { value: 'brief', label: 'Zwięzły' },
        { value: 'detailed', label: 'Szczegółowy' },
      ],
      default: 'brief',
    },
  ],
  render: (variables) => {
    return `Podsumuj następujące klipy w sposób ${variables.style}.`;
  },
});
```

#### Typy zmiennych szablonu

| Typ zmiennej | Opis |
|--------------|------|
| `'text'` | Wprowadzenie dowolnego tekstu |
| `'select'` | Wybór z listy rozwijanej |
| `'number'` | Wprowadzenie liczby |
| `'boolean'` | Przełącznik |

---

## Uprawnienia

Pluginy muszą deklarować wymagane uprawnienia w manifeście.

### Dostępne uprawnienia

| Uprawnienie | Opis |
|-------------|------|
| `project:read` | Odczyt danych projektu |
| `project:write` | Zapis danych projektu |
| `timeline:read` | Odczyt danych timeline |
| `timeline:write` | Zapis danych timeline (markers) |
| `clips:read` | Odczyt klipów |
| `clips:write` | Tworzenie, modyfikacja, usuwanie klipów |
| `assets:read` | Odczyt zasobów |
| `assets:write` | Zarządzanie zasobami globalnymi |
| `effects:register` | Rejestrowanie efektów i filtrów |
| `transitions:register` | Rejestrowanie typów przejść |
| `export:register` | Rejestrowanie formatów eksportu |
| `ui:panels` | Rejestrowanie paneli |
| `ui:tabs` | Rejestrowanie zakładek |
| `ui:tools` | Rejestrowanie narzędzi |
| `ui:context-menus` | Rozszerzanie menu kontekstowych |
| `ui:settings` | Rejestrowanie sekcji ustawień |
| `ui:header` | Rejestrowanie przycisków w nagłówku |
| `renderer:read` | Odczyt informacji o serwerach renderu |
| `juicer:read` | Rejestrowanie rozszerzeń Juicera |
| `storage:project` | Przechowywanie danych per-projekt |
| `storage:global` | Przechowywanie danych globalnych |

### Przykład manifestu z uprawnieniami

```json
{
  "id": "com.example.advanced-effects",
  "name": "Advanced Effects",
  "version": "1.0.0",
  "description": "Zaawansowane efekty wideo",
  "author": "Jan Kowalski",
  "permissions": [
    "effects:register",
    "transitions:register",
    "ui:panels",
    "clips:read"
  ],
  "entry": "index.js"
}
```

---

## Kompatybilność wsteczna

### Wersjonowanie API

Plugin API używa semantycznego wersjonowania. Numer wersji API jest niezależny od wersji aplikacji.

- **Major** — Breaking changes, niekompatybilność wsteczna
- **Minor** — Nowe funkcje, kompatybilność wsteczna
- **Patch** — Poprawki bugów

### Strategia kompatybilności

1. **Pole `minApiVersion`** — Plugin deklaruje minimalną wersję API, z którą jest kompatybilny
2. **Deprecation warnings** — Przestarzałe API jest oznaczane jako deprecated, ale nadal działa
3. **Adaptery** — W przyszłości: adaptery dla starszych wersji API

```typescript
// Plugin wymaga API v1
{
  "minApiVersion": 1,
  ...
}
```

### Gdy API nie jest kompatybilne

Jeśli plugin wymaga wyższej wersji API niż dostępna:
- Plugin nie zostanie załadowany
- Wyświetlony zostanie komunikat o wymaganej wersji
- Plugin pozostaje w stanie `installed`, ale nie jest aktywny

---

## Przykłady

### Minimalny plugin

```typescript
// manifest.json
{
  "id": "com.example.hello",
  "name": "Hello Plugin",
  "version": "1.0.0",
  "description": "Przykładowy plugin",
  "author": "Jan Kowalski",
  "permissions": ["ui:panels"],
  "entry": "index.js"
}

// index.ts
import type { PluginDefinition } from '../api';

export default {
  manifest: {
    id: 'com.example.hello',
    name: 'Hello Plugin',
    version: '1.0.0',
    description: 'Przykładowy plugin',
    author: 'Jan Kowalski',
    permissions: ['ui:panels'],
    entry: 'index.js',
  },
  activate: (context) => {
    context.ui.registerPanel({
      id: 'com.example.hello:panel',
      label: 'Hello Panel',
      render: () => '<div>Hello from plugin!</div>',
    });
  },
} satisfies PluginDefinition;
```

### Plugin z efektami

```typescript
export default {
  manifest: {
    id: 'com.example.effects',
    name: 'Custom Effects',
    version: '1.0.0',
    description: 'Niestandardowe efekty',
    author: 'Jan Kowalski',
    permissions: ['effects:register', 'clips:read'],
    entry: 'index.js',
  },
  activate: (context) => {
    context.effects.registerEffect({
      id: 'com.example.effects:rainbow',
      name: 'Rainbow',
      apply: (clip, frame) => ({
        filter: `hue-rotate(${(frame * 3) % 360}deg)`,
      }),
    });

    context.effects.registerFilter({
      id: 'com.example.effects:cinematic',
      name: 'Cinematic',
      cssFilter: 'contrast(1.2) saturate(1.3) brightness(0.9)',
    });
  },
} satisfies PluginDefinition;
```

### Plugin z menu kontekstowym

```typescript
export default {
  manifest: {
    id: 'com.example.context-actions',
    name: 'Context Actions',
    version: '1.0.0',
    description: 'Dodatkowe akcje w menu kontekstowym',
    author: 'Jan Kowalski',
    permissions: ['ui:context-menus', 'clips:read', 'clips:write'],
    entry: 'index.js',
  },
  activate: (context) => {
    context.ui.registerContextMenuItems({
      id: 'com.example.context-actions:clip',
      target: 'clip',
      separator: true,
      items: [
        {
          label: 'Przycięć do 5s',
          icon: '✂️',
          action: ({ clipId }) => {
            if (clipId) {
              context.clips.update(clipId, { durationInFrames: 150 });
            }
          },
        },
        {
          label: 'Ustaw głośność 50%',
          icon: '🔊',
          action: ({ clipId }) => {
            if (clipId) {
              context.clips.update(clipId, { volume: 0.5 });
            }
          },
        },
      ],
    });
  },
} satisfies PluginDefinition;
```
