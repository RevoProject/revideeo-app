<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# ReVideeo Timeline — Editing Guide

The timeline is where you arrange and edit your clips.

## Timeline Overview

```
┌──────────────────────────────────────────────────┐
│ ▶ ⏸ │ ✂ │ + │ 00:00:15 / 00:01:00 │ Zoom: 1x  │  ← Controls
├──────────────────────────────────────────────────┤
│ 00:00  00:10  00:20  00:30  00:40  00:50  01:00 │  ← Ruler
├──────────────────────────────────────────────────┤
│ 🔒 🔇 👁 Ścieżka 1 │ ═══════════                │
│                      │         ══════════════    │
│ 🔒 🔇 👁 Ścieżka 2 │                            │
│                      │      ══════════           │
│ 🔒 🔇 👁 Ścieżka 3 │                            │
└──────────────────────────────────────────────────┘
```

## Track Controls

| Button | Function |
|--------|----------|
| 🔒 Lock | Prevents changes to clips on this track |
| 🔇 Mute | Silences audio from this track |
| 👁 Hide | Hides this track from preview and export |

## Working with Clips

### Selecting
- **Click** a clip to select it
- **Shift+Click** to add to selection
- **Drag** on empty area for marquee selection

### Moving
- **Drag** a clip to move it along the timeline
- **Drag** vertically to move between tracks
- Clips snap to other clip edges

### Trimming
- **Drag the left edge** to trim the start
- **Drag the right edge** to trim the end
- Trim handles appear when you hover near clip edges

### Splitting
- Position the playhead where you want to split
- Press **S** or click the Split button
- The clip is split into two independent clips

### Duplicating
- Right-click a clip → Duplicate
- The copy is placed after the original

## Transitions

Transitions are applied between consecutive clips on the same track.

### Available Transitions

| Type | Effect |
|------|--------|
| Fade | Clips fade in/out |
| Slide | Incoming clip slides in from right |
| Wipe | Incoming clip wipes in from left |
| Push | Incoming clip pushes the previous one out |
| CrossZoom | Zoom + fade crossover |
| DreamZoom | Zoom + blur dreamy effect |
| Blur | Blur + fade |
| FilmBurn | Warm opacity + subtle zoom |

### Adding Transitions
1. Select a clip that has a previous clip on the same track
2. Open the **Transitions** panel
3. Click a transition type
4. Adjust duration with the slider (5-30 frames)

### Quick Transition
- Press **F** to cycle through transition types at the playhead

## Markers

Markers help you organize your timeline.

- Press **T** to add a marker at the playhead
- Markers appear as colored dots on the ruler
- Click a marker to jump to it

## Zoom

- **Ctrl +** / **Ctrl -** to zoom in/out
- **Ctrl 0** to reset zoom
- Pinch-to-zoom on mobile/touchpad

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| ← / → | Seek ±1 frame |
| Shift + ← / → | Seek ±10 frames |
| Alt + ← / → | Jump to clip junction |
| S | Split at playhead |
| T | Add marker |
| F | Cycle transition |
| Backspace/Delete | Delete selected clip |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
