# ReVideeo

**Edytor wideo w przeglądarce** z automatycznymi napisami AI, osią czasu z wieloma ścieżkami, przejściami i eksportem do wielu formatów.

Stworzony z ❤️ w Polsce dla Unii Europejskiej.

> **Opcjonalny serwer renderujący** — Zgodne przeglądarki mogą lokalnie eksportować MP4/WebM.
> Edycja z pomocą AI, eksport MKV i renderowanie serwerowe używają
> [revideeo-render-server](https://github.com/RevoProject/revideeo-render-server).

## Licencja

ReVideeo jest licencjonowane na **European Union Public Licence v. 1.2 (EUPL-1.2)**.
Pełny tekst licencji dostępny w pliku [LICENSE](LICENSE) lub na [EUR-Lex](https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32017D0863).

Identyfikator SPDX: `EUPL-1.2`

## Funkcje

- Oś czasu z wieloma ścieżkami i swobodnym pozycjonowaniem klipów
- Ścieżki wideo, obrazów, tekstu i audio
- 12 typów przejść (fade, slide, wipe, push, cross-zoom, dreamy-zoom, linear-blur, film-burn i inne)
- Automatyczne napisy AI (Google Gemini + tryb demo lokalny)
- Skróty klawiszowe i profesjonalne narzędzia edycyjne
- Progressive Web App (PWA) z obsługą offline
- Internacjonalizacja: polski, angielski, niemiecki
- Lokalny eksport WebCodecs lub opcjonalny serwer renderujący

## Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Podgląd | `@revideeo/player` — natywny renderer HTML5 (EUPL-1.2) |
| Biblioteka core | `@revideeo/core` — typy manifestu, narzędzia osi czasu, interfejsy adapterów |
| Serwer renderujący | [revideeo-render-server](https://github.com/RevoProject/revideeo-render-server) (osobne repozytorium) |
| Deployment | Vercel (frontend) + samodzielny Node.js (serwer renderujący) |
| Testy | Vitest (238 testów) |

## Serwer renderujący

Przeglądarka może lokalnie eksportować MP4/WebM. Edycja z pomocą AI, eksport MKV
i renderowanie serwerowe wymagają serwera renderującego.
Jest on utrzymywany w **osobnym repozytorium**:

**→ [github.com/RevoProject/revideeo-render-server](https://github.com/RevoProject/revideeo-render-server)**

Serwer renderujący działa niezależnie od leniwie ładowanego renderera przeglądarkowego.

## Szybki start

```bash
# Frontend
pnpm install
pnpm dev              # → http://localhost:5173
```

## Deployment

```bash
pnpm build
vercel build --yes
vercel deploy --prebuilt --yes --prod
```

## Struktura projektu

```
├── src/                        # Aplikacja frontendowa
│   ├── editor/                 # Oś czasu, edycja klipów, podgląd kompozycji
│   ├── export/                 # Klient eksportu + budowniczy manifestu
│   ├── i18n/                   # Tłumaczenia (pl, en, de)
│   └── components/             # Modale, ustawienia, współdzielone UI
├── packages/
│   ├── core/                   # Typy manifestu, generatory, walidatory, adaptery
│   └── player/                 # Natywny renderer HTML5 (NativePlayer)
├── docs/
│   ├── ai-docs/                # Dokumentacja dla agentów AI
│   ├── user-docs/              # Dokumentacja użytkownika
│   ├── plugin-api/             # Dokumentacja API pluginów (EN, PL)
│   └── clean-room/             # Dokumentacja procesu clean room
├── LICENSE                     # EUPL-1.2
├── LICENSE_REMOTION.md         # Licencja Remotion (tylko do wglądu — patrz Notice)
├── NOTICE                      # Zawiadomienia o zależnościach trzecich
├── publiccode.yml              # Metadane katalogu EU Open Source Solutions
└── README.md                   # English README
```

## Testy

```bash
cd packages/player && npx vitest run   # 184 testów
cd packages/core   && npx vitest run   #  54 testów
```

## Informacja o zależnościach trzecich

Remotion jest dołączony jako leniwie ładowany renderer przeglądarkowy i jest także
używany przez osobny [revideeo-render-server](https://github.com/RevoProject/revideeo-render-server).

Zobacz [NOTICE](NOTICE) pełną listę zależności trzecich i ich licencje.

Pakiet `@revideeo/player` (EUPL-1.2) zapewnia niezależny natywny renderer HTML5 (`NativePlayer`),
który **nie** zależy od Remotion.

---

*Stworzono w Unii Europejskiej · Licencja EUPL-1.2*
