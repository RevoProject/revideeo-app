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

The browser bundle uses [Remotion](https://www.remotion.dev/) for the composition
preview engine (`VideoComposition`, `ClipLayer`). The preview engine renders clips with transitions
inside the browser using Remotion's `AbsoluteFill`, `Sequence`, and `useCurrentFrame` primitives.

**Important:** Remotion is NOT MIT licensed. It uses a custom two-tier license (Free License for
individuals/small companies, Company License required for larger for-profit organizations).
See `LICENSE_REMOTION.md` for the full license text. Remotion is a third-party dependency
subject to its own license terms.

Server-side video rendering also uses Remotion via `@remotion/renderer`.

The `@revideeo/player` package (EUPL-1.2) provides an independent HTML5 preview renderer
(`NativePlayer`) that does **not** depend on Remotion.

---

*Developed in the European Union · Licensed under EUPL-1.2*
