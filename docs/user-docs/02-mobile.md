<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# ReVideeo Mobile — Editing on Your Phone

ReVideeo includes a full mobile editing experience optimized for touch screens.

## Mobile Interface

The mobile layout uses a stacked design with bottom sheets for different panels:

```
┌─────────────────────┐
│   Video Preview     │
│                     │
├─────────────────────┤
│   Playback Controls │
├─────────────────────┤
│   Mini Timeline     │
├─────────────────────┤
│ 🎬 │ ⚙️ │ 🔀 │ 🎵 │  ← Bottom bar
└─────────────────────┘
```

## Bottom Bar Actions

| Icon | Action | Opens |
|------|--------|-------|
| 🎬 Media | Browse and import media | Media sheet |
| ⚙️ Properties | Edit clip properties | Tools sheet |
| 🔀 Transitions | Set transitions | Tools sheet |
| 🎵 Audio | Audio mixer | Tools sheet |
| 📝 Text | Add text layers | Text sheet |
| 🎞️ Tracks | Manage tracks | Tracks sheet |

## Touch Gestures

| Gesture | Action |
|---------|--------|
| **Tap** | Select clip |
| **Double-tap** | Open properties |
| **Long press** | Context menu |
| **Drag clip** | Move clip on timeline |
| **Pinch** | Zoom timeline |
| **Swipe left/right** | Scrub timeline |

## Mobile-Specific Features

- **Track picker** — Choose which track to place media on
- **Select-then-insert** — Tap a media asset, then tap "Insert to V{N}"
- **Bottom sheets** — All editing panels slide up from the bottom
- **Responsive layout** — Adapts to any screen size

## Limitations on Mobile

- Export requires a render server (can be enabled in experimental settings)
- Maximum 5 tracks (same as desktop)
- Plugin tools work but may be limited by screen size
