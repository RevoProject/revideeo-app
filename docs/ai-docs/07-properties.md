# Properties Panel — `src/editor/tools/`

Right sidebar for editing clip properties, transitions, and plugin tools.

## Tool Views

```json
{
  "_type": "ToolView",
  "_source": "src/editor/tools/ToolsMenu.tsx",
  "_description": "Tabs in the right panel",
  "values": ["properties", "transitions", "audio", "animations", "plugins"]
}
```

## Sections in Properties View

| Section | Controls | Applies To |
|---------|----------|------------|
| **Timing** | Duration, From, To (HH:MM:SS) | All clips |
| **Text** | Text content, fontSize, fontWeight, textAlign, textColor, fadeIn/Out | Text clips |
| **Layout** | Alignment grid, posX/Y, width/height %, scale, rotation | Non-audio |
| **Fill** | Fill/contain presets, opacity %, borderRadius | Non-audio |
| **Crop** | cropLeft/Top/Right/Bottom % | Video/Image |
| **Video** | playbackRate, fadeIn/Out (visual) | Video/Image |
| **Audio** | Volume %, playbackRate, audioFadeIn/Out | Audio/Video |
| **Delete** | Delete clip button | All clips |

## Transition Settings — `TransitionSettings.tsx`

### Available Transitions

| Type | Label | CSS Effect |
|------|-------|------------|
| `none` | Brak | No transition |
| `fade` | Fade | opacity: progress |
| `slide` | Slide | translateX: (1-progress)*100% |
| `wipe` | Wipe | clipPath inset from right |
| `push` | Push | translateX + opacity |
| `cross-zoom` | CrossZoom | scale 1.2→1.0 + opacity |
| `dreamy-zoom` | DreamZoom | scale 1.35→1.0 + blur 18→0 |
| `linear-blur` | Blur | blur 12→0 + opacity |
| `film-burn` | FilmBurn | opacity + subtle scale |

### Duration

- Range: 5 to 30 frames
- Default: 15 frames
- Applied as overlap between consecutive clips on the same track

## Tools Menu — `ToolsMenu.tsx`

Displays 5 buttons when no panel is open:

1. **Właściwości** (Properties) — `onOpenProperties`
2. **Przejścia** (Transitions) — `onOpenTransitions`
3. **Audio mixer** — `onOpenAudio`
4. **Animacje** (Animations) — `onOpenAnimations`
5. **Pluginy** (Plugins) — `onOpenPlugins`

## Plugin Integration

When `view === 'plugins'`, the PropertiesPanel renders plugin-registered tools:

```json
{
  "_type": "PluginToolRenderProps",
  "_source": "src/api/types.ts",
  "activeClip": { "_ref": "StoredClip | null" },
  "clipIndex": 0,
  "totalFrames": 900,
  "fps": 30,
  "asset": { "name": "video.mp4" },
  "onUpdateClip": "(id: string, patch: Partial<StoredClip>) => void",
  "onClose": "() => void"
}
```
