<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Domain Types — `src/types.ts`

Core data structures used across the entire application.

## `Orientation`

```json
{ "_type": "Union", "values": ["16:9", "9:16"] }
```

## `TransitionType`

```json
{ "_type": "Union", "values": ["none", "fade", "slide", "wipe", "push", "cross-zoom", "dreamy-zoom", "linear-blur", "film-burn"] }
```

## `AppLanguage`

```json
{ "_type": "Union", "values": ["pl", "en", "de"] }
```

## `ProjectConfig`

Configuration for a project's video output.

```json
{
  "_type": "ProjectConfig",
  "_source": "src/types.ts",
  "_description": "Video output configuration for a project",
  "resolutionLabel": "1080p",
  "_resolutionLabel_note": "One of: '360p', '480p', '720p', '1080p', '2K', '4K'",
  "orientation": "16:9",
  "_orientation_note": "'16:9' for landscape, '9:16' for portrait",
  "fps": 30,
  "_fps_note": "Frames per second, commonly 24, 25, 30, or 60"
}
```

## `StoredClip`

The central data unit representing a clip on the timeline. Every clip has spatial, temporal, and content properties.

```json
{
  "_type": "StoredClip",
  "_source": "src/types.ts",
  "_description": "A single clip on the timeline with all its properties",
  "_required_fields": ["id", "sourceId", "trackIndex", "offsetInTimeline", "startFrame", "durationInFrames", "scale", "posX", "transitionIn", "transitionDurationInFrames"],

  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "_id_note": "UUID v4, unique per clip",

  "type": "video",
  "_type_note": "Optional. 'video' | 'text' | 'audio' | 'image'. Determines rendering mode.",

  "sourceId": "media-uuid",
  "_sourceId_note": "References MediaAssetMeta.sourceId. For text clips this is a generated UUID (no real media).",

  "trackIndex": 0,
  "_trackIndex_note": "0-based track number. Higher = rendered on top.",

  "offsetInTimeline": 150,
  "_offsetInTimeline_note": "Start frame position on the timeline.",

  "startFrame": 0,
  "_startFrame_note": "Frame offset into the source media (trimming from start).",

  "durationInFrames": 300,
  "_durationInFrames_note": "Clip length in frames on the timeline.",

  "scale": 1.0,
  "_scale_note": "Zoom factor. 1.0 = original size.",

  "posX": 0,
  "_posX_note": "Horizontal position in pixels from center. Negative = left.",

  "posY": 0,
  "_posY_note": "Vertical position in pixels from center. Negative = up.",

  "width": 100,
  "_width_note": "Width as percentage of composition width (1-100).",

  "height": 100,
  "_height_note": "Height as percentage of composition height (1-100).",

  "groupId": "uuid",
  "_groupId_note": "Optional. Clips with same groupId move/select together.",

  "rotation": 0,
  "_rotation_note": "Rotation in degrees.",

  "opacity": 1.0,
  "_opacity_note": "Opacity from 0 (invisible) to 1 (fully visible).",

  "fitMode": "contain",
  "_fitMode_note": "'contain' = fit inside bounds, 'cover' = fill bounds (may crop).",

  "borderRadius": 0,
  "_borderRadius_note": "Border radius in pixels.",

  "cropLeft": 0,
  "_cropLeft_note": "Crop from left as percentage (0-49).",
  "cropTop": 0,
  "cropRight": 0,
  "cropBottom": 0,

  "playbackRate": 1.0,
  "_playbackRate_note": "Playback speed multiplier (0.25 to 4.0).",

  "fadeInFrames": 0,
  "_fadeInFrames_note": "Visual fade in duration in frames.",
  "fadeOutFrames": 0,
  "_fadeOutFrames_note": "Visual fade out duration in frames.",

  "volume": 1.0,
  "_volume_note": "Audio volume (0.0 to 2.0).",

  "audioFadeInFrames": 0,
  "_audioFadeInFrames_note": "Audio fade in duration in frames.",
  "audioFadeOutFrames": 0,
  "_audioFadeOutFrames_note": "Audio fade out duration in frames.",

  "text": "Hello World",
  "_text_note": "Text content. Only used when type='text'.",

  "fontSize": 64,
  "_fontSize_note": "Font size in pixels. Text clips only.",

  "fontFamily": "Inter, sans-serif",
  "_fontFamily_note": "CSS font-family. Text clips only.",

  "fontWeight": 600,
  "_fontWeight_note": "Font weight (400=normal, 600=semi-bold, 700=bold). Text clips only.",

  "textColor": "#ffffff",
  "_textColor_note": "Text color as hex. Text clips only.",

  "textAlign": "center",
  "_textAlign_note": "'left' | 'center' | 'right'. Text clips only.",

  "textBackground": "transparent",
  "_textBackground_note": "Background color. Text clips only.",

  "transitionIn": "fade",
  "_transitionIn_note": "Incoming transition type. Must be a TransitionType value.",

  "transitionDurationInFrames": 15,
  "_transitionDurationInFrames_note": "Transition duration in frames (min 5, max 30)."
}
```

## `MediaAssetMeta`

Metadata for a media asset (stored in project, no blob).

```json
{
  "_type": "MediaAssetMeta",
  "_source": "src/types.ts",
  "_description": "Metadata for a media asset stored in the project",
  "sourceId": "uuid",
  "_sourceId_note": "Unique identifier, used as key in IndexedDB",
  "name": "video_file.mp4",
  "_name_note": "Original filename",
  "durationInFrames": 900,
  "_durationInFrames_note": "Duration in frames at project FPS"
}
```

## `TimelineMarker`

```json
{
  "_type": "TimelineMarker",
  "_source": "src/types.ts",
  "_description": "A marker on the timeline ruler",
  "id": "uuid",
  "frame": 150,
  "_frame_note": "Frame position on the timeline"
}
```

## `TrackSettings`

```json
{
  "_type": "TrackSettings",
  "_source": "src/types.ts",
  "_description": "Settings for a single track",
  "name": "Ścieżka 1",
  "_name_note": "Display name, defaults to 'Ścieżka N'",
  "locked": false,
  "_locked_note": "When true, clips on this track cannot be modified",
  "muted": false,
  "_muted_note": "When true, audio from this track is silenced",
  "hidden": false,
  "_hidden_note": "When true, this track is not rendered"
}
```

## `StoredProject`

Complete project metadata (stored in localStorage, no media blobs).

```json
{
  "_type": "StoredProject",
  "_source": "src/types.ts",
  "_description": "Complete project metadata without media blobs",
  "id": "uuid",
  "name": "My Video Project",
  "savedAt": 1700000000000,
  "_savedAt_note": "Unix timestamp in milliseconds",
  "config": { "_ref": "ProjectConfig" },
  "clips": [{ "_ref": "StoredClip" }],
  "assets": [{ "_ref": "MediaAssetMeta" }],
  "trackCount": 3,
  "_trackCount_note": "Number of tracks (max 5)",
  "markers": [{ "_ref": "TimelineMarker" }],
  "trackSettings": [{ "_ref": "TrackSettings" }]
}
```

## `RenderServer`

```json
{
  "_type": "RenderServer",
  "_source": "src/types.ts",
  "_description": "Configuration for an external render server",
  "id": "uuid",
  "url": "http://192.168.1.10:33623",
  "alias": "Workstation"
}
```

## `AppSettings`

```json
{
  "_type": "AppSettings",
  "_source": "src/types.ts",
  "_description": "Application-wide settings stored in localStorage",
  "autoSaveIntervalMinutes": 5,
  "_autoSaveIntervalMinutes_note": "0 = disabled, options: 0,1,2,3,5,10,15,30",
  "language": "pl",
  "_language_note": "'pl' | 'en' | 'de'",
  "renderServers": [{ "_ref": "RenderServer" }],
  "mobileRenderEnabled": false,
  "_mobileRenderEnabled_note": "Experimental: allow rendering on mobile"
}
```

## Resolution Presets

Defined in `App.tsx`, used for composition dimensions:

```json
{
  "_type": "ResolutionPreset[]",
  "_source": "src/App.tsx",
  "_description": "Available resolution presets with landscape/portrait variants",
  "presets": [
    { "label": "360p",  "landscape": { "width": 640,  "height": 360  }, "portrait": { "width": 360,  "height": 640  } },
    { "label": "480p",  "landscape": { "width": 854,  "height": 480  }, "portrait": { "width": 480,  "height": 854  } },
    { "label": "720p",  "landscape": { "width": 1280, "height": 720  }, "portrait": { "width": 720,  "height": 1280 } },
    { "label": "1080p", "landscape": { "width": 1920, "height": 1080 }, "portrait": { "width": 1080, "height": 1920 } },
    { "label": "2K",    "landscape": { "width": 2560, "height": 1440 }, "portrait": { "width": 1440, "height": 2560 } },
    { "label": "4K",    "landscape": { "width": 3840, "height": 2160 }, "portrait": { "width": 2160, "height": 3840 } }
  ]
}
```
