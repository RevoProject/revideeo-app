# ReVideeo — EUPL-Licensed Video Editor

Web-based video editor with AI-powered auto-captions, multi-track timeline, transitions, and server-side rendering.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Preview Engine:** `@revideeo/player` — native HTML5 renderer (no Remotion dependency in browser)
- **Core Library:** `@revideeo/core` — manifest types, timeline utils, adapter interfaces
- **Server:** Express.js render server (Remotion 4.x for server-side rendering, Chromium, FFmpeg)
- **Deployment:** Vercel (frontend) + self-hosted Node.js (render server)
- **License:** EUPL

## Quick Start

```bash
pnpm install
pnpm dev          # → http://localhost:5173
```

## Render Server

```bash
cd server
pnpm install
node render-server.mjs   # → http://localhost:33623
```

## Export Workflow

```
pnpm build && vercel build --yes && vercel deploy --prebuilt --yes
```

Production deploy:
```
vercel deploy --prebuilt --yes --prod
```

## Project Structure

```
├── src/                    # Frontend application
│   ├── editor/             # Timeline, clip editing, composition preview
│   ├── export/             # Client-side manifest builder + render client
│   ├── i18n/               # Translations (PL, EN, DE)
│   └── components/         # Modals, settings, shared UI
├── packages/
│   ├── core/               # Manifest types, generators, validators, adapters
│   └── player/             # Native HTML5 preview renderer (NativePlayer)
├── server/
│   ├── render-server.mjs   # Express server entry point
│   ├── remotion-entry.tsx  # Remotion composition root (server-side only)
│   └── modules/            # Render, AI, plugins, config
└── docs/clean-room/        # Clean room audit trail
```

## Testing

```bash
cd packages/player && npx vitest run   # 184 tests
cd packages/core && npx vitest run     # 54 tests
```
