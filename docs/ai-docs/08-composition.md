# Composition / Rendering — `src/editor/composition/`

Remotion-based rendering pipeline for the video preview and export.

## `VideoComposition.tsx`

The root Remotion composition component rendered inside `<Player>`.

```json
{
  "_type": "VideoCompositionProps",
  "_source": "src/editor/composition/VideoComposition.tsx",
  "clips": [{ "_ref": "RenderClip" }],
  "trackSettings": [{ "_ref": "TrackSettings" }]
}
```

### Rendering Logic

1. Groups clips by `trackIndex`, sorts by `offsetInTimeline`
2. Each track → `<AbsoluteFill>` with `zIndex = trackIndex`
3. Hidden tracks → `opacity: 0`, `pointerEvents: 'none'`
4. Each clip → `<Sequence from={offsetInTimeline} durationInFrames={durationInFrames}>`
5. Computes `outgoing` transition for overlapping clips

## `ClipLayer.tsx`

Renders individual clip content based on type.

```json
{
  "_type": "ClipLayerProps",
  "_source": "src/editor/composition/ClipLayer.tsx",
  "clip": { "_ref": "RenderClip" },
  "outgoing": { "_ref": "OutgoingTransition | undefined" },
  "muted": false,
  "frame": 150,
  "_frame_note": "Local frame (currentFrame - clip.offsetInTimeline)"
}
```

### Rendering by Type

| Type | Element | Notes |
|------|---------|-------|
| `text` | `<div>` | Styled with fontFamily, fontSize, textColor, textAlign |
| `image` | `<Img>` | Remotion's Img component |
| `audio` | `<Audio>` | With volume fading, playbackRate |
| `video` | `<Video>` | With startFrom, playbackRate, volume, 120s timeout |
| (none) | `<div>` | Black placeholder |

## `transitionStyles.ts`

Computes CSS styles for each clip based on transitions and effects.

### `getClipStyle(clip, outgoing, frame): React.CSSProperties`

**Input:**
- `clip`: The clip being rendered
- `outgoing`: Transition info from the next clip (if overlapping)
- `frame`: Local frame within the clip

**Output CSS Properties:**
```json
{
  "_type": "React.CSSProperties",
  "_source": "src/editor/composition/transitionStyles.ts",
  "transform": "translateX(0px) translateY(0px) translateX(0%) rotate(0deg) scale(1)",
  "_transform_note": "Combines posX, posY, transition translateX, rotation, scale",
  "transformOrigin": "center center",
  "opacity": 1,
  "_opacity_note": "Product of: transition opacity * clip.opacity * fadeIn * fadeOut",
  "filter": "blur(0px)",
  "_filter_note": "Only applied when blur > 0 (dreamy-zoom, linear-blur transitions)",
  "clipPath": "inset(0% 0% 0% 0%)",
  "_clipPath_note": "Used by wipe transition and crop properties",
  "borderRadius": "0px",
  "width": "100%",
  "_width_note": "From clip.width percentage",
  "height": "100%",
  "objectFit": "contain"
}
```

### Transition Math

```
progress = clamp(0, localFrame / transitionDuration, 1)

fade:        opacity = progress
slide:       translateX = (1 - progress) * 100
wipe:        clipPath = inset(0 (1-progress)*100% 0 0)
push:        translateX = (1-progress)*100, opacity = min(1, progress*1.5)
cross-zoom:  scale = base * (1.2 - 0.2*progress), opacity = progress
dreamy-zoom: scale = base * (1.35 - 0.35*progress), blur = (1-progress)*18
linear-blur: blur = (1-progress)*12, opacity = 0.35 + 0.65*progress
film-burn:   opacity = 0.45 + 0.55*min(1, progress*3), scale = base*(1.05-0.05*progress)
```

## `PreviewTransformOverlay.tsx`

Interactive overlay on the preview canvas for direct manipulation.

- Shows blue border around active clip
- **Move**: Drag to reposition (posX/posY in composition coordinates)
- **Resize**: Corner handle to resize (width/height in %)
- Displays track name label
