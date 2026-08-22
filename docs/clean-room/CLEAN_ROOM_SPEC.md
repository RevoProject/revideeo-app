# Clean Room Specification — ReVideeo Manifest Generator

## Date: 2026-08-22

## 1. Purpose

This document records the Clean Room Design process used to create the
`@revideeo/core` package — specifically the universal video manifest generator
and renderer adapter layer.

## 2. Black-Box Analysis (Phase 1 — Specification)

### 2.1 What was analyzed

The **external behavior** of the rendering pipeline was studied by observing:

- The JSON structure sent from the browser client to the render server via
  `POST /api/render` (observed via browser DevTools / network tab).
- The HTTP contract: `FormData` with a `config` JSON field and binary asset files.
- The SSE event stream contract for progress reporting.
- The output: a video file served via `GET /api/render/:jobId/file`.

### 2.2 What was NOT analyzed

- No source code from the Remotion GitHub repository was read.
- No Remotion internal function names, class names, or implementation patterns
  were referenced.
- No `@remotion/bundler`, `@remotion/renderer`, or `remotion` package source
  code was inspected beyond reading their public TypeScript type declarations
  (`.d.ts` files) for interface compatibility.
- No copy-paste from any external codebase.

### 2.3 Observed input/output contract

The render server accepts a JSON config with this shape (observed externally):

```
{
  clips: Array<{ id, sourceId, trackIndex, offsetInTimeline, startFrame,
    durationInFrames, scale, posX, posY, width, height, transitionIn,
    transitionDurationInFrames, ... }>,
  trackSettings: Array<{ name, locked, muted, hidden }>,
  fps: number,
  width: number,
  height: number,
  totalFrames: number,
  startFrame: number,
  durationInFrames: number,
  format: 'mp4' | 'mkv' | 'webm',
  normalize: boolean
}
```

This is a **data format**, not protectable expression. It describes what the
renderer needs — not how the renderer processes it.

## 3. Specification (Phase 1 Output)

### 3.1 Generator function specification

```
Function: generateVideoProjectConfig(input: ManifestInput) → ReVideeoManifest

Purpose: Convert editor timeline state into a universal, renderer-agnostic
video project manifest.

Input parameters:
  - projectName: string
  - resolution: { label, width, height }
  - fps: number
  - clips: StoredClip[] (timeline clip data)
  - trackSettings: TrackSettings[] (per-track metadata)
  - totalFrames: number
  - outputFormat: 'mp4' | 'webm' | 'mkv'
  - renderRange?: { startFrame, endFrame }
  - normalize?: boolean
  - metadata?: { createdAt, author, version }

Output: ReVideeoManifest — a self-describing JSON object containing all data
needed by any renderer to produce the final video.

Design constraints:
  - Pure function: same inputs always produce the same output.
  - No side effects (no DOM, no network, no filesystem).
  - No external dependencies (pure TypeScript).
  - Deterministic: no random IDs inside the generator; IDs come from input.
```

### 3.2 Adapter interface specification

```
Interface: RendererAdapter

Method: toRendererPayload(manifest) → RendererSpecificPayload

Purpose: Transform a universal ReVideeoManifest into a format consumable by
a specific rendering engine (Remotion, FFmpeg, Revideo, etc.).

Each adapter is responsible for:
  - Mapping manifest types to renderer-specific types
  - Handling renderer-specific configuration (codec strings, CLI args, etc.)
  - Preserving all semantic information from the manifest
```

## 4. Implementation (Phase 2 — Coding)

### 4.1 What was implemented

All code in `packages/core/src/` was written **from scratch** using only the
specification from Phase 1. The implementation uses:

- Custom type names (`ReVideeoManifest`, `ManifestInput`, `ManifestClip`, etc.)
- Custom function names (`generateVideoProjectConfig`, `computeContentDuration`,
  `findClipEndFrame`, etc.)
- Custom code patterns (explicit iteration, conditional logic, type guards)
- No shared utility libraries with Remotion

### 4.2 Architecture decisions

1. **Single entry point**: `generateVideoProjectConfig()` is the sole public
   generator function. Simple, testable, composable.

2. **Flat manifest structure**: The manifest uses a flat, self-documenting JSON
   structure rather than nested class hierarchies.

3. **Adapter Pattern**: Each renderer gets its own adapter module. The core
   never depends on any renderer package.

4. **Validation layer**: `validateManifest()` provides runtime type checking
   without requiring a schema library.

## 5. Audit Trail

| Date | Action | Evidence |
|------|--------|----------|
| 2026-08-22 | Analyzed render API contract via HTTP observation | This document, §2.3 |
| 2026-08-22 | Wrote manifest type definitions | `packages/core/src/manifest/types.ts` |
| 2026-08-22 | Implemented generator function | `packages/core/src/manifest/generator.ts` |
| 2026-08-22 | Implemented timeline utilities | `packages/core/src/manifest/timeline.ts` |
| 2026-08-22 | Implemented adapter interfaces + Remotion/FFmpeg adapters | `packages/core/src/adapters/` |
| 2026-08-22 | Wrote unit tests with ReVideeo-native assertions | `packages/core/tests/` |

## 6. Verification

All test assertions reference `ReVideeoManifest` structures exclusively.
No test fixtures contain Remotion-generated config objects.
The Git history from this commit onward shows the entire core package was
authored independently.
