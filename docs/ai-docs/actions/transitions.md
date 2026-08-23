<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Transition Actions

## addTransition

Set a transition on a clip.

```json
{
  "_action": "addTransition",
  "_description": "Set a transition on a clip",
  "clipId": "uuid",
  "type": "fade",
  "_type_note": "'none' | 'fade' | 'slide' | 'wipe' | 'push' | 'cross-zoom' | 'dreamy-zoom' | 'linear-blur' | 'film-burn'",
  "durationInFrames": 15,
  "_durationInFrames_note": "Optional. Default 15. Range 5-30."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the clip |
| `type` | `string` | Yes | Transition type |
| `durationInFrames` | `number` | No | Duration in frames (5-30) |

---

## removeTransition

Remove a transition from a clip.

```json
{
  "_action": "removeTransition",
  "_description": "Remove transition from a clip (set to 'none')",
  "clipId": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the clip |

---

## setTransitionDuration

Change the duration of an existing transition.

```json
{
  "_action": "setTransitionDuration",
  "_description": "Change transition duration",
  "clipId": "uuid",
  "durationInFrames": 20
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clipId` | `string` | Yes | ID of the clip |
| `durationInFrames` | `number` | Yes | New duration (5-30) |
