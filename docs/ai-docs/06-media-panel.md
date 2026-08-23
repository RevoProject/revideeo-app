<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Media Panel — `src/editor/media/MediaPanel.tsx`

Left sidebar for importing, browsing, and managing media assets.

## Features

- **Desktop**: Two tabs — Media (assets) and Text (add text layers)
- **Mobile**: Single view with select-then-insert pattern
- Groups assets by type: VIDEO, AUDIO, ZDJĘCIA (images)
- Drag-and-drop to timeline via `dataTransfer.setData('application/x-revideeo', sourceId)`
- Import progress bar with percentage
- Thumbnail display for video assets

## Props

```json
{
  "_type": "MediaPanelProps",
  "_source": "src/editor/media/MediaPanel.tsx",
  "assets": [{ "_ref": "MediaAsset" }],
  "selectedTrack": 0,
  "trackCount": 3,
  "mobile": false,
  "width": 320,
  "_width_note": "Resizable panel width in pixels (desktop only)",
  "loading": {
    "total": 5,
    "done": 2,
    "name": "video.mp4"
  },
  "_loading_note": "null when not importing",
  "onFilesSelected": "(event: React.ChangeEvent<HTMLInputElement>) => void",
  "onFilesDropped": "(files: File[]) => void",
  "onPlaceAsset": "(sourceId: string) => void",
  "_onPlaceAsset_note": "Inserts asset at currentFrame on selectedTrack",
  "onAddText": "() => void",
  "_onAddText_note": "Creates a new text clip",
  "onContextMenuAsset": "(event: React.MouseEvent, sourceId: string) => void"
}
```

## Data Flow

```
User drops file → onFilesDropped → App.importFiles → addAsset → putMedia (IndexedDB)
                                                          ↓
                                                    assets state updated
                                                          ↓
MediaPanel renders asset list ←── assets prop

User drags asset to timeline → onMediaDrop → App.createClipFromAsset
                                              ↓
                                        clips state updated
```
