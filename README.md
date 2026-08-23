# ReVideeo

**Web-based video editor** with AI-powered auto-captions, multi-track timeline, transitions, and server-side rendering.

Made with ❤️ in Poland for the European Union.

## License

ReVideeo is licensed under the **European Union Public Licence v. 1.2 (EUPL-1.2)**.
See [LICENSE](LICENSE) for the full text, or read it at [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017D0863).

SPDX identifier: `EUPL-1.2`

## Features

- Multi-track timeline with free clip positioning
- Video, image, text, and audio tracks
- 12 transition types (fade, slide, wipe, push, cross-zoom, dreamy-zoom, linear-blur, film-burn, and more)
- AI-powered auto-captions (Google Gemini + local demo mode)
- Keyboard shortcuts and professional editing tools
- Client-side export via server-side Remotion rendering
- Progressive Web App (PWA) with offline support
- Internationalization: Polish, English, German

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Preview Engine | `@revideeo/player` — native HTML5 renderer (browser-only, no Remotion) |
| Core Library | `@revideeo/core` — manifest types, timeline utils, adapter interfaces |
| Render Server | Express.js + Remotion 4.x + Chromium + FFmpeg |
| Deployment | Vercel (frontend) + self-hosted Node.js (render server) |
| Testing | Vitest (238 tests) |

## Quick Start

```bash
# Frontend
pnpm install
pnpm dev              # → http://localhost:5173

# Render server
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

## Project Structure

```
├── src/                        # Frontend application
│   ├── editor/                 # Timeline, clip editing, composition preview
│   ├── export/                 # Client-side manifest builder + render client
│   ├── i18n/                   # Translations (pl, en, de)
│   └── components/             # Modals, settings, shared UI
├── packages/
│   ├── core/                   # Manifest types, generators, validators, adapters
│   └── player/                 # Native HTML5 preview renderer (NativePlayer)
├── server/
│   ├── render-server.mjs       # Express server entry point
│   ├── remotion-entry.tsx      # Remotion composition root (server-side only)
│   └── modules/                # Render, AI, plugins, config
├── docs/clean-room/            # Clean room audit trail
├── LICENSE                     # EUPL-1.2
└── README_pl.md                # Polish README
```

## Testing

```bash
cd packages/player && npx vitest run   # 184 tests
cd packages/core   && npx vitest run   #  54 tests
```

## Third-Party Notice

This project's browser bundle contains **zero** Remotion code. The `@remotion/renderer` package
is used exclusively on the server side for video rendering. All preview rendering is handled by
the custom `@revideeo/player` package (EUPL-licensed, original clean-room implementation).

---

*Developed in the European Union · Licensed under EUPL-1.2*
