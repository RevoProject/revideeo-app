# Timeline API — Architecture Audit & Final Design

> Status: FINAL — Awaiting approval before implementation.

---

## 1. Consistency Review: Overlap Analysis

### 1.1 Existing API Surface

| API | Method | Data | Source |
|-----|--------|------|--------|
| `context.timeline` | `getCurrentFrame()` | current frame | App.tsx `currentFrame` state |
| `context.timeline` | `seekTo(frame)` | navigation | App.tsx `seekTo()` + `playerRef` |
| `context.timeline` | `getTotalFrames()` | total duration | App.tsx `totalFrames` memo |
| `context.timeline` | `addMarker/removeMarker/getMarkers()` | markers | App.tsx `markers` state |
| `context.frame` | `getContext().frame` | current frame | App.tsx `currentFrame` state |
| `context.frame` | `getContext().time` | current time | `currentFrame / fps` |
| `context.frame` | `getContext().fps` | fps | App.tsx `FPS` (from `project.config.fps`) |
| `context.frame` | `getContext().durationInFrames` | total duration | App.tsx `totalFrames` memo |
| `context.frame` | `getContext().width/height` | composition dimensions | App.tsx → `getPreset()` |
| `context.clips` | `getAll()` | all clips | App.tsx `clips` state |
| `context.clips` | `getById(id)` | single clip | App.tsx `clips` state |
| `context.project` | `getConfig().fps` | fps | App.tsx `project.config.fps` |
| `context.project` | `getTrackSettings()` | track metadata | App.tsx `project.trackSettings` |

### 1.2 Proposed Timeline API vs Existing

| Data | Existing API | Proposed TimelineAPI | Duplicate? |
|------|-------------|---------------------|-----------|
| current frame | `timeline.getCurrentFrame()`, `frame.getContext().frame` | `getState().frame` | **Yes** — 3 paths |
| current time | `frame.getContext().time` | `getState().time` | **Yes** — 2 paths |
| fps | `frame.getContext().fps`, `project.getConfig().fps` | `getState().fps` | **Yes** — 3 paths |
| duration (frames) | `timeline.getTotalFrames()`, `frame.getContext().durationInFrames` | `getState().durationInFrames` | **Yes** — 3 paths |
| duration (seconds) | — | `getState().durationInSeconds` | **New** |
| content duration | — | `getState().contentDurationInFrames` | **New** |
| isPlaying | — | `getState().isPlaying` | **New** |
| composition dimensions | `frame.getContext().width/height` | — | Not duplicated |
| seek | `timeline.seekTo()` | `seekTo()` | **Yes** — 2 paths |
| clips (all) | `clips.getAll()` | `getClips()` | **Yes** — different shape |
| clips (by id) | `clips.getById()`, `frame.getClipInfo()` | `getClipById()` | **Yes** — 3 paths |
| tracks | `project.getTrackSettings()` | `getTracks()` | **Yes** — different shape |
| markers | `timeline.getMarkers()` | — | Not duplicated |
| play/pause | — | `play/pause/toggle` | **New** |

### 1.3 Overlap Assessment

**Acceptable overlaps** (different purposes, different shapes):
- `clips.getAll()` returns full `StoredClip[]` with all properties. `getClips()` returns simplified read-only `TimelineClipInfo[]`. Different audiences: mutation API vs query API.
- `project.getTrackSettings()` returns raw settings. `getTracks()` returns indexed `TimelineTrackInfo[]`. Different shape, different purpose.
- `frame.getClipInfo()` returns frame-level clip metadata (localFrame, sourceFrame, visible). `getClipById()` returns clip-level metadata (offset, duration, track). Different granularity.

**Problematic overlaps** (same data, same shape, multiple paths):
- `currentFrame`: `timeline.getCurrentFrame()`, `frame.getContext().frame`, `getState().frame` — all return the same number from the same source. Three ways to get one value.
- `totalFrames`: `timeline.getTotalFrames()`, `frame.getContext().durationInFrames`, `getState().durationInFrames` — same.
- `seekTo()`: `timeline.seekTo()` and `TimelineAPI.seekTo()` — same operation.

---

## 2. Should TimelineAPI Extend PluginTimelineAPI?

**Answer: No — but delegate to it.**

Creating a parallel `context.timelineApi` is correct because:

1. **Permission model mismatch.** `PluginTimelineAPI` is always available (no permission gate). The new API needs `timeline:read` gating. Extending the existing interface would require either making the new methods optional on the existing interface (messy) or gating the entire existing interface (breaking change).

2. **Return type mismatch.** `PluginTimelineAPI.getCurrentFrame()` returns `number`. `TimelineAPI.getState()` returns `TimelineState` snapshot. These are different contracts — you can't add `getState()` to an interface that has `getCurrentFrame()` without creating confusion about which to use.

3. **Backwards compatibility.** Existing plugins use `context.timeline.getCurrentFrame()`. They must continue to work without changes. Adding new methods to the existing interface is safe, but changing its semantics (adding permission gates) is not.

4. **Delegation, not duplication.** `TimelineAPI.seekTo()` should delegate to the same `seekTo()` function that `context.timeline.seekTo()` uses. Single implementation, two access points. The existing method is the source; the new method is a convenience wrapper.

**Recommended approach:**
- `context.timeline` — unchanged, always available, legacy
- `context.timelineApi` — new, permission-gated, rich snapshot API
- `TimelineAPI.seekTo()` delegates to the same `projectContext.seekTo()`

---

## 3. Atomic Snapshot Analysis

### 3.1 Is `getState()` Atomic?

**Yes, with a caveat.**

`getState()` reads from React state values that are captured in closures at `setProjectContext` time. Within a single React render, all state values are consistent (React guarantees this). When `getState()` is called:

```typescript
getState: () => ({
  frame: this.projectContext?.getCurrentFrame() ?? 0,     // reads currentFrame
  isPlaying: this.projectContext?.getIsPlaying() ?? false, // reads isPlaying
  durationInFrames: this.projectContext?.getTotalFrames() ?? 0, // reads totalFrames (memo)
  // ... all from same closure snapshot
})
```

All values come from the same `projectContext` closure, which is rebuilt on every `setProjectContext` call (triggered by App.tsx's `useEffect` on `[project, clips, currentFrame, ...]`). **Within a single call, all values are from the same render cycle.**

**Caveat:** During playback, `currentFrame` updates every ~6 frames (throttled at `NativePlayer.tsx:99`). `isPlaying` updates immediately on toggle. So `getState()` may see `isPlaying=true` with a `frame` that's up to 6 frames behind the actual player position. This is the same lag that exists in `context.timeline.getCurrentFrame()` today — it's a known, documented behavior, not a bug.

### 3.2 Source of Truth Map

| Data | Single Source of Truth | How It's Accessed |
|------|----------------------|-------------------|
| `currentFrame` | `App.tsx` `currentFrame` state (line 464) | Closure via `projectContext.getCurrentFrame()` |
| `isPlaying` | `App.tsx` `isPlaying` state (line 521) | Closure via `projectContext.getIsPlaying()` (new) |
| `fps` | `App.tsx` `FPS` derived value (line 397) | Closure via `projectContext.getConfig().fps` |
| `totalFrames` | `App.tsx` `totalFrames` memo (line 653) | Closure via `projectContext.getTotalFrames()` |
| `contentFrames` | `App.tsx` `contentFrames` memo (line 658) | Closure via `projectContext.getContentFrames()` (new) |
| `clips` | `App.tsx` `clips` state | Closure via `projectContext.getAllClips()` |
| `trackSettings` | `App.tsx` `project.trackSettings` | Closure via `projectContext.getTrackSettings()` |
| `markers` | `App.tsx` `markers` state | Closure via `projectContext.getMarkers()` |
| player playback | `NativePlayer` `playingRef` + `frameRef` | `playerRef.current.toggle()` / `playerRef.current.seekTo()` |

**There is exactly one source of truth for each data point.** The Timeline API reads through closures, never duplicates or caches state.

---

## 4. Race Condition Analysis

### 4.1 `toggle()` / `play()` / `pause()`

```
Plugin calls context.timelineApi.toggle()
  → AppTimelineProvider.toggle()
    → playerRef.current.toggle()          [synchronous — updates playingRef, calls setPlaying]
    → onPlayStateChange(true/false)       [synchronous — calls setIsPlaying in App.tsx]
  → React batches state update
  → Next render: isPlaying = new value
```

**No race condition.** `playerRef.current.toggle()` is synchronous and updates `playingRef` immediately. The RAF loop checks `playingRef.current` every frame. React state updates are batched. The `getState()` snapshot will reflect the new `isPlaying` on the next render.

**Edge case:** If `toggle()` is called twice in rapid succession (same microtask), the second call reads `playingRef.current` which was already flipped by the first. This is correct — double-toggle is idempotent.

### 4.2 `seekTo()`

```
Plugin calls context.timelineApi.seekTo(50)
  → AppTimelineProvider.seekTo(50)
    → App.tsx seekTo(50):
      → setCurrentFrame(50)               [async — React state]
      → playerRef.current.seekTo(50)      [sync — updates frameRef, DOM]
  → If playing: RAF loop continues from new frameRef
  → If paused: player stays at frame 50
```

**No race condition.** Both `setCurrentFrame` and `playerRef.seekTo` are called in the same synchronous block. The RAF loop reads `frameRef.current` (sync) and is not affected by the async React state update.

**Edge case:** Calling `seekTo()` during playback while the RAF loop is mid-frame. The RAF loop's `next = frameRef.current + framesElapsed` will use the newly seeked `frameRef.current` on the next iteration. This is correct — the seek takes effect immediately in the player, and React state catches up on next render.

### 4.3 `seekTo()` + `toggle()` Simultaneously

```
Plugin calls toggle() and seekTo() in same microtask:
  → toggle(): playingRef = true, setPlaying(true)
  → seekTo(50): frameRef = 50, setCurrentFrame(50)
  → Next RAF: reads frameRef (50), reads playingRef (true), advances from 50
```

**No race condition.** Both operations update refs synchronously. React batches state updates. The RAF loop sees consistent ref state.

### 4.4 Summary

| Operation | Race Risk | Mitigation |
|-----------|-----------|------------|
| `toggle()` × 2 | None | Idempotent — `playingRef` flip is immediate |
| `seekTo()` during playback | None | `frameRef` update is synchronous |
| `toggle()` + `seekTo()` | None | Both update refs synchronously, React batches state |
| `getState()` during playback | Lag up to 6 frames | Documented — same as existing `getCurrentFrame()` |

---

## 5. Immutability Analysis

### 5.1 Current `clips.getAll()` Returns References

```typescript
// registry.ts:218
getAll: () => this.projectContext?.getAllClips() ?? [],
```

This returns the **same array reference** as App.tsx's `clips` state. If a plugin mutates the returned array, it would not affect App.tsx state (React state is immutable), but it would violate the read-only contract.

### 5.2 Recommendation: Snapshot Copies

Both `getClips()` and `getTracks()` should return **shallow copies** to prevent accidental mutation:

```typescript
getClips: () => {
  const clips = this.projectContext?.getAllClips() ?? [];
  return clips.map((c) => ({ ...c })); // shallow copy
},
getTracks: () => {
  const settings = this.projectContext?.getTrackSettings() ?? [];
  return settings.map((s, i) => ({ index: i, ...s })); // add index, copy
},
```

This is a defensive measure. The cost is negligible for typical project sizes (10-100 clips).

---

## 6. Permission Semantics

### 6.1 The Problem

`timeline:read` is proposed for the Timeline API, but `play()`, `pause()`, `toggle()`, and `seekTo()` are **write/control operations**. Using a `read` permission for mutations is semantically incorrect.

### 6.2 Analysis of Existing Pattern

The existing codebase already gates `seekTo()` behind `timeline:write`:

```typescript
// registry.ts:210 — seekTo is on context.timeline (always available, no gate)
// But the projectContext.seekTo() is a mutation — it calls setCurrentFrame + playerRef.seekTo
```

Actually, looking more carefully, `context.timeline.seekTo()` is **NOT** permission-gated — it's always available on `PluginTimelineAPI`. The `timeline:write` permission exists in the union but is not checked for `seekTo()`.

### 6.3 Options

| Option | Permission | Pros | Cons |
|--------|-----------|------|------|
| A | `timeline:read` for all | Simple | Semantically wrong for mutations |
| B | `timeline:read` + `timeline:write` | Correct semantics | Two permissions needed for basic plugin |
| C | `timeline:read` for state, no gate for control | Control matches existing behavior | Inconsistent with new API pattern |

### 6.4 Recommendation: Option A

Use `timeline:read` for the entire `context.timelineApi`. Rationale:

1. **Consistency with existing pattern.** `context.timeline.seekTo()` is already ungated. The new API's `seekTo()` delegates to the same function. Gating the new one but not the old one would be inconsistent.

2. **Playback control is not data mutation.** `play/pause/toggle` change player state, not timeline data. They don't modify clips, tracks, markers, or any persistent state. They're closer to "read + control" than "write".

3. **Reduced permission friction.** Plugins that need basic playback awareness (show current frame, react to play/pause) shouldn't need `timeline:write`. If a plugin only reads state and toggles playback, `timeline:read` is sufficient.

4. **Future refinement.** If a future API needs true data mutation (e.g., bulk clip editing), that can be gated behind `timeline:write` separately.

---

## 7. Duplicate Methods Assessment

### 7.1 Methods That Duplicate Existing Functionality

| Proposed Method | Existing Equivalent | Verdict |
|----------------|-------------------|---------|
| `getState().frame` | `context.timeline.getCurrentFrame()` | **Keep** — snapshot is different contract than getter |
| `getState().durationInFrames` | `context.timeline.getTotalFrames()` | **Keep** — part of atomic snapshot |
| `seekTo(frame)` | `context.timeline.seekTo(frame)` | **Keep** — delegate to same impl, convenience |
| `getClips()` | `context.clips.getAll()` | **Keep** — different shape (read-only subset) |
| `getClipById(id)` | `context.clips.getById(id)` | **Keep** — different return type |
| `getTracks()` | `context.project.getTrackSettings()` | **Keep** — different shape (indexed) |

### 7.2 Methods That Are Genuinely New

| Method | Value |
|--------|-------|
| `getState().isPlaying` | Playback state — not available anywhere |
| `getState().durationInSeconds` | Time-based duration — convenient |
| `getState().contentDurationInFrames` | Visible content length — not exposed |
| `getState().contentDurationInSeconds` | Time-based content length |
| `play()` / `pause()` / `toggle()` | Playback control — not available |
| `getClipsAtFrame(frame)` | Frame-specific clip query — new |

### 7.3 Decision

**No methods should be removed.** The overlaps are acceptable because:
- Each API serves a different use case (mutation vs query vs snapshot)
- The underlying data comes from the same source of truth (no duplication of state)
- Different return types serve different plugin needs

---

## 8. Final API Ownership Matrix

| Data | Source of Truth | TimelineAPI | FrameAPI | Existing timeline | Existing clips | Existing project |
|------|----------------|-------------|----------|-------------------|---------------|-----------------|
| current frame | App.tsx `currentFrame` | `getState().frame` | `getContext().frame` | `getCurrentFrame()` | — | — |
| current time | Computed `frame/fps` | `getState().time` | `getContext().time` | — | — | — |
| fps | App.tsx `project.config.fps` | `getState().fps` | `getContext().fps` | — | — | `getConfig().fps` |
| duration (frames) | App.tsx `totalFrames` memo | `getState().durationInFrames` | `getContext().durationInFrames` | `getTotalFrames()` | — | — |
| duration (seconds) | Computed | `getState().durationInSeconds` | — | — | — | — |
| content duration | App.tsx `contentFrames` memo | `getState().contentDurationInFrames` | — | — | — | — |
| isPlaying | App.tsx `isPlaying` state | `getState().isPlaying` | — | — | — | — |
| width/height | App.tsx → `getPreset()` | — | `getContext().width/height` | — | — | — |
| seek | App.tsx `seekTo()` | `seekTo()` ← delegate | — | `seekTo()` | — | — |
| play/pause | NativePlayer `playerRef` | `play/pause/toggle` | — | — | — | — |
| clips (all) | App.tsx `clips` state | `getClips()` (subset) | — | — | `getAll()` (full) | — |
| clips (at frame) | Computed from clips | `getClipsAtFrame()` | `getVisibleClips()` | — | — | — |
| tracks | App.tsx `project.trackSettings` | `getTracks()` (indexed) | — | — | — | `getTrackSettings()` (raw) |
| markers | App.tsx `markers` state | — | — | `getMarkers()` | — | — |
| pixel data | NativePlayer DOM | — | `getClipFrame()` | — | — | — |

---

## 9. Single-Source-of-Truth Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      App.tsx State                           │
│                                                              │
│  currentFrame ─────── useState<number>(0)                    │
│  isPlaying ────────── useState<boolean>(false)               │
│  clips ────────────── useState<StoredClip[]>([])             │
│  markers ──────────── useState<TimelineMarker[]>([])         │
│  totalFrames ──────── useMemo (from clips)                   │
│  contentFrames ────── useMemo (from clips + assets + tracks) │
│  FPS ──────────────── derived (from project.config.fps)      │
│  playerRef ────────── useRef<NativePlayerHandle>(null)        │
│  project.trackSettings ──────────────────────────────────── │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              pluginRegistry.setProjectContext({               │
│  getCurrentFrame: () => currentFrame,                        │
│  getIsPlaying:    () => isPlaying,           ← NEW           │
│  getTotalFrames:  () => totalFrames,                         │
│  getContentFrames: () => contentFrames,     ← NEW           │
│  seekTo,                                                        │
│  getAllClips:     () => clips,                                │
│  getTrackSettings: () => project.trackSettings,               │
│  getMarkers, addMarker, removeMarker,                        │
│  getTimelineProvider: () => timelineProvider, ← NEW           │
│  ...                                                          │
│  })                                                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌──────────────┐ ┌────────────┐ ┌────────────────┐
     │context.timeline│ │context.frame│ │context.timelineApi│
     │ (existing)     │ │ (Frame API) │ │ (NEW, optional)   │
     │ always avail   │ │ frame:read  │ │ timeline:read     │
     └──────────────┘ └────────────┘ └────────────────┘
              │               │               │
              │               │               ▼
              │               │       ┌───────────────┐
              │               │       │ TimelineAPI    │
              │               │       │                │
              │               │       │ getState()     │←── reads closures
              │               │       │ seekTo()       │←── delegates to projectContext.seekTo()
              │               │       │ play/pause/    │←── calls playerRef.toggle()
              │               │       │   toggle       │
              │               │       │ getClips()     │←── reads getAllClips(), maps to subset
              │               │       │ getTracks()    │←── reads getTrackSettings(), maps
              │               │       └───────────────┘
              │               │
              ▼               ▼
     ┌──────────────┐ ┌────────────┐
     │ NativePlayer  │ │ BrowserFP  │
     │ (playerRef)   │ │ (provider) │
     └──────────────┘ └────────────┘
```

**Key invariant:** Every value in `getState()` traces back to exactly one App.tsx state variable or memo. No caching, no duplication, no independent sources.

---

## 10. Final Recommended API Surface

### 10.1 Types

```typescript
// packages/core/src/timeline/types.ts

export interface TimelineState {
  readonly frame: number;
  readonly time: number;
  readonly fps: number;
  readonly durationInFrames: number;
  readonly durationInSeconds: number;
  readonly contentDurationInFrames: number;
  readonly contentDurationInSeconds: number;
  readonly isPlaying: boolean;
}

export interface TimelineClipInfo {
  readonly id: string;
  readonly type: 'video' | 'text' | 'audio' | 'image';
  readonly sourceId: string;
  readonly trackIndex: number;
  readonly offsetInTimeline: number;
  readonly startFrame: number;
  readonly durationInFrames: number;
  readonly transitionIn: string;
}

export interface TimelineTrackInfo {
  readonly index: number;
  readonly name: string;
  readonly locked: boolean;
  readonly muted: boolean;
  readonly hidden: boolean;
}
```

### 10.2 Provider Interface

```typescript
// packages/core/src/timeline/provider.ts

export interface TimelineProvider {
  getState(): TimelineState;
  getClips(): readonly TimelineClipInfo[];
  getTracks(): readonly TimelineTrackInfo[];
  seekTo(frame: number): void;
  play(): void;
  pause(): void;
  toggle(): void;
}
```

### 10.3 API Interface (Final)

```typescript
// packages/core/src/timeline/api.ts

export interface TimelineAPI {
  /** Atomic snapshot of all timeline state */
  getState(): TimelineState;

  /** Navigation — delegates to same impl as context.timeline.seekTo() */
  seekTo(frame: number): void;

  /** Playback control — wraps playerRef.toggle() */
  play(): void;
  pause(): void;
  toggle(): void;

  /** Clip queries — read-only subset of StoredClip */
  getClips(): readonly TimelineClipInfo[];
  getClipById(id: string): TimelineClipInfo | null;
  getClipsAtFrame(frame: number): readonly TimelineClipInfo[];

  /** Track queries — indexed TrackSettings */
  getTracks(): readonly TimelineTrackInfo[];
  getTrack(index: number): TimelineTrackInfo | null;
}
```

### 10.4 Permission Model

| Operation | Permission | Rationale |
|-----------|-----------|-----------|
| `getState()` | `timeline:read` | Read-only state access |
| `getClips/getClipsAtFrame/getClipById` | `timeline:read` | Read-only queries |
| `getTracks/getTrack` | `timeline:read` | Read-only queries |
| `seekTo()` | `timeline:read` | Matches existing `context.timeline.seekTo()` (ungated) |
| `play/pause/toggle` | `timeline:read` | Playback control is not data mutation |

### 10.5 PluginContext Extension

```typescript
interface PluginContext {
  // ... existing ...
  timeline?: TimelineAPI;  // ← RENAME: replaces optional frame/media pattern
                           // Wait — existing `timeline` is PluginTimelineAPI (required)
}
```

**Correction:** `context.timeline` is already `PluginTimelineAPI` (required, not optional). The new API must use a different name:

```typescript
interface PluginContext {
  // ... existing ...
  timeline: PluginTimelineAPI;     // existing, always available
  timelineApi?: TimelineAPI;       // NEW, permission-gated
  frame?: FrameAPI;                // existing
  media?: MediaAPI;                // existing
}
```

### 10.6 What's Removed from Previous Proposal

| Removed | Reason |
|---------|--------|
| `getState().width` | Belongs in Frame API, not Timeline API |
| `getState().height` | Belongs in Frame API, not Timeline API |
| Separate `timeline:control` permission | Unnecessary — `timeline:read` sufficient |
| `getSelectedClips()` | Belongs in `context.clips.getSelected()` |

---

*Awaiting approval before implementation.*
