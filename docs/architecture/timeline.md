# Timeline Architecture

## Overview

The timeline manages clip positioning, duration, transitions, and track organization. It provides both internal state management and public API access.

## Data Model

### Clip Positioning

Each clip has:
- `offsetInTimeline` — absolute start frame on the timeline
- `startFrame` — intra-clip offset into source media
- `durationInFrames` — duration on the timeline

### Frame Computation

```
localFrame = currentFrame - clip.offsetInTimeline
sourceFrame = clip.startFrame + localFrame
sourceTime = sourceFrame / fps
```

## Ripple Edit

When a clip's duration changes, following clips on the same track are shifted:

1. Compute delta = `newDuration - oldDuration`
2. Find clips on same track where `offsetInTimeline >= oldEnd`
3. Shift those clips by delta
4. Snap transition clips to their predecessors

This logic exists in both `updateClip()` (properties panel) and `applyClipDrag()` (timeline drag).

## Transition System

Transitions overlap adjacent clips on the same track:
- `transitionIn` — transition type ('none', 'push', 'slide', 'fade')
- `transitionDurationInFrames` — overlap duration

During transition, both outgoing and incoming clips are visible with CSS-driven opacity/transform animations.
