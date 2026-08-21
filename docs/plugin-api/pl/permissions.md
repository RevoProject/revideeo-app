# Plugin Permissions — Referencja

## Przegląd

System uprawnień kontroluje dostęp pluginów do zasobów edytora. Pluginy muszą deklarować wymagane uprawnienia w manifeście.

## Deklaracja uprawnień

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

## Dostępne uprawnienia

### Projekt

| Uprawnienie | Opis | Wymaga |
|-------------|------|--------|
| `project:read` | Odczyt nazwy, konfiguracji, ustawień ścieżek | — |
| `project:write` | Oznaczanie projektu jako brudnego | — |

### Timeline

| Uprawnienie | Opis | Wymaga |
|-------------|------|--------|
| `timeline:read` | Odczyt aktualnej klatki, markerów | — |
| `timeline:write` | Dodawanie/usuwanie markerów, seek | — |

### Klipy

| Uprawnienie | Opis | Wymaga |
|-------------|------|--------|
| `clips:read` | Odczyt wszystkich klipów, pobieranie po ID | — |
| `clips:write` | Tworzenie, aktualizacja, usuwanie, duplikowanie, dzielenie klipów | — |

### Zasoby

| Uprawnienie | Opis | Wymaga |
|-------------|------|--------|
| `assets:read` | Odczyt globalnych zasobów | — |
| `assets:write` | Dodawanie/usuwanie globalnych zasobów | — |

### Efekty i przejścia

| Uprawnienie | Opis | Wymaga |
|-------------|------|--------|
| `effects:register` | Rejestrowanie efektów i filtrów | — |
| `transitions:register` | Rejestrowanie typów przejść | — |
| `export:register` | Rejestrowanie formatów eksportu | — |

### UI

| Uprawnienie | Opis | Wymaga |
|-------------|------|--------|
| `ui:panels` | Rejestrowanie paneli i sekcji właściwości | — |
| `ui:tabs` | Rejestrowanie zakładek | — |
| `ui:tools` | Rejestrowanie narzędzi | — |
| `ui:context-menus` | Rozszerzanie menu kontekstowych | — |
| `ui:settings` | Rejestrowanie sekcji ustawień | — |
| `ui:header` | Rejestrowanie przycisków w nagłówku | — |

### Renderer i Juicer

| Uprawnienie | Opis | Wymaga |
|-------------|------|--------|
| `renderer:read` | Odczyt informacji o serwerach renderu | — |
| `juicer:read` | Rejestrowanie rozszerzeń Juicera | — |

### Przechowywanie

| Uprawnienie | Opis | Wymaga |
|-------------|------|--------|
| `storage:project` | Przechowywanie danych per-projekt | — |
| `storage:global` | Przechowywanie danych globalnych | — |

## Zasady bezpieczeństwa

1. **Minimalne uprawnienia** — Plugin powinien deklarować tylko te uprawnienia, których naprawdę potrzebuje
2. **Walidacja** — Nieznane uprawnienia powodują błąd walidacji manifestu
3. **Izolacja** — Plugin nie ma dostępu do API, którego nie zadeklarował
4. **Czas lifecycle** — Uprawnienia są sprawdzane przy każdej operacji

## Przykłady

### Plugin tylko do odczytu

```json
{
  "permissions": ["project:read", "clips:read", "timeline:read"]
}
```

### Plugin z pełnym dostępem

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

### Plugin z efektami

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
