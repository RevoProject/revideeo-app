<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# AI Actions — Index

All operations available to the Juicer AI system.

## Schema

Every action request MUST use this envelope format:

```json
{
  "_schema": "revideo-ai-action/v1",
  "actions": [
    { "type": "actionName", ... }
  ]
}
```

## Capabilities

Before executing actions, the Juicer MUST read the system capabilities. This tells the AI what limits are in effect.

**Request capabilities:**
```json
{
  "_schema": "revideo-ai-action/v1",
  "actions": [
    { "type": "getCapabilities" }
  ]
}
```

**Response:**
```json
{
  "_schema": "revideo-ai-action-result/v1",
  "success": true,
  "action": "getCapabilities",
  "data": {
    "timeline": {
      "maxTracks": 5,
      "maxTransitionDuration": 30,
      "minTransitionDuration": 5
    },
    "export": {
      "supportedFormats": ["mp4", "mkv", "webm"]
    },
    "ui": {
      "maxRecentExports": 30
    }
  }
}
```

**Key principle:** Limits are capabilities, not architecture. When `maxTracks` increases from 5 to 15, the same Juicer logic works without changes — it reads the new capability and adapts.

Example Juicer behavior:
- User: "Add 3 more effect layers"
- Juicer checks: `maxTracks = 5`, current tracks = 5
- Juicer responds: "Project has 5/5 tracks. I can merge some elements or reuse an existing track."
- Later, `maxTracks` is increased to 15
- Same request → Juicer responds: "Added 3 new tracks. Now using 8/15."

## DEMO_PROMPT Mode

The Juicer supports a `DEMO_PROMPT` mode for testing and simulation without making actual API calls. In this mode:

- The Juicer simulates responses based on predefined templates
- No external API calls are made
- Useful for development, testing, and demonstrations
- Enabled via environment variable or settings toggle

## Juicer Phases

The Juicer operates through 5 phases during a request lifecycle:

| Phase | Description |
|-------|-------------|
| `idle` | Awaiting user input |
| `analyzing` | Processing the user's request, checking capabilities |
| `plan` | Presenting proposed changes for review in "Zobacz zmiany" |
| `executing` | Applying approved changes to the timeline |
| `done` | Changes complete, showing results |

**Individual change removal:** During the `plan` phase, users can remove individual changes via the "Zobacz zmiany" dialog. Each change requires confirmation before removal.

## Juicer Prompt History

Prompt history is persisted in localStorage with two tabs:

| Tab | Scope | Description |
|-----|-------|-------------|
| `Wszystkie` | Global | All prompts across all projects |
| `Projekt` | Project-scoped | Prompts for the current project only |

History entries include the prompt text, AI response, applied changes, and timestamp.

## Actions by Category

| Category | Action | Description | Detail |
|----------|--------|-------------|--------|
| **System** | `getCapabilities` | Read system capabilities (limits, formats) | [→](#capabilities) |
| **Juicer** | `getJuicerSnapshot` | Get the current Juicer snapshot (pre-execution state) | [→](#juicer-actions) |
| | `getJuicerHistory` | Get prompt history (Wszystkie or Projekt tab) | [→](#juicer-actions) |
| | `removeJuicerChange` | Remove an individual Juicer change with confirmation | [→](#juicer-actions) |
| | `cancelJuicerExecution` | Cancel current Juicer execution, restore snapshot | [→](#juicer-actions) |
| **Project** | `renameProject` | Rename the current project | [→](./actions/project.md#renameProject) |
| | `updateProjectConfig` | Change resolution, orientation, FPS | [→](./actions/project.md#updateProjectConfig) |
| **Timeline** | `addClip` | Add a new clip to the timeline | [→](./actions/timeline.md#addClip) |
| | `removeClip` | Remove a clip from the timeline | [→](./actions/timeline.md#removeClip) |
| | `moveClip` | Move a clip to a new position/track | [→](./actions/timeline.md#moveClip) |
| | `trimClip` | Trim clip start or end | [→](./actions/timeline.md#trimClip) |
| | `splitClip` | Split a clip at a frame | [→](./actions/timeline.md#splitClip) |
| | `duplicateClip` | Clone a clip | [→](./actions/timeline.md#duplicateClip) |
| | `updateClip` | Update clip properties | [→](./actions/timeline.md#updateClip) |
| | `addMarker` | Add a timeline marker | [→](./actions/timeline.md#addMarker) |
| | `removeMarker` | Remove a timeline marker | [→](./actions/timeline.md#removeMarker) |
| **Track** | `addTrack` | Add a new track | [→](./actions/track.md#addTrack) |
| | `removeTrack` | Remove a track | [→](./actions/track.md#removeTrack) |
| | `renameTrack` | Rename a track | [→](./actions/track.md#renameTrack) |
| | `toggleTrackLock` | Lock/unlock a track | [→](./actions/track.md#toggleTrackLock) |
| | `toggleTrackMute` | Mute/unmute a track | [→](./actions/track.md#toggleTrackMute) |
| | `toggleTrackHide` | Show/hide a track | [→](./actions/track.md#toggleTrackHide) |
| **Media** | `addAsset` | Import a media file | [→](./actions/media.md#addAsset) |
| | `removeAsset` | Remove an asset from library | [→](./actions/media.md#removeAsset) |
| **Transitions** | `addTransition` | Set a transition on a clip | [→](./actions/transitions.md#addTransition) |
| | `removeTransition` | Remove a transition from a clip | [→](./actions/transitions.md#removeTransition) |
| | `setTransitionDuration` | Change transition duration | [→](./actions/transitions.md#setTransitionDuration) |
| **Text** | `addTextClip` | Add a text layer | [→](./actions/text.md#addTextClip) |
| | `updateText` | Update text content and style | [→](./actions/text.md#updateText) |
| **Selection** | `selectClip` | Select a clip | [→](./actions/selection.md#selectClip) |
| | `selectTrack` | Select a track | [→](./actions/selection.md#selectTrack) |
| | `clearSelection` | Deselect all | [→](./actions/selection.md#clearSelection) |
| **Playback** | `seekTo` | Move playhead to frame | [→](./actions/playback.md#seekTo) |
| | `play` | Start playback | [→](./actions/playback.md#play) |
| | `pause` | Pause playback | [→](./actions/playback.md#pause) |
| **History** | `undo` | Undo last action | [→](./actions/history.md#undo) |
| | `redo` | Redo last undone action | [→](./actions/history.md#redo) |
| **Group** | `groupClips` | Group selected clips | [→](./actions/group.md#groupClips) |
| | `ungroupClips` | Ungroup selected clips | [→](./actions/group.md#ungroupClips) |
| | `joinClips` | Join adjacent split clips | [→](./actions/group.md#joinClips) |
| **Export** | `exportProject` | Export project as .reevproj | [→](./actions/export.md#exportProject) |
| **Plugin** | `registerEffect` | Register a custom effect | [→](./actions/plugin.md#registerEffect) |
| | `registerTransition` | Register a custom transition | [→](./actions/plugin.md#registerTransition) |
| | `registerPromptTemplate` | Register a Juicer prompt template | [→](./actions/plugin.md#registerPromptTemplate) |

## Juicer Actions

### getJuicerSnapshot

Returns the current Juicer snapshot (the editor state captured before Juicer execution began).

```json
{
  "_schema": "revideo-ai-action/v1",
  "actions": [
    { "type": "getJuicerSnapshot" }
  ]
}
```

**Response:**
```json
{
  "_schema": "revideo-ai-action-result/v1",
  "success": true,
  "action": "getJuicerSnapshot",
  "data": { "_ref": "JuicerSnapshot" }
}
```

### getJuicerHistory

Returns prompt history entries, optionally filtered by tab.

```json
{
  "_schema": "revideo-ai-action/v1",
  "actions": [
    { "type": "getJuicerHistory", "tab": "Projekt" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tab` | `string` | No | `'Wszystkie'` or `'Projekt'` (default: current tab) |

### removeJuicerChange

Removes an individual Juicer change by ID. Requires user confirmation.

```json
{
  "_schema": "revideo-ai-action/v1",
  "actions": [
    { "type": "removeJuicerChange", "changeId": "uuid" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `changeId` | `string` | Yes | ID of the JuicerChange to remove |

### cancelJuicerExecution

Cancels the current Juicer execution and restores the pre-Juicer snapshot.

```json
{
  "_schema": "revideo-ai-action/v1",
  "actions": [
    { "type": "cancelJuicerExecution" }
  ]
}
```

## Response Format

All actions return a result in this format:

```json
{
  "_schema": "revideo-ai-action-result/v1",
  "success": true,
  "action": "moveClip",
  "data": { "clipId": "uuid", "offsetInTimeline": 300 }
}
```

On error:

```json
{
  "_schema": "revideo-ai-action-result/v1",
  "success": false,
  "action": "moveClip",
  "error": "Clip not found"
}
```
