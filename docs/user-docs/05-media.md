# ReVideeo Media Library — Importing and Managing Media

The media library is where you import and organize your video, audio, and image files.

## Importing Media

### Desktop
- **Drag and drop** files onto the media panel
- **Click** the upload area and select files
- Supports: video (MP4, WebM, MOV), audio (MP3, WAV, AAC), images (PNG, JPG, GIF)

### Mobile
- Tap **Add Files** in the bottom bar
- Select files from your device

## Asset Types

| Type | Icon | Color | Notes |
|------|------|-------|-------|
| Video | 🎬 | Blue | Shows thumbnail strip |
| Audio | 🎵 | Pink | Shows waveform-style icon |
| Image | 🖼️ | Amber | Shows as static thumbnail |

## Using Media

### Adding to Timeline
- **Desktop**: Drag an asset from the library to a track on the timeline
- **Mobile**: Tap an asset, then tap "Insert to V{N}"

### Context Menu
Right-click (or long-press on mobile) an asset for:
- **Insert to Track** — Add to timeline
- **Rename** — Change display name
- **Replace File** — Swap the media file
- **Delete** — Remove from library

## Asset Management

- Assets are grouped by type: VIDEO, AUDIO, ZDJĘCIA (images)
- Each asset shows its name and duration
- Video assets display thumbnail previews
- Assets are stored in IndexedDB (persists across sessions)

## Text Layers

The Text tab provides quick access to add text overlays:
- Click "Tekst standardowy" to add a text clip
- Text clips can be customized in the Properties panel
- Supports: font size, weight, color, alignment, background

## Import Progress

When importing multiple files, a progress bar shows:
- Current file number / total
- File name being imported
- Percentage complete
