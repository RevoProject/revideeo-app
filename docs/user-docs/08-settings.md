<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# ReVideeo Settings — Configuration Guide

Customize ReVideeo to fit your workflow.

## App Settings

Access via the gear icon in the header.

### Auto-Save
| Interval | Description |
|----------|-------------|
| Off | Manual save only |
| 1-30 min | Auto-save at chosen interval |

### Language
| Language | Code |
|----------|------|
| Polski | pl |
| English | en |
| Deutsch | de |

### Render Servers
Add custom render servers for distributed rendering:
- **Localhost** — Default server (auto-detected)
- **Custom servers** — Add by URL with optional alias

### Connections
Cloud storage integrations (coming soon):
- Google Drive
- OneDrive
- Dropbox

### Plugins
Manage installed plugins:
- View all installed plugins
- Enable/disable plugins
- Remove plugins

### Experimental (Mobile)
- **Mobile Render** — Enable rendering on mobile devices

## Project Settings

Access via Settings → Project Settings (or from the start screen).

### Project Name
Rename your project.

### Resolution
Choose from presets: 360p, 480p, 720p, 1080p, 2K, 4K

### Orientation
- **16:9** — Landscape (YouTube, presentations)
- **9:16** — Portrait (TikTok, Instagram Reels, Stories)

### FPS (Frames Per Second)
| FPS | Use Case |
|-----|----------|
| 24 | Cinema feel |
| 25 | PAL standard |
| 30 | Web standard (default) |
| 60 | Smooth motion |
| 120 | Slow motion (when played back at 30fps) |

**Note:** Changing FPS rescales all clips and markers to maintain timing.

## Track Settings

Access via the track header in the timeline.

| Setting | Description |
|---------|-------------|
| **Name** | Custom track name |
| **Lock** | Prevent edits to this track |
| **Mute** | Silence audio from this track |
| **Hide** | Remove from preview and export |
