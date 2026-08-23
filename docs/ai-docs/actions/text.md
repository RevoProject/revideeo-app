<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Text Actions

## addTextClip

Add a text layer to the timeline.

```json
{
  "_action": "addTextClip",
  "_description": "Add a text layer to the timeline",
  "trackIndex": 0,
  "_trackIndex_note": "Optional. Auto-selects free track if omitted.",
  "offsetInTimeline": 0,
  "_offsetInTimeline_note": "Optional. Defaults to current playhead position.",
  "text": "Hello World",
  "fontSize": 64,
  "fontWeight": 600,
  "textColor": "#ffffff",
  "textAlign": "center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackIndex` | `number` | No | Target track |
| `offsetInTimeline` | `number` | No | Start frame |
| `text` | `string` | No | Text content (default: "Tekst standardowy") |
| `fontSize` | `number` | No | Font size (default: 64) |
| `fontWeight` | `number` | No | Weight: 400, 600, 700 |
| `textColor` | `string` | No | Hex color (default: "#ffffff") |
| `textAlign` | `string` | No | 'left' \| 'center' \| 'right' |

---

## updateText

Update text content and styling of a text clip.

```json
{
  "_action": "updateText",
  "_description": "Update text content and style",
  "clipId": "uuid",
  "text": "New text",
  "fontSize": 72,
  "fontWeight": 700,
  "textColor": "#ff0000",
  "textAlign": "left",
  "fontFamily": "Arial",
  "textBackground": "rgba(0,0,0,0.5)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the text clip |
| `text` | `string` | No | New text content |
| `fontSize` | `number` | No | Font size |
| `fontWeight` | `number` | No | Font weight |
| `textColor` | `string` | No | Text color hex |
| `textAlign` | `string` | No | Alignment |
| `fontFamily` | `string` | No | CSS font-family |
| `textBackground` | `string` | No | Background color |
