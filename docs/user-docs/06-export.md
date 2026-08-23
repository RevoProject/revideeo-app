<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# ReVideeo Export — Rendering Your Video

Export your project as a video file using a render server.

## How Export Works

1. ReVideeo sends your project to a **render server**
2. The server uses **Remotion** to render each frame
3. Progress is streamed back in real-time
4. The rendered video is downloaded to your computer

## Export Options

### File Name
Choose a name for your rendered video.

### Format
| Format | Codec | Best For |
|--------|-------|----------|
| MP4 (H.264) | H.264 | Universal compatibility |
| MKV (VP9) | VP9 | High quality, smaller files |
| WebM (VP9) | VP9 | Web sharing |

### Render Server
If multiple render servers are available, you can choose which one to use.

### Advanced Options
- **Frame range** — Render a specific portion of the timeline
- **Time input** — Set start/end in seconds or HH:MM:SS
- **Content length** — Jump to the actual content end (skips empty timeline space)

## Render Server Setup

### Local Server
The default render server runs on your machine:
```bash
cd server
pnpm install
pnpm dev
```

### Remote Servers
Add custom render servers in App Settings:
1. Open Settings → Render Servers
2. Click "Add Server"
3. Enter the server URL (e.g., `http://192.168.1.10:3000`)
4. Optionally add an alias

### Server Requirements
- Node.js 18+
- Chromium (for headless rendering)
- FFmpeg (for media normalization)

## Export Progress

During rendering, you'll see:
- **Progress bar** with percentage
- **Server status** indicator
- **Abort button** to cancel

## Recent Exports

After rendering, videos appear in the **Recent Exports** list:
- Download again anytime
- See file format and size
- Badge shows pending downloads

## Mobile Export

Export on mobile requires:
1. Enable **Mobile Render** in App Settings → Experimental
2. Have a render server accessible from your device
3. Same export flow as desktop

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Render server offline" | Start the render server (`pnpm dev` in `server/`) |
| Export takes too long | Use a lower resolution or shorter frame range |
| Video has no audio | Check track isn't muted in timeline |
| Black frames | Ensure all media files are accessible |
