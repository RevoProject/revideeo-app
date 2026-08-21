# Plugin UI Extensions — Referencja

## Przegląd

Pluginy mogą rozszerzać interfejs edytora o:

- **Panele** — w prawym panelu narzędzi
- **Zakładki** — w panelu mediów (lewy panel)
- **Narzędzia** — w menu narzędzi (5 przycisków)
- **Menu kontekstowe** — po prawym kliknięciu
- **Przyciski nagłówka** — w górnym pasku narzędzi
- **Sekcje ustawień** — w modalu ustawień
- **Sekcje właściwości** — w panelu właściwości klipu
- **Dialogi** — modalne okna dialogowe

---

## Panele

Panele wyświetlane w prawym panelu narzędzi (obok właściwości klipu).

```typescript
context.ui.registerPanel({
  id: 'my-plugin:panel',
  label: 'Mój Panel',
  icon: '🔧',
  position: 'right',
  priority: 10,
  render: () => <div>Zawartość panelu</div>,
});
```

### Parametry

| Parametr | Typ | Domyślny | Opis |
|----------|-----|----------|------|
| `id` | `string` | — | Unikalny ID panelu |
| `label` | `string` | — | Nazwa wyświetlana |
| `icon` | `string` | — | Ikona (emoji lub ścieżka) |
| `position` | `'left' \| 'right'` | `'right'` | Pozycja w UI |
| `priority` | `number` | `0` | Kolejność sortowania (wyższy = wyżej) |
| `render` | `() => ReactNode` | — | Funkcja renderująca zawartość |

---

## Zakładki

Zakładki wyświetlane w panelu mediów (lewy panel).

```typescript
context.ui.registerTab({
  id: 'my-plugin:tab',
  label: 'Moje Zakładki',
  icon: '📁',
  position: 'media',
  priority: 5,
  render: () => <div>Zawartość zakładki</div>,
});
```

### Parametry

| Parametr | Typ | Domyślny | Opis |
|----------|-----|----------|------|
| `id` | `string` | — | Unikalny ID zakładki |
| `label` | `string` | — | Nazwa wyświetlana |
| `icon` | `string` | — | Ikona |
| `position` | `'media' \| 'right'` | `'media'` | Pozycja |
| `priority` | `number` | `0` | Kolejność sortowania |
| `render` | `() => ReactNode` | — | Funkcja renderująca |

---

## Narzędzia

Narzędzia wyświetlane w menu narzędzi (5 przycisków w prawym panelu).

```typescript
context.ui.registerTool({
  id: 'my-plugin:tool',
  label: 'Moje Narzędzie',
  icon: '⚙️',
  priority: 10,
  render: ({ activeClip, fps, onUpdateClip, onClose }) => (
    <div>
      <h3>Narzędzie</h3>
      {activeClip && (
        <button onClick={() => onUpdateClip({ volume: 0.5 })}>
          Ustaw głośność 50%
        </button>
      )}
    </div>
  ),
});
```

### Parametry render

| Parametr | Typ | Opis |
|----------|-----|------|
| `activeClip` | `StoredClip \| null` | Aktualnie wybrany klip |
| `clipIndex` | `number` | Indeks klipu na ścieżce |
| `totalFrames` | `number` | Całkowita liczba klatek |
| `fps` | `number` | Klatki na sekundę |
| `asset` | `{ name: string } \| undefined` | Info o aktywnym zasobie |
| `onUpdateClip` | `(patch) => void` | Aktualizacja klipu |
| `onClose` | `() => void` | Zamknięcie panelu |

---

## Menu kontekstowe

Rozszerzanie menu kontekstowych o dodatkowe akcje.

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
      action: ({ clipId, trackIndex }) => {
        if (clipId) {
          context.clips.update(clipId, { volume: 0.5 });
        }
      },
    },
  ],
});
```

### Cele menu

| Target | Opis |
|--------|------|
| `'clip'` | Menu kontekstowe klipu |
| `'asset'` | Menu kontekstowe zasobu |
| `'track'` | Menu kontekstowe ścieżki |
| `'empty'` | Menu kontekstowe pustego miejsca |
| `'transition'` | Menu kontekstowe przejścia |

---

## Przyciski nagłówka

Przyciski dodawane do górnego paska narzędzi. Nagłówek zawiera wbudowany przycisk "Zobacz pluginy" otwierający menedżer pluginów. Pluginy mogą rejestrować dodatkowe przyciski w jego sąsiedztwie za pomocą pozycji `'plugins'`.

```typescript
context.ui.registerHeaderButton({
  id: 'my-plugin:header-btn',
  label: 'Mój Przycisk',
  icon: '🎯',
  position: 'end',
  priority: 5,
  onClick: () => {
    context.ui.showDialog({
      title: 'Kliknięto!',
      content: <div>Przycisk został kliknięty</div>,
    });
  },
});
```

### Pozycje

| Position | Opis |
|----------|------|
| `'before-export'` | Przed przyciskiem eksportu |
| `'after-export'` | Po przycisku eksportu |
| `'plugins'` | Obok przycisku "Zobacz pluginy" |
| `'end'` | Na końcu paska narzędzi |

---

## Sekcje ustawień

Sekcje dodawane do modalu ustawień aplikacji.

```typescript
context.ui.registerSettingsSection({
  id: 'my-plugin:settings',
  label: 'Ustawienia Pluginu',
  icon: '⚙️',
  priority: 10,
  render: () => (
    <div>
      <label>
        Opcja pluginu
        <input type="checkbox" />
      </label>
    </div>
  ),
});
```

---

## Sekcje właściwości

Sekcje dodawane do panelu właściwości klipu.

```typescript
context.ui.registerPropertySection({
  id: 'my-plugin:prop-section',
  label: 'Moja Sekcja',
  icon: '🎛️',
  visible: (clip) => clip.type === 'video',
  priority: 10,
  render: ({ clip, fps, onUpdateClip }) => (
    <div>
      <label>
        Niestandardowa wartość
        <input
          type="range"
          min={0}
          max={100}
          value={clip.volume ?? 1}
          onChange={(e) => onUpdateClip({ volume: Number(e.target.value) / 100 })}
        />
      </label>
    </div>
  ),
});
```

### Parametry render

| Parametr | Typ | Opis |
|----------|-----|------|
| `clip` | `StoredClip` | Aktualny klip |
| `fps` | `number` | Klatki na sekundę |
| `onUpdateClip` | `(patch) => void` | Aktualizacja klipu |

---

## Dialogi

Modalne okna dialogowe wyświetlane przez pluginy.

```typescript
context.ui.showDialog({
  title: 'Potwierdzenie',
  content: (
    <div>
      <p>Czy na pewno chcesz wykonać tę akcję?</p>
    </div>
  ),
  actions: [
    { label: 'Tak', variant: 'primary', onClick: () => { /* akcja */ } },
    { label: 'Anuluj', onClick: () => {} },
  ],
});
```

### Warianty przycisków

| Variant | Opis |
|---------|------|
| `'default'` | Domyślny (szary) |
| `'primary'` | Główny (niebieski) |
| `'danger'` | Niebezpieczny (czerwony) |
