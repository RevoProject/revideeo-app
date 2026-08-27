# Core Package Architecture

## Overview

`@revideeo/core` is a standalone TypeScript package containing **generic contracts and public interfaces only**. It does not contain React, DOM access, Blob handling, or plugin-specific business logic.

## Package Structure

```
packages/core/src/
├── frame/          — Frame API types and factory
│   ├── types.ts    — FrameContext, ClipFrameInfo
│   ├── provider.ts — FrameProvider interface
│   ├── api.ts      — FrameAPI interface
│   ├── context.ts  — createFrameContext() factory
│   └── index.ts    — barrel exports
├── media/          — Media API types and factory
│   ├── types.ts    — MediaInfo, MediaKind
│   ├── provider.ts — MediaProvider interface
│   ├── api.ts      — MediaAPI interface
│   ├── context.ts  — createMediaContext() factory
│   └── index.ts    — barrel exports
├── timeline/       — Timeline API types and factory
│   ├── types.ts    — TimelineState, TimelineClipInfo, TimelineTrackInfo
│   ├── provider.ts — TimelineProvider interface
│   ├── api.ts      — TimelineAPI interface
│   ├── context.ts  — createTimelineContext() factory
│   └── index.ts    — barrel exports
├── manifest/       — Project manifest processing
├── adapters/       — Render adapter interfaces (Remotion, FFmpeg, ReVideo)
└── index.ts        — barrel exports
```

## Design Rules

1. **Generic contracts only** — no plugin-specific types, no Whisper concepts
2. **No React dependency** — pure TypeScript interfaces and factories
3. **No DOM/Blob access** — providers are injected, not imported
4. **Portable** — works in browser and server contexts
5. **Immutable snapshots** — returned data is readonly and isolated

## Export Map

```json
{
  ".": "./src/index.ts",
  "./frame": "./src/frame/index.ts",
  "./media": "./src/media/index.ts",
  "./timeline": "./src/timeline/index.ts",
  "./manifest": "./src/manifest/index.ts",
  "./adapters": "./src/adapters/index.ts"
}
```

## Clean Room

The `@revideeo/core` package was created under EUPL-1.2 clean room procedures. See [Clean Room Spec](../clean-room/CLEAN_ROOM_SPEC.md) for the full audit trail.
