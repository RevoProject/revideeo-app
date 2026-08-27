# Frame API

> `context.frame` — requires `frame:read` permission

## Purpose

Provides frame-level access to the current composition state: frame number, time, FPS, dimensions, and the ability to extract pixel data from individual clips.

## Access

```typescript
const fps = context.frame?.getContext().fps ?? 30;
const dimensions = { width: context.frame?.getContext().width, height: context.frame?.getContext().height };
```

The `context.frame` property is `undefined` when the plugin does not have the `frame:read` permission or when no project is loaded.

## API Surface

### `getContext(): FrameContext`

Returns an immutable snapshot of the current composition state.

```typescript
interface FrameContext {
  readonly frame: number;           // Current frame number (0-indexed)
  readonly time: number;            // Current time in seconds (frame / fps)
  readonly fps: number;             // Frames per second
  readonly width: number;           // Composition width in pixels
  readonly height: number;          // Composition height in pixels
  readonly durationInFrames: number; // Total duration in frames
}
```

### `getClipFrame(clipId: string, frame?: number): Promise<ImageBitmap | null>`

Extracts pixel data from a specific clip at the given frame.

- Returns `ImageBitmap` for video/image clips
- Returns `null` for audio clips, text clips, or unregistered clips
- Caller **must** call `.close()` on the returned `ImageBitmap`
- The `frame` parameter defaults to the current playhead position

**Known limitation (v0.3.0):** In the browser, this reads the currently displayed frame from the `<video>` element. For precise frame-accurate access, the caller should pause playback before calling.

### `getClipInfo(clipId: string, frame?: number): ClipFrameInfo | null`

Returns frame metadata for a specific clip.

```typescript
interface ClipFrameInfo {
  readonly clipId: string;
  readonly localFrame: number;      // Frame within the clip (0-based)
  readonly sourceFrame: number;     // Frame within the source media
  readonly localTime: number;       // Time within the clip in seconds
  readonly sourceTime: number;      // Time within the source in seconds
  readonly type: 'video' | 'text' | 'audio' | 'image';
  readonly visible: boolean;
  readonly sourceWidth?: number;    // Source media width (if available)
  readonly sourceHeight?: number;   // Source media height (if available)
}
```

### `getVisibleClips(frame?: number): readonly ClipFrameInfo[]`

Returns all clips visible at the given frame. Respects hidden tracks.

## Data Model

Frame data is provided by `BrowserFrameProvider`, which reads from the `MediaRegistry` (internal DOM element registry) and uses `canvas.drawImage()` → `createImageBitmap()` for pixel extraction.

The Frame API is **renderer-agnostic** — the plugin-facing interface (`FrameAPI`) never exposes DOM elements, `<video>` tags, or internal state. The `BrowserFrameProvider` is an internal implementation detail.

## Limitations

- `getClipFrame()` returns `null` for text and audio clips (no pixel data)
- Pixel data reads the currently displayed frame; not independently seeked
- Server-side rendering returns `null` for `getClipFrame()` (metadata-only)
- ImageBitmap must be closed by the caller to prevent GPU memory leaks
