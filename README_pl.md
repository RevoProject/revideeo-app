# ReVideeo

**Edytor wideo w przeglądarce** z automatycznymi napisami AI, osią czasu z wieloma ścieżkami, przejściami i renderowaniem po stronie serwera.

Stworzony z ❤️ w Polsce dla Unii Europejskiej.

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
- Eksport po stronie klienta przez serwerowe renderowanie Remotion
- Progressive Web App (PWA) z obsługą offline
- Internacjonalizacja: polski, angielski, niemiecki

## Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Podgląd | `@revideeo/player` — natywny renderer HTML5 (tylko przeglądarka, bez Remotion) |
| Biblioteka core | `@revideeo/core` — typy manifestu, narzędzia osi czasu, interfejsy adapterów |
| Serwer renderujący | Express.js + Remotion 4.x + Chromium + FFmpeg |
| Deployment | Vercel (frontend) + samodzielny Node.js (serwer renderujący) |
| Testy | Vitest (238 testów) |

## Szybki start

```bash
# Frontend
pnpm install
pnpm dev              # → http://localhost:5173

# Serwer renderujący
cd server
pnpm install
node render-server.mjs  # → http://localhost:33623
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
├── server/
│   ├── render-server.mjs       # Punkt wejścia serwera Express
│   ├── remotion-entry.tsx      # Root kompozycji Remotion (tylko serwer)
│   └── modules/                # Renderowanie, AI, pluginy, konfiguracja
├── docs/clean-room/            # Dokumentacja procesu clean room
├── LICENSE                     # EUPL-1.2
└── README.md                   # English README
```

## Testy

```bash
cd packages/player && npx vitest run   # 184 testów
cd packages/core   && npx vitest run   #  54 testów
```

## Informacja o kodzie źródłowym trzecich stron

Bundle przeglądarkowy tego projektu **nie zawiera kodu Remotion**. Pakiet `@remotion/renderer`
jest używany wyłącznie po stronie serwera do renderowania wideo. Cały podgląd jest obsługiwany
przez autorski pakiet `@revideeo/player` (licencja EUPL, oryginalna implementacja w procesie clean room).

---

*Stworzono w Unii Europejskiej · Licencja EUPL-1.2*
