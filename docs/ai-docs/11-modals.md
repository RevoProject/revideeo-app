<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Modals — `src/components/modals/`

All modal dialogs in the application.

## Modal State

Controlled by `modal` state in App.tsx:

```json
{
  "_type": "ModalState",
  "_source": "src/App.tsx",
  "_description": "Active modal identifier. null = no modal open.",
  "values": ["start", "new", "settings", "app-settings", "library", "shortcuts", "export-film", "export-project", "replace-asset"]
}
```

## Modal Components

### `StartModal`
- Local/remote project tabs
- Lists recent 4 projects with resolution/orientation/date
- Remote projects from render server
- Actions: Open, New Project, Import, App Settings

### `NewProjectModal`
- Name input
- ResolutionPicker (orientation, resolution, FPS)
- Calls `onConfirm(name, config: ProjectConfig)`

### `SettingsModal`
- Edit project name
- ResolutionPicker for config changes
- FPS changes trigger rescaling of all clips/markers/assets

### `AppSettingsModal`
- Auto-save interval
- Language (PL/EN/DE)
- Render server management
- Mobile experimental options
- Plugin management (list, toggle, remove)
- Cloud connections (placeholder)

### `ExportFilmModal`
- File name input
- Format selection: MP4, MKV, WebM
- Multi-server selection
- Advanced: start/end frame, time input
- Real-time progress bar

### `ExportProjectModal`
- Export with/without assets
- Export to render server
- Copy remote to local

### `ReplaceAssetModal`
- File picker for replacing a video asset

### `ExportReadyModal`
- Download button for recently rendered video
- Dismiss option

### `ShortcutsModal`
- Static list of keyboard shortcuts

### `LibraryModal`
- Full project library with open/delete
- Import from disk

## JSON Output — Modal Interaction Patterns

```json
{
  "_type": "ModalInteraction",
  "_description": "Standard pattern for modal dialogs",
  "open": {
    "trigger": "User clicks button or action requires confirmation",
    "state_change": "setModal('modal-id') or setModal({ kind: 'modal-id', data: {...} })"
  },
  "close": {
    "trigger": "User clicks X, Cancel, or Confirm",
    "state_change": "setModal(null)"
  },
  "confirm": {
    "trigger": "User clicks Confirm/Save",
    "action": "Callback with form data, then setModal(null)"
  }
}
```
