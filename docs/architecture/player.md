# Player Architecture

## Overview

`@revideeo/player` provides browser-native video playback using DOM media elements, CSS transforms, and `requestAnimationFrame` timing.

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `NativePlayer` | `NativePlayer.tsx` | RAF timing loop, frame display, track/clip rendering |
| `ClipRenderer` | `ClipRenderer.tsx` | Individual media element rendering, seek sync, speed |
| `mediaRegistry` | `mediaRegistry.ts` | DOM element registry — bridges DOM to plugin APIs |
| `clipStyle` | `clipStyle.ts` | CSS transform computation (position, scale, transitions) |

## Frame Timing

```
requestAnimationFrame loop (NativePlayer)
  → compute delta from last frame
  → advance frameRef by (delta / 1000) * fps
  → setDisplayFrame(newFrame)          — every RAF (triggers React render)
  → onFrameChange(newFrame)            — every 2nd RAF (triggers App state update)
  → rafRef = requestAnimationFrame(loop)
```

## Seek Synchronization

`ClipRenderer` syncs `<video>` / `<audio>` element `currentTime` to the expected frame position:

```typescript
const desired = (clip.startFrame + frame) / fps;
if (Math.abs(el.currentTime - desired) > 0.02) {
  el.currentTime = desired;
}
```

**Key parameters:**
- FPS comes from the `fps` prop (not hardcoded)
- Threshold is 0.02 seconds (20ms) — tightened from previous 0.15s
- `playbackRate` is applied from `clip.playbackRate`

## MediaRegistry

The `mediaRegistry` is a module-level singleton that stores references to DOM media elements keyed by clip ID. It serves as the bridge between DOM elements and the Frame API's `BrowserFrameProvider`.

```
ClipRenderer mounts <video>
  → mediaRegistry.register(clip.id, videoElement)

BrowserFrameProvider.getClipFrame(clipId)
  → mediaRegistry.get(clipId) → HTMLVideoElement
  → canvas.drawImage(video, ...) → createImageBitmap()
```

## Known Limitations

- Frame accuracy depends on browser `<video>` seeking precision
- `displayFrame` throttling may cause visible stuttering at very high FPS
- `getClipFrame()` reads the currently displayed frame, not independently seeked
