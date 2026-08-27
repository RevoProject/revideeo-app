# Timeline API

> `context.timelineApi` — requires `timeline:read` permission

## Purpose

Provides atomic timeline state snapshots, playback control, and read-only clip/track queries. The API is designed for plugins that need to observe or control the timeline without directly mutating application state.

## Access

```typescript
const state = context.timelineApi?.getState();
const isPlaying = state?.isPlaying ?? false;
context.timelineApi?.play();
```

## API Surface

### State

#### `getState(): TimelineState`

Returns an immutable snapshot of timeline state.

```typescript
interface TimelineState {
  readonly frame: number;
  readonly time: number;
  readonly fps: number;
  readonly durationInFrames: number;
  readonly durationInSeconds: number;
  readonly contentDurationInFrames: number;
  readonly contentDurationInSeconds: number;
  readonly isPlaying: boolean;
}
```

**Note:** During active playback, `frame` reflects the application's timeline state and may lag behind the actual displayed media frame due to existing frame update throttling.

### Navigation

#### `seekTo(frame: number): void`

Seeks to a specific frame. Delegates to the existing internal seek implementation.

### Playback Control

#### `play(): void`
Starts playback. No-op if already playing.

#### `pause(): void`
Stops playback. No-op if already paused.

#### `toggle(): void`
Toggles play/pause state.

### Clip Queries

#### `getClips(): readonly TimelineClipInfo[]`

Returns all clips on the timeline as read-only snapshots. Returned objects are shallow copies — mutating them does not affect internal state.

#### `getClipById(id: string): TimelineClipInfo | null`

Returns a specific clip by ID.

#### `getClipsAtFrame(frame: number): readonly TimelineClipInfo[]`

Returns all clips visible at the given frame. Uses half-open interval `[start, end)`.

### Track Queries

#### `getTracks(): readonly TimelineTrackInfo[]`

Returns all tracks as read-only snapshots.

#### `getTrack(index: number): TimelineTrackInfo | null`

Returns a specific track by index.

## Data Models

```typescript
interface TimelineClipInfo {
  readonly id: string;
  readonly type: 'video' | 'text' | 'audio' | 'image';
  readonly sourceId: string;
  readonly trackIndex: number;
  readonly offsetInTimeline: number;
  readonly startFrame: number;
  readonly durationInFrames: number;
  readonly transitionIn: string;
}

interface TimelineTrackInfo {
  readonly index: number;
  readonly name: string;
  readonly locked: boolean;
  readonly muted: boolean;
  readonly hidden: boolean;
}
```

## Snapshot Isolation

All `getClips()` and `getTracks()` results are **shallow copies** of the internal state. Plugins cannot mutate application state through returned objects. This is verified by automated tests.

## Relationship to Legacy Timeline API

The existing `context.timeline` (`PluginTimelineAPI`) is preserved unchanged and always available without permission gating. The new `context.timelineApi` provides richer functionality with proper permission gating.

| Method | `context.timeline` | `context.timelineApi` |
|--------|-------------------|----------------------|
| `getCurrentFrame()` | ✅ | ✅ (via `getState().frame`) |
| `seekTo()` | ✅ | ✅ |
| `getTotalFrames()` | ✅ | ✅ (via `getState().durationInFrames`) |
| `isPlaying` | ❌ | ✅ |
| `play()` / `pause()` | ❌ | ✅ |
| `getClips()` | ❌ | ✅ |
| `getTracks()` | ❌ | ✅ |
| Markers | ✅ | ❌ |
| Permission | None | `timeline:read` |
