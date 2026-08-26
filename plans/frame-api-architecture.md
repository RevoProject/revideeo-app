# Frame API — Architecture Audit & Proposal (Revised)

> Status: PROPOSAL v2 — Awaiting approval before any production changes.
> Revised: Browser-first Phase 1 with real pixel access.

---

## 1. Architecture Audit Summary

### 1.1 Current Rendering Architecture

ReVideo has two parallel rendering pipelines:

| Pipeline | Location | Runtime | Mechanism |
|----------|----------|---------|-----------|
| **NativePlayer** | `packages/player/src/` | Browser DOM | `<video>`, `<img>`, `<audio>` + CSS transforms |
| **VideoComposition** | `src/editor/composition/` | Remotion | `<Video>`, `<Img>`, `<Audio>` + `useCurrentFrame()` |

**Critical observation:** Neither pipeline uses `VideoFrame`, `ImageBitmap`, or canvas compositing. All rendering is DOM-based. Canvas is only used for thumbnail generation (`src/App.tsx:284-293`).

### 1.2 The Integration Point

`ClipRenderer` (`packages/player/src/ClipRenderer.tsx:20`) creates `<video>` elements with private `useRef<HTMLVideoElement>` refs. These refs are not exposed anywhere — but the elements exist in the DOM and are already seeked to the correct position by the ClipRenderer's `useEffect` (line 34-48).

**The existing thumbnail generation pattern** (`src/App.tsx:284-293`) already demonstrates pixel extraction from `<video>` elements via `canvas.drawImage(video, ...)`. This is the exact mechanism the Frame API needs.

### 1.3 Key Constraint

The Frame API must not expose `<video>` elements, DOM nodes, React state, internal player refs, or implementation-specific objects to plugins. The `BrowserFrameProvider` can internally use these, but the public API must be renderer-agnostic.

---

## 2. Revised Architecture

### 2.1 Design Principle: Source-Frame First

The first useful version provides **source-frame pixel access** — the raw pixels of a single clip's media at a given frame. This is what plugins like Basic Motion, CV/AI analysis, and filters actually need.

**Phase 1 does NOT need to:**
- Composite multiple overlapping clips
- Apply CSS transforms, transitions, or effects
- Reproduce the full timeline visual output

**Phase 1 DOES provide:**
- Real pixel data (`ImageBitmap`) from any video or image clip
- Frame metadata (frame number, time, fps, dimensions)
- Per-clip frame context (local frame, source frame, visibility)
- Deterministic, repeatable frame access

### 2.2 Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    ReVideo Browser                        │
│                                                          │
│  ┌──────────────────┐                                    │
│  │   NativePlayer    │                                    │
│  │                   │                                    │
│  │  ┌─────────────┐ │     ┌──────────────────────┐      │
│  │  │ ClipRenderer │──────▶│   MediaRegistry       │      │
│  │  │ <video> ref  │ reg. │  (module singleton)    │      │
│  │  └─────────────┘ │     │  clipId → HTMLVideo    │      │
│  │                   │     │  clipId → HTMLImage    │      │
│  └──────────────────┘     └──────────┬───────────┘      │
│                                       │                   │
│                                       ▼                   │
│                          ┌────────────────────────┐      │
│                          │  BrowserFrameProvider   │      │
│                          │                         │      │
│                          │  getClipFrame(clipId)   │      │
│                          │    → canvas.drawImage() │      │
│                          │    → createImageBitmap()│      │
│                          └────────────┬───────────┘      │
│                                       │                   │
│                                       ▼                   │
│                          ┌────────────────────────┐      │
│                          │      Frame API          │      │
│                          │  (types + factory)      │      │
│                          └────────────┬───────────┘      │
│                                       │                   │
└───────────────────────────────────────┼───────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────┐
│                   Plugin Context                          │
│                                                          │
│  context.frame.getClipFrame('clip-id')                   │
│    → Promise<ImageBitmap | null>                         │
│                                                          │
│  context.frame.getContext()                               │
│    → { frame, time, fps, width, height }                 │
│                                                          │
│  context.frame.getClipInfo('clip-id')                    │
│    → { localFrame, sourceFrame, type, visible }          │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Basic Motion │  │ CV / AI      │  │ Filters      │  │
│  │ (position,   │  │ (pixel       │  │ (per-clip    │  │
│  │  transform)  │  │  analysis)   │  │  processing) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 2.3 The Three Layers

**Layer 1: MediaRegistry** (bridge between DOM and Frame API)
- Module-level singleton in `packages/player/src/mediaRegistry.ts`
- `ClipRenderer` registers `<video>` / `<img>` elements on mount, unregisters on unmount
- Keyed by clip ID
- No React state, no DOM queries — clean separation

**Layer 2: BrowserFrameProvider** (pixel extraction)
- Implements `FrameProvider` interface from `@revideeo/core`
- Lives in `src/frame/browserProvider.ts` (app-level, depends on MediaRegistry)
- `getClipFrame()`: seeks video (if needed), draws to OffscreenCanvas, returns ImageBitmap
- Handles video, image, and text clip types
- Returns `null` for audio clips and unregistered clips

**Layer 3: FrameAPI** (plugin-facing interface)
- Created by `createFrameContext()` factory in `@revideeo/core`
- Wraps a `FrameProvider` with state accessors
- Exposed to plugins via `context.frame`

---

## 3. Proposed Public API

### 3.1 Core Types (`packages/core/src/frame/types.ts`)

```typescript
/**
 * Immutable snapshot of composition state.
 * No internal references. Safe to pass across boundaries.
 */
export interface FrameContext {
  /** Current frame number (0-indexed, absolute on timeline) */
  readonly frame: number;
  /** Current time in seconds (frame / fps) */
  readonly time: number;
  /** Frames per second */
  readonly fps: number;
  /** Composition width in pixels */
  readonly width: number;
  /** Composition height in pixels */
  readonly height: number;
  /** Total duration in frames */
  readonly durationInFrames: number;
}

/**
 * Metadata for a specific clip at a given frame.
 */
export interface ClipFrameInfo {
  /** Clip identifier */
  readonly clipId: string;
  /** Local frame within this clip (0-based) */
  readonly localFrame: number;
  /** Frame within the source media */
  readonly sourceFrame: number;
  /** Time within the clip in seconds */
  readonly localTime: number;
  /** Time within the source media in seconds */
  readonly sourceTime: number;
  /** Clip type */
  readonly type: 'video' | 'image' | 'audio' | 'text';
  /** Whether this clip is visible at the queried frame */
  readonly visible: boolean;
  /** Source media width in pixels (if available) */
  readonly sourceWidth?: number;
  /** Source media height in pixels (if available) */
  readonly sourceHeight?: number;
}
```

### 3.2 Provider Interface (`packages/core/src/frame/provider.ts`)

```typescript
/**
 * Renderer-agnostic interface for extracting frame pixels.
 * Implementations live in app-level code (BrowserFrameProvider, etc.).
 * Not exported to plugins — only used by FrameAPI internals.
 */
export interface FrameProvider {
  /**
   * Extract pixels from a specific clip at the given frame.
   *
   * The implementation handles seeking (if needed) and pixel extraction.
   * The returned ImageBitmap is owned by the caller — they MUST call .close().
   *
   * @param clipId - The clip to extract from
   * @param sourceFrame - Frame number within the source media
   * @param width - Desired output width (implementation may scale)
   * @param height - Desired output height (implementation may scale)
   * @returns ImageBitmap of the clip frame, or null if unavailable
   */
  getClipFrame(
    clipId: string,
    sourceFrame: number,
    width: number,
    height: number,
  ): Promise<ImageBitmap | null>;

  /**
   * Get native dimensions of a clip's source media.
   * Returns null if dimensions are unknown (e.g., text clips).
   */
  getClipDimensions(clipId: string): { width: number; height: number } | null;

  /** Whether this provider can extract pixel data */
  readonly available: boolean;
}
```

### 3.3 Plugin-Facing API (`packages/core/src/frame/api.ts`)

```typescript
/**
 * Frame API exposed to plugins via context.frame.
 * All methods are safe to call from any plugin context.
 */
export interface FrameAPI {
  /**
   * Get pixel data for a specific clip at the current (or specified) frame.
   *
   * Returns the raw source frame — no CSS transforms, transitions, or
   * composition effects are applied. This is the clip's media frame as-is.
   *
   * Caller MUST call bitmap.close() when done.
   *
   * @param clipId - The clip to extract from
   * @param frame - Timeline frame number. Defaults to current frame.
   * @returns ImageBitmap of the source frame, or null if unavailable
   *   (audio clips, text clips, unregistered clips, server context)
   */
  getClipFrame(clipId: string, frame?: number): Promise<ImageBitmap | null>;

  /**
   * Get the current composition context.
   * Pure computation — no allocations, no async.
   */
  getContext(): FrameContext;

  /**
   * Get frame metadata for a specific clip.
   * No pixel data — just frame numbers, timing, and visibility.
   */
  getClipInfo(clipId: string, frame?: number): ClipFrameInfo | null;

  /**
   * Get all clips visible at the current (or specified) frame.
   * Returns metadata only — no pixel data.
   */
  getVisibleClips(frame?: number): readonly ClipFrameInfo[];
}
```

### 3.4 Why This API Design

**`getClipFrame()` instead of `getCurrentFrame()`:**
- Phase 1 is source-frame access, not composited frames
- Plugins need to identify which clip they're analyzing
- Basic Motion needs the foreground clip's pixels; CV needs the input clip's pixels
- The method name clearly communicates what it returns

**`ImageBitmap` as return type:**
- `drawImage(video, ...)` → `createImageBitmap(canvas)` is the standard browser path
- `ImageBitmap` is transferable (useful for Web Workers in CV plugins)
- `ImageBitmap` can be converted to `ImageData` via `createImageBitmap` + `getImageData()` for CV/AI
- Future: `VideoFrame` can be added as `getVideoFrame()` without removing `getClipFrame()`

**Optional `frame` parameter:**
- Defaults to current playhead position
- Allows plugins to analyze frames at arbitrary positions (thumbnails, scene detection, pre-analysis)

**`ClipFrameInfo` includes `sourceWidth`/`sourceHeight`:**
- Plugins need to know the source dimensions for scaling, positioning, and CV analysis
- Avoids requiring plugins to load the media separately just to get dimensions

---

## 4. MediaRegistry Design

### 4.1 The Bridge

The `MediaRegistry` is the only new code in the player package. It's a plain module — no React, no DOM:

```typescript
// packages/player/src/mediaRegistry.ts

type MediaElement = HTMLVideoElement | HTMLImageElement;

class MediaRegistryImpl {
  private elements = new Map<string, MediaElement>();

  register(clipId: string, element: MediaElement): void {
    this.elements.set(clipId, element);
  }

  unregister(clipId: string): void {
    this.elements.delete(clipId);
  }

  get(clipId: string): MediaElement | undefined {
    return this.elements.get(clipId);
  }

  has(clipId: string): boolean {
    return this.elements.has(clipId);
  }

  clear(): void {
    this.elements.clear();
  }
}

export const mediaRegistry = new MediaRegistryImpl();
```

### 4.2 ClipRenderer Integration

Minimal change to `ClipRenderer.tsx` — add 2 lines:

```diff
// packages/player/src/ClipRenderer.tsx
+ import { mediaRegistry } from './mediaRegistry.js';

  export const ClipRenderer = ({ clip, outgoing, muted, frame, playing }: ClipRendererProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

+   useEffect(() => {
+     const el = videoRef.current;
+     if (el && (clip.type === 'video')) {
+       mediaRegistry.register(clip.id, el);
+       return () => mediaRegistry.unregister(clip.id);
+     }
+     if (clip.type === 'image') {
+       // For images, we need the <img> element — but ClipRenderer returns
+       // <img> directly without a ref. See Section 4.3 for the solution.
+     }
+   }, [clip.id, clip.type]);

    // ... rest of existing code
  };
```

### 4.3 Image Clip Handling

`ClipRenderer` renders `<img>` for image clips (line 100-102) but without a ref. Two options:

**Option A (recommended): Add a ref to the `<img>` element.**
```diff
  if (clip.type === 'image') {
-   return <img src={clip.url ?? ''} style={style as React.CSSProperties} alt="" />;
+   const imgRef = useRef<HTMLImageElement>(null);
+   useEffect(() => {
+     const el = imgRef.current;
+     if (el) {
+       mediaRegistry.register(clip.id, el);
+       return () => mediaRegistry.unregister(clip.id);
+     }
+   }, [clip.id]);
+   return <img ref={imgRef} src={clip.url ?? ''} style={style as React.CSSProperties} alt="" />;
  }
```

**Option B: Use the URL from the clip and create an offscreen `<img>` in the provider.**
More decoupled but requires the provider to manage its own image cache.

**Recommendation: Option A** — minimal change, consistent with video element registration.

### 4.4 Text Clips

Text clips are rendered as `<div>` elements with CSS styling. For Phase 1, `getClipFrame()` returns `null` for text clips. Phase 2 can render text to canvas using the same CSS properties.

### 4.5 Audio Clips

Audio clips are invisible. `getClipFrame()` always returns `null` for audio clips.

---

## 5. BrowserFrameProvider Implementation

### 5.1 Pixel Extraction Path

For a video clip at a given frame:

```
1. Look up clipId in MediaRegistry → get <video> element
2. Compute source time: sourceFrame / fps
3. If video.currentTime is not at desired time:
   a. Seek video: video.currentTime = sourceTime
   b. Wait for seeked event (if needed)
4. Create OffscreenCanvas at video.videoWidth × video.videoHeight
5. Draw: ctx.drawImage(video, 0, 0)
6. Return: createImageBitmap(canvas)
```

This is functionally identical to the existing thumbnail generation at `src/App.tsx:284-293`, but targeting a specific frame instead of evenly-spaced thumbnails.

### 5.2 Seek Precision

The ClipRenderer already seeks the video to `(clip.startFrame + localFrame) / 30` (hardcoded fps at `ClipRenderer.tsx:37`). When `getClipFrame()` is called:

- **If paused:** The video is already at the correct position (ClipRenderer's useEffect ensures this)
- **If playing:** The video is advancing. The provider should use `video.currentTime` as-is and draw the current frame — this gives the closest available frame without disrupting playback
- **For precise access:** The caller should pause playback first, then seek, then call `getClipFrame()`

### 5.3 Fallback: Canvas 2D (No OffscreenCanvas)

`OffscreenCanvas` is not available in all browsers (Firefox < 105). Fallback path:

```typescript
// If OffscreenCanvas is not available
const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
const ctx = canvas.getContext('2d')!;
ctx.drawImage(video, 0, 0);
// canvas.toBlob() → createImageBitmap(blob)
const blob = await new Promise<Blob>((resolve) =>
  canvas.toBlob((b) => resolve(b!), 'image/png')
);
return createImageBitmap(blob);
```

### 5.4 Performance Considerations

**Repeated calls:** If a plugin calls `getClipFrame()` 60 times per second for the same clip, the provider creates a new `ImageBitmap` each time. This is acceptable because:
- `ImageBitmap` creation is fast (GPU-accelerated in modern browsers)
- The caller owns the bitmap and must `close()` it
- No internal caching needed in v1 — plugins manage their own frame lifecycle

**Future optimization (not v1):** An `ImageBitmap` pool that recycles bitmaps:

```typescript
// Future: not in Phase 1
class PooledFrameProvider implements FrameProvider {
  private pool: ImageBitmap[] = [];

  async getClipFrame(clipId, sourceFrame, w, h) {
    const bitmap = this.pool.pop() ?? await this.createBitmap(w, h);
    // draw to bitmap's canvas...
    return bitmap;
  }

  release(bitmap: ImageBitmap) {
    this.pool.push(bitmap);
  }
}
```

**Video seek latency:** Seeking a `<video>` element is near-instant for most formats (< 16ms). For very large files or slow codecs, the `seeked` event may fire asynchronously. The provider handles this with a promise wrapper around the `seeked` event.

---

## 6. Resource / Lifecycle Strategy

### 6.1 ImageBitmap Ownership

- `getClipFrame()` returns an `ImageBitmap` that **the caller owns**
- The caller MUST call `.close()` when done
- Documented in JSDoc and enforced by convention
- No reference counting, no WeakRef, no FinalizationRegistry — simple for v1

### 6.2 MediaRegistry Lifecycle

```
App mounts NativePlayer
  └─ ClipRenderer mounts for clip "c1"
  └─ mediaRegistry.register("c1", <video> element)

ClipRenderer re-renders (new clip replaces old)
  └─ Old ClipRenderer unmounts → mediaRegistry.unregister("c1")
  └─ New ClipRenderer mounts → mediaRegistry.register("c1", <video> element)

App unmounts NativePlayer
  └─ All ClipRenderers unmount → mediaRegistry.clear()
```

### 6.3 Provider Lifecycle

```
App startup
  └─ BrowserFrameProvider created (holds reference to mediaRegistry)

Plugin activated
  └─ registry.buildContext(id) → creates FrameAPI wrapping provider
  └─ FrameAPI is lightweight (closures over provider + state accessors)

Plugin calls getClipFrame()
  └─ FrameAPI delegates to BrowserFrameProvider
  └─ BrowserFrameProvider queries MediaRegistry
  └─ Draws to canvas, returns ImageBitmap
  └─ Caller closes bitmap when done

Plugin deactivated
  └─ Plugin's deactivate() should close any open ImageBitmaps
  └─ FrameAPI is garbage collected (no cleanup needed)
  └─ MediaRegistry entries persist (other plugins may be using them)
```

### 6.4 No Automatic Cleanup

The Frame API does not track or dispose plugin resources. This matches the existing pattern — plugins are responsible for their own resource management (same as event subscriptions, DOM elements in panels, etc.).

---

## 7. Repository Layout

### 7.1 New Files

| File | Package | Purpose |
|------|---------|---------|
| `packages/core/src/frame/types.ts` | `@revideeo/core` | `FrameContext`, `ClipFrameInfo` interfaces |
| `packages/core/src/frame/provider.ts` | `@revideeo/core` | `FrameProvider` interface |
| `packages/core/src/frame/api.ts` | `@revideeo/core` | `FrameAPI` interface |
| `packages/core/src/frame/context.ts` | `@revideeo/core` | `createFrameContext()` factory |
| `packages/core/src/frame/index.ts` | `@revideeo/core` | Barrel exports |
| `packages/player/src/mediaRegistry.ts` | `@revideeo/player` | `mediaRegistry` singleton |
| `src/frame/browserProvider.ts` | `revideeo` (app) | `BrowserFrameProvider` implementation |
| `packages/core/tests/frame.test.ts` | `@revideeo/core` | Unit tests for context factory |
| `tests/frameApi.test.ts` | `revideeo` (root) | Integration tests for plugin frame access |

### 7.2 Modified Files

| File | Change |
|------|--------|
| `packages/core/src/index.ts` | Add re-exports from `./frame/index.js` |
| `packages/core/package.json` | Add `"./frame": "./src/frame/index.ts"` to exports |
| `packages/player/src/ClipRenderer.tsx` | Register/unregister video and image elements with `mediaRegistry` |
| `packages/player/src/index.ts` | Export `mediaRegistry` (needed by app-level `BrowserFrameProvider`) |
| `src/api/types.ts` | Add `PluginFrameAPI`, `frame:read` permission |
| `src/api/registry.ts` | Implement `frame` in `buildContext()`, extend `projectContext` with `getFrameProvider()` |
| `src/App.tsx` | Create `BrowserFrameProvider` and pass to registry context |

### 7.3 Files NOT Modified

| File | Why |
|------|-----|
| `packages/player/src/NativePlayer.tsx` | No changes needed — MediaRegistry is used by ClipRenderer, not NativePlayer |
| `packages/player/src/clipStyle.ts` | No changes — Phase 1 doesn't apply CSS transforms to frames |
| `src/editor/composition/VideoComposition.tsx` | No changes — export path is unaffected |
| `src/editor/composition/ClipLayer.tsx` | No changes — export path is unaffected |

---

## 8. Browser vs. Render-Server Considerations

### 8.1 Browser (Phase 1 — Full Implementation)

| Method | Behavior |
|--------|----------|
| `getClipFrame(clipId, frame?)` | Returns `ImageBitmap` for video/image clips. Returns `null` for text/audio/unregistered clips. |
| `getContext()` | Returns full `FrameContext` (pure computation) |
| `getClipInfo(clipId, frame?)` | Returns `ClipFrameInfo` (pure computation) |
| `getVisibleClips(frame?)` | Returns `ClipFrameInfo[]` (pure computation) |

### 8.2 Render Server (Phase 1 — Stub)

All pixel methods return `null`. Metadata methods work (they're pure computation). The render server does not gain frame access until Phase 3.

### 8.3 Future Phases

| Phase | Browser | Server |
|-------|---------|--------|
| **Phase 1** (this PR) | Source-frame pixels via MediaRegistry + canvas | Metadata only (pixel methods return null) |
| **Phase 2** | Composited timeline frame (multi-clip, transforms, transitions) | Metadata + single-frame endpoint |
| **Phase 3** | `VideoFrame` / WebCodecs API for encoding plugins | Full frame access via Remotion frame cache |

---

## 9. Future-Proofing for WebCodecs / VideoFrame

### 9.1 Current Design

`getClipFrame()` returns `ImageBitmap`. This is the right default because:
- `ImageBitmap` is universally available
- `ImageBitmap` is transferable (useful for Web Workers)
- `ImageBitmap` can be converted to `ImageData` for CV/AI
- `ImageBitmap` can be drawn to canvas for compositing

### 9.2 Future Extension: `getVideoFrame()`

When WebCodecs support is needed (e.g., for encoding plugins), add:

```typescript
// Future extension — not in Phase 1
interface FrameAPI {
  // Phase 1 methods...

  /**
   * Get a VideoFrame for encoding via WebCodecs.
   * Only available when the browser supports WebCodecs.
   * Caller MUST call frame.close() when done.
   */
  getVideoFrame?(clipId: string, frame?: number): Promise<VideoFrame | null>;
}
```

The `BrowserFrameProvider` implementation would use `VideoFrame` constructor:

```typescript
// Future: not in Phase 1
async getVideoFrame(clipId: string, sourceFrame: number): Promise<VideoFrame | null> {
  const element = this.registry.get(clipId);
  if (!(element instanceof HTMLVideoElement)) return null;
  // Ensure video is seeked to correct position
  const timestamp = (sourceFrame / this.fps) * 1_000_000; // microseconds
  return new VideoFrame(element, { timestamp });
}
```

### 9.3 Provider Interface Extension

The `FrameProvider` interface is designed to accommodate this:

```typescript
// Future extension
interface FrameProvider {
  // Phase 1
  getClipFrame(clipId, sourceFrame, width, height): Promise<ImageBitmap | null>;
  getClipDimensions(clipId): { width: number; height: number } | null;
  readonly available: boolean;

  // Phase 3 (optional methods)
  getVideoFrame?(clipId: string, sourceFrame: number): Promise<VideoFrame | null>;
  readonly supportsVideoFrame?: boolean;
}
```

---

## 10. Test Plan

### 10.1 Core Unit Tests (`packages/core/tests/frame.test.ts`)

**Test group: FrameContext computation**

| Test | Input | Expected |
|------|-------|----------|
| Frame 0 | frame=0, fps=30, 90 frames, 1920×1080 | `{ frame: 0, time: 0, fps: 30, width: 1920, height: 1080, durationInFrames: 90 }` |
| Middle frame | frame=45, fps=30 | `time: 1.5` |
| Final frame | frame=89, fps=30, 90 frames | `time: 2.9667` |
| 24fps | frame=24, fps=24 | `time: 1.0` |
| 60fps | frame=60, fps=60 | `time: 1.0` |
| 720p | width=1280, height=720 | Correct dimensions |
| 4K | width=3840, height=2160 | Correct dimensions |

**Test group: ClipFrameInfo computation**

| Test | Clip | Frame | Expected localFrame | Expected sourceFrame | Expected visible |
|------|------|-------|---------------------|---------------------|-----------------|
| At start | offset=100, start=0, dur=60 | 100 | 0 | 0 | true |
| At middle | offset=100, start=0, dur=60 | 130 | 30 | 30 | true |
| At end | offset=100, start=0, dur=60 | 159 | 59 | 59 | true |
| Before clip | offset=100, start=0, dur=60 | 50 | - | - | false |
| After clip | offset=100, start=0, dur=60 | 160 | - | - | false |
| With startFrame | offset=100, start=30, dur=60 | 110 | 10 | 40 | true |
| Video type | type='video' | - | - | - | type='video' |
| Image type | type='image' | - | - | - | type='image' |
| Audio type | type='audio' | - | - | - | type='audio' |
| Text type | type='text' | - | - | - | type='text' |

**Test group: getVisibleClips**

| Test | Setup | Expected |
|------|-------|----------|
| Single clip | 1 clip at frame 50 | Array of 1 |
| Transition overlap | 2 clips with 10-frame overlap, at overlap frame | Array of 2 |
| No clips | Empty timeline | Empty array |
| Hidden track | Clip on hidden track | Excluded from results |

**Test group: Determinism**

| Test | Description |
|------|-------------|
| Same inputs → same output | Calling with same state always produces identical values |
| Clip ordering stable | getVisibleClips returns consistent order across calls |
| FPS affects time | Same frame with different fps produces different time |

### 10.2 Integration Tests (`tests/frameApi.test.ts`)

**Test group: Plugin context**

| Test | Description |
|------|-------------|
| frame API available | Plugin with `frame:read` receives `context.frame` |
| permission denied | Plugin without `frame:read` gets `context.frame === undefined` |
| seek updates context | After `seekTo(n)`, `getContext().frame === n` |
| clip changes reflected | After adding clip, `getVisibleClips()` includes it |

**Test group: BrowserFrameProvider (requires jsdom + mock media)**

| Test | Description |
|------|-------------|
| video clip extraction | Mock `<video>` element → `getClipFrame()` returns ImageBitmap |
| image clip extraction | Mock `<img>` element → `getClipFrame()` returns ImageBitmap |
| audio clip returns null | `getClipFrame()` for audio clip returns null |
| text clip returns null | `getClipFrame()` for text clip returns null |
| unregistered clip returns null | Unknown clip ID returns null |
| dimensions available | `getClipDimensions()` returns video width/height |

**Test group: Edge cases**

| Test | Description |
|------|-------------|
| Empty timeline | No clips → `getVisibleClips()` returns [], `getContext()` still works |
| Frame beyond range | Frame > totalFrames → clamped or appropriate state |
| Rapid frame changes | No state corruption from rapid calls |
| Concurrent bitmap access | Multiple `getClipFrame()` calls for same clip don't conflict |

### 10.3 Regression Integration

Add Frame API assertions to existing tests:

- `renderStability.test.ts`: Verify `getVisibleClips()` matches existing clip-under-playhead logic
- `transitionStyles.test.ts`: Verify `getClipInfo()` local frame during transitions
- `bugFixes.test.ts`: Verify frame context stays consistent after clip splits, merges, trims

### 10.4 Test Fixtures

```typescript
// Shared test utilities (not in v1, but recommended)
const makeClip = (overrides: Partial<StoredClip> = {}): StoredClip => ({
  id: 'c1', sourceId: 'asset-1', startFrame: 0, durationInFrames: 60,
  offsetInTimeline: 0, trackIndex: 0, posX: 0, posY: 0, scale: 1,
  transitionIn: 'none', transitionDurationInFrames: 0, ...overrides,
});

const makeFrameContext = (overrides: Partial<FrameContext> = {}): FrameContext => ({
  frame: 0, time: 0, fps: 30, width: 1920, height: 1080,
  durationInFrames: 90, ...overrides,
});
```

---

## 11. Backwards Compatibility & Versioning

### 11.1 API Version

`PLUGIN_API_VERSION` stays at `1`. The Frame API is **purely additive** — existing plugins are unaffected.

### 11.2 Permission Model

New permission: `'frame:read'`

- Plugins without this permission get `context.frame === undefined`
- Existing permission checks in `buildContext()` follow the same pattern
- No existing permissions are modified

### 11.3 Core Package Version

Bump `@revideeo/core` from `0.1.0` to `0.2.0` (minor version — new module, no breaking changes).

### 11.4 Player Package Version

Bump `@revideeo/player` from `0.1.0` to `0.1.1` (patch — MediaRegistry is an internal addition, `mediaRegistry` export is new but non-breaking).

### 11.5 What Is NOT Breaking

- No existing API is modified or removed
- No existing type signatures change
- No existing behavior changes
- `PLUGIN_API_VERSION` is unchanged
- All existing tests must pass without modification

---

## 12. Implementation Phases

### Phase 1 (This PR) — Browser Source-Frame Access

1. Create `packages/core/src/frame/types.ts` — `FrameContext`, `ClipFrameInfo`
2. Create `packages/core/src/frame/provider.ts` — `FrameProvider` interface
3. Create `packages/core/src/frame/api.ts` — `FrameAPI` interface
4. Create `packages/core/src/frame/context.ts` — `createFrameContext()` factory
5. Create `packages/core/src/frame/index.ts` — barrel exports
6. Update `packages/core/src/index.ts` — add frame re-exports
7. Update `packages/core/package.json` — add `./frame` export
8. Create `packages/player/src/mediaRegistry.ts` — `mediaRegistry` singleton
9. Update `packages/player/src/ClipRenderer.tsx` — register/unregister elements
10. Update `packages/player/src/index.ts` — export `mediaRegistry`
11. Create `src/frame/browserProvider.ts` — `BrowserFrameProvider`
12. Update `src/api/types.ts` — add `PluginFrameAPI`, `frame:read` permission
13. Update `src/api/registry.ts` — implement `frame` in `buildContext()`
14. Update `src/App.tsx` — create provider, pass to registry
15. Create `packages/core/tests/frame.test.ts` — core unit tests
16. Create `tests/frameApi.test.ts` — integration tests
17. Run all existing tests — verify no regressions

### Phase 2 (Follow-up) — Composited Timeline Frame

1. Implement composited frame rendering in `BrowserFrameProvider`
2. Add `getCompositedFrame()` method to `FrameAPI`
3. Apply CSS transforms via `computeClipStyle()` → canvas transforms
4. Handle multi-track compositing (z-order, opacity)
5. Handle transitions and fades
6. Add `getVideoFrame()` for WebCodecs (optional)

### Phase 3 (Future) — Server-Side Frame Access

1. Implement `ServerFrameProvider` with Remotion frame cache
2. Add render-server frame request endpoint
3. Add `ImageBitmapPool` for performance
4. Implement effects/filters pipeline via Frame API

---

## 13. Open Questions for Review

1. **Should `getClipFrame()` auto-seek the video to the exact frame, or should it use whatever frame is currently displayed?** Recommendation: Auto-seek for paused state, use current frame for playing state. This matches user expectations — paused = precise, playing = live.

2. **Should the `mediaRegistry` export from `@revideeo/player` be public or should `BrowserFrameProvider` use a different integration path?** Recommendation: Public export. The player package already exports `NativePlayer`, `ClipRenderer`, etc. — `mediaRegistry` is a natural addition. It's a plain singleton, not a React component.

3. **Should `getClipFrame()` for text clips return `null` in Phase 1, or should we implement canvas text rendering now?** Recommendation: Return `null` in Phase 1. Text-to-canvas rendering is straightforward but adds scope. Defer to Phase 2.

4. **Should we add `sourceWidth`/`sourceHeight` to `ClipFrameInfo` in Phase 1, or defer to when the provider can actually report them?** Recommendation: Include them in Phase 1. The provider can report `video.videoWidth`/`video.videoHeight` for video clips and `img.naturalWidth`/`img.naturalHeight` for image clips. Text/audio clips return `undefined`.

---

*Awaiting approval before any production changes are made.*
