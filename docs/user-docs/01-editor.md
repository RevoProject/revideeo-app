# ReVideeo Editor — Overview

ReVideeo is a modern, browser-based video editor built for speed and simplicity. No downloads, no installs — just open your browser and start editing.

## What You Can Do

- **Juicer AI** — AI-powered editing assistant that processes natural language commands (prompts, voice, file attachments)
- **Multi-track timeline** — Edit with up to 5 tracks, just like professional editors
- **Real-time preview** — See your edits instantly with the built-in player
- **Transitions** — 9 built-in transitions: Fade, Slide, Wipe, Push, CrossZoom, DreamZoom, Blur, FilmBurn
- **Text overlays** — Add customizable text with fonts, colors, and alignment
- **Audio mixing** — Control volume, fade in/out, and playback speed per clip
- **Effects** — Crop, scale, rotate, opacity, and visual fades
- **Export** — Render to MP4 (H.264), MKV (VP9), or WebM (VP9)
- **Plugin system** — Extend with custom effects, transitions, and tools
- **Mobile support** — Edit on your phone with a touch-optimized interface
- **Auto-save** — Never lose your work
- **Project import/export** — Save and share projects as `.reevproj` files

## Interface Layout

```
┌──────────────────────────────────────────────────────────┐
│ Header: Logo | Project | Import | Juicer | Undo/Redo | Export │
├──────────┬──────────────────────────┬────────────────┤
│          │                          │                │
│  Media   │      Video Preview       │   Properties   │
│  Library │                          │   / Transitions│
│          │                          │   / Plugins    │
│          │                          │                │
├──────────┴──────────────────────────┴────────────────┤
│                  Multi-Track Timeline                 │
│  Track 1: ════════════════════                        │
│  Track 2:      ════════════════════════               │
│  Track 3:           ════════════════                  │
└──────────────────────────────────────────────────────┘
```

## Getting Started

1. **Create a project** — Choose a name, resolution (360p to 4K), orientation (16:9 or 9:16), and FPS
2. **Import media** — Drag files into the media panel or click "Add Files"
3. **Build your timeline** — Drag clips from the library to the timeline tracks
4. **Edit clips** — Select a clip to adjust properties: position, scale, opacity, crop, audio
5. **Add transitions** — Select a clip and choose a transition type
6. **Preview** — Press Space to play/pause, use the timeline to scrub
7. **Export** — Click "Export Film" to render your video

## Resolution Presets

| Preset | Landscape | Portrait |
|--------|-----------|----------|
| 360p | 640×360 | 360×640 |
| 480p | 854×480 | 480×854 |
| 720p | 1280×720 | 720×1280 |
| 1080p | 1920×1080 | 1080×1920 |
| 2K | 2560×1440 | 1440×2560 |
| 4K | 3840×2160 | 2160×3840 |

## Supported Formats

| Format | Codec | Extension |
|--------|-------|-----------|
| MP4 | H.264 | `.mp4` |
| MKV | VP9 | `.mkv` |
| WebM | VP9 | `.webm` |

## Juicer AI

Juicer is an AI-powered editing assistant integrated directly into the editor. It interprets natural language commands and applies edits to your timeline.

### Opening Juicer

- **Desktop:** Click the **Juicer** button in the header, next to Import
- **Mobile:** Open the hamburger menu and select **Juicer**

### Input Methods

- **Text prompt** — Type a command describing what you want (e.g. "add a fade transition to all clips")
- **Voice recording** — Click the microphone icon to record a voice command
- **File attachments** — Attach reference files (images, text) to provide context for your prompt

### Picker Fields

When a prompt is ambiguous, Juicer will present picker fields so you can clarify your intent (e.g. selecting which clips to affect or which transition to use).

### Quick Actions

Quick action buttons appear below the input for common operations, letting you trigger frequent edits without typing.

### Prompt History

Your recent prompts are saved and accessible from the Juicer panel. Re-run or edit a previous prompt to iterate on your edits.

### Processing Phases

Juicer moves through 5 phases as it processes your command:

| Phase | Description |
|-------|-------------|
| **Idle** | Waiting for input |
| **Analyzing** | Understanding your prompt |
| **Plan** | Presenting the planned edits for review |
| **Executing** | Applying changes to the timeline |
| **Done** | Edits applied, ready for next command |

### Undo & Change Removal

- **Single undo** — After Juicer applies edits, you can undo the entire operation with one click
- **Change removal** — Remove individual changes from a Juicer operation before finalizing

### Capabilities

Juicer can manipulate clips, transitions, effects, and timeline structure. The maximum number of tracks may increase in future versions as capabilities expand.

## Custom Dialogs

ReVideeo uses custom confirm and alert dialogs instead of browser-native popups. This ensures a consistent look and feel across all browsers and prevents the UI from blocking while a dialog is open.
