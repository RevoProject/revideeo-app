# ReVideeo

**Web-based video editor** with AI-powered auto-captions, multi-track timeline, transitions, and multi-format export.

Made with ❤️ in Poland for the European Union.

> **Render server required** — For video export and AI-assisted editing, you need the
> separate render server: [revideeo-render-server](https://github.com/RevoProject/revideeo-render-server).
> The frontend app alone provides timeline editing, preview, and project management.

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
- Progressive Web App (PWA) with offline support
- Internationalization: Polish, English, German
- Render server for video export (separate repo)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Preview Engine | `@revideeo/player` — native HTML5 renderer (EUPL-1.2) |
| Core Library | `@revideeo/core` — manifest types, timeline utils, adapter interfaces |
| Render Server | [revideeo-render-server](https://github.com/RevoProject/revideeo-render-server) (separate repo) |
| Deployment | Vercel (frontend) + self-hosted Node.js (render server) |
| Testing | Vitest (238 tests) |

## Render Server

Video export and AI-assisted editing features require the render server.
It is maintained as a **separate repository**:

**→ [github.com/RevoProject/revideeo-render-server](https://github.com/RevoProject/revideeo-render-server)**

The render server runs independently and is NOT part of this repository's browser bundle.

## Quick Start

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
├── docs/
│   ├── ai-docs/                # AI agent documentation
│   ├── user-docs/              # End-user documentation
│   ├── plugin-api/             # Plugin API docs (EN, PL)
│   └── clean-room/             # Clean room audit trail
├── LICENSE                     # EUPL-1.2
├── LICENSE_REMOTION.md         # Remotion license (for reference only — see Notice)
├── NOTICE                      # Third-party attributions
├── publiccode.yml              # EU Open Source Solutions Catalogue metadata
└── README_pl.md                # Polish README
```

## Testing

```bash
cd packages/player && npx vitest run   # 184 tests
cd packages/core   && npx vitest run   #  54 tests
```

## Third-Party Notice

This project does **not** include any Remotion code in its browser bundle.
Remotion is used exclusively by the separate render server
([revideeo-render-server](https://github.com/RevoProject/revideeo-render-server)),
which maintains its own dependencies and license obligations.

See [NOTICE](NOTICE) for the full list of third-party dependencies and their licenses.

The `@revideeo/player` package (EUPL-1.2) provides an independent HTML5 preview renderer
(`NativePlayer`) that does **not** depend on Remotion.

---

*Developed in the European Union · Licensed under EUPL-1.2*
