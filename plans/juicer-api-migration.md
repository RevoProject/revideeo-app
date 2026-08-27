# Juicer — API Migration Plan

> Status: PROPOSAL — Awaiting approval before implementation.

---

## 1. Current Architecture

### 1.1 Juicer Modal is Fully Props-Driven

The JuicerModal component (`src/components/modals/JuicerModal.tsx`) receives ALL project data as props from App.tsx — it has **zero direct PluginContext access**. This is architecturally clean but creates tight coupling through prop threading:

```
App.tsx (direct state access)
  │
  ├─ clips state ──────────→ prop: clips (StoredClip[])
  ├─ project.trackCount ───→ prop: trackCount
  ├─ project.trackSettings → prop: trackSettings
  ├─ assets state ─────────→ prop: assetNames (string[])
  │                          prop: assetCount (number)
  ├─ project.config ───────→ prop: projectConfig { resolutionLabel, orientation, fps }
  ├─ FPS local const ──────→ used to compute projectConfig.fps
  └─ pluginSnapshot ───────→ prop: pluginPickerFields
```

### 1.2 App.tsx Constructs All Props

| Prop | Source | Line |
|------|--------|------|
| `clips` | Real `clips[]` OR synthetic `StoredClip[]` mapped from `assets[]` when timeline empty | App.tsx:2478-2483 |
| `trackCount` | `project?.trackCount ?? DEFAULT_TRACKS` | App.tsx:2484 |
| `trackSettings` | `project?.trackSettings` | App.tsx:2485 |
| `assetNames` | `assets.map(a => a.name)` | App.tsx:2491 |
| `assetCount` | `assets.length` | App.tsx:2492 |
| `projectConfig` | `{ resolutionLabel, orientation, fps }` from `project.config` | App.tsx:2493 |
| `pluginPickerFields` | `pluginSnapshot.juicerPromptTemplates.map(...)` | App.tsx:2489 |

### 1.3 Step Executor and Validator are Pure Functions

Both `stepExecutor.ts` and `validator.ts` receive flat data bags — no PluginContext access:

```typescript
// stepExecutor.ts:ExecutionContext
{ clips, trackCount, trackSettings, fps, attachmentNames, attachmentKinds, attachmentDurations }

// validator.ts validation context
{ clips, trackCount, trackSettings }
```

### 1.4 AI Communication Path

```
JuicerModal
  → aiProviderRegistry.getEnabledProviders()    [global singleton]
  → provider.generatePlan(AIPlanRequest)
    → (ServerAIProvider) POST {serverUrl}/api/juicer/plan (SSE)
    → (GeminiAIProvider) POST googleapis.com (direct)
    → (LocalAIProvider) demo response
    → (CustomAIProvider) POST {baseUrl}/plan
  → Response: { status, operations[] }
  → validateOperations(operations, context)
  → executeOperations(operations, executionContext)
  → onApplySnapshot(snapshot) → App.tsx
```

---

## 2. Dependency Audit

### 2.1 Hardcoded FPS Values

| Location | Hardcoded | Should Use |
|----------|-----------|-----------|
| `JuicerModal.tsx:69,330,339,416,457` | `projectConfig?.fps ?? 30` | `context.frame?.getContext().fps ?? context.project.getConfig().fps` |
| `ai/provider.ts:324,332,346,347` | `dur / 30` in `describeOperationDetail()` | `dur / fps` (pass fps as parameter) |
| `stepExecutor.ts:79` | `ctx.fps * 3` (3-second default) | Already uses `ctx.fps` — correct |
| `stepExecutor.ts:236` | `ctx.fps * 30` (30-second audio default) | Already uses `ctx.fps` — correct |
| `server/modules/juicer.mjs:128` | `context.fps ?? 30` | Server-side fallback — acceptable |

### 2.2 Hardcoded Duration/Media Assumptions

| Location | Hardcoded | Should Use |
|----------|-----------|-----------|
| `JuicerModal.tsx:69` | Image/text file = `fps * 5` (5 seconds) | Could use `context.media?.get(id)?.durationInFrames` for real durations |
| `JuicerModal.tsx:457` | Fallback = `fps * 3` (3 seconds) | Acceptable as fallback for unknown attachments |
| `stepExecutor.ts:236` | Audio default = `ctx.fps * 30` (30 seconds) | Could use media duration from `context.media` |
| `stepExecutor.ts:362` | `add_audio` duration = 900 frames | Could use media duration |
| `juicer_prompt_gemini.mjs:38-41` | Image=90f/150f, audio=900f, text=60-90f | Prompt-level defaults — acceptable |

### 2.3 Static/Demo Data

| Location | Type | Impact |
|----------|------|--------|
| `JuicerModal.tsx:106-112` | `defaultChanges` — 5 hardcoded demo plan steps | Only shown during demo mode |
| `JuicerModal.tsx:114-118` | `analyzeResults` — 3 mock analysis items | Only shown during demo mode |
| `JuicerModal.tsx:120-126` | `capabilitiesList` — 5 static capabilities | Static UI — acceptable |
| `JuicerModal.tsx:278` | `'DEMO_PROMPT'` input trigger | Demo bypass — could be removed |
| `ai/provider.ts:41-77` | `DEMO_ANALYSIS`, `DEMO_PLAN` | LocalAIProvider fallback — functional |
| `ai/provider.ts:64-69` | Demo plan: silence threshold 0.01, maxFragments 6 | Only for demo |

### 2.4 Fake Clip Synthesis

**App.tsx:2478-2483** maps `assets[]` into synthetic `StoredClip[]` when no clips exist:

```typescript
clips.length > 0 ? clips : assets.map((a, i) => ({
  id: a.sourceId, sourceId: a.sourceId, type: 'video',
  trackIndex: 0, offsetInTimeline: assets.slice(0, i).reduce(...),
  startFrame: 0, durationInFrames: a.durationInFrames,
  ...
}))
```

**Problem:** This creates fake clips with calculated offsets that may not reflect real timeline positions. These fake clips are sent to the AI as "project state."

### 2.5 Polish Hardcoded Strings

| Location | String | Should Be |
|----------|--------|-----------|
| `stepExecutor.ts:52,259,405` | `'Ścieżka N'` | `t('timeline.track', { index })` |
| `JuicerModal.tsx:192,242,265` | Polish alert messages | `t('...')` |
| `stepExecutor.ts` throughout | Operation descriptions in Polish | `t('...')` |

### 2.6 Media Access

| Current | Should Use |
|---------|-----------|
| `assetNames` prop (string[]) | `context.media?.list()` |
| `assetCount` prop (number) | `context.media?.list().length` |
| Fake clips from assets | `context.clips.getAll()` or `context.timelineApi?.getClips()` |
| `asset.metadata.durationInFrames` (for attachments) | `context.media?.get(id)?.durationInFrames` |
| `detectTrueVideoDuration()` for attached files | Remains local — attached files aren't in MediaAPI |

### 2.7 Frame/Time/FPS

| Current | Should Use |
|---------|-----------|
| `projectConfig.fps` prop | `context.frame?.getContext().fps` |
| `c.durationInFrames / (projectConfig.fps ?? 30)` | `context.frame?.getContext().fps` for conversion |
| No access to total duration | `context.timelineApi?.getState().durationInFrames` |
| No access to content duration | `context.timelineApi?.getState().contentDurationInFrames` |
| No access to isPlaying | `context.timelineApi?.getState().isPlaying` |

### 2.8 AI Provider Integration

| Current | Dependency |
|---------|-----------|
| `aiProviderRegistry.getEnabledProviders()` | Global singleton — NOT accessible via PluginContext |
| `aiProviderRegistry.registerServerProvider()` | App.tsx registers servers |
| Server endpoints `/api/juicer/plan`, `/api/juicer/analyze` | Server-side — not plugin API |

**Assessment:** The AI provider registry is app-internal infrastructure. Juicer currently imports it directly (`import { aiProviderRegistry } from '../../ai'`). This is acceptable for a built-in plugin but creates a tight coupling.

---

## 3. API Mapping

### 3.1 What Can Use Public APIs

| Need | Current Source | Public API Replacement |
|------|---------------|----------------------|
| FPS | `projectConfig.fps` prop | `context.frame?.getContext().fps` |
| Duration (total) | Computed from clips | `context.timelineApi?.getState().durationInFrames` |
| Duration (content) | Computed from clips | `context.timelineApi?.getState().contentDurationInFrames` |
| Composition dimensions | `projectConfig.resolutionLabel` | `context.frame?.getContext().width/height` |
| Media list | `assetNames` prop | `context.media?.list()` |
| Media metadata | Direct asset access | `context.media?.get(id)` |
| Clip list (read-only) | `clips` prop | `context.timelineApi?.getClips()` |
| Track info | `trackSettings` prop | `context.timelineApi?.getTracks()` |
| Is playing | Not available | `context.timelineApi?.getState().isPlaying` |
| Clip mutations | `onApplySnapshot` callback | `context.clips.add/update/remove` (already used via snapshot) |

### 3.2 What Must Stay Internal

| Need | Why |
|------|-----|
| `aiProviderRegistry` | No public PluginContext API for AI providers |
| `onApplySnapshot`/`onUndoSnapshot` | Juicer mutates clips, tracks, assets — uses snapshot pattern via App.tsx |
| Attached file handling | User-attached files are not in MediaAPI |
| `beginEdit()` undo integration | App.tsx handles undo before applying snapshot |
| `showAlert`/`showConfirm` | App-level UI utilities |

### 3.3 Capability Gaps

| Gap | Impact | Resolution |
|-----|--------|-----------|
| No AI provider API in PluginContext | Juicer imports `aiProviderRegistry` directly | Acceptable — Juicer is built-in, not a third-party plugin |
| `context.media` returns `MediaInfo` without blob | Juicer needs blobs for attachment metadata | Acceptable — Juicer handles its own file attachments |
| `context.clips.add()` is per-clip, not batch | Juicer applies all clips via snapshot | Keep snapshot pattern — no change needed |
| `context.timelineApi` has no marker API | Juicer has `set_markers` operation | Keep existing `context.timeline.addMarker()` for markers |

---

## 4. Proposed Changes

### 4.1 JuicerModal.tsx — Replace Props with API Access

**Remove these props** (now accessed via APIs):
- `assetNames` → `context.media?.list().map(m => m.name)`
- `assetCount` → `context.media?.list().length`
- `projectConfig` → `context.frame?.getContext()` + `context.project.getConfig()`

**Keep these props** (no API replacement or internal):
- `clips` — Juicer needs real StoredClip[] for AI context (Timeline API returns simplified TimelineClipInfo)
- `trackCount` — Could use `context.timelineApi?.getTracks().length` but trackCount includes all tracks, not just visible
- `trackSettings` — Could use `context.timelineApi?.getTracks()` but settings include locked/muted/hidden details
- `assetNames` — Keep as prop (used for prompt enrichment, simple to pass)
- `onApplySnapshot`, `onUndoSnapshot`, `onClose` — Callback props, must stay
- `hasSnapshot` — App.tsx owns undo state
- `pluginPickerFields` — Plugin system integration

**Actually, after careful analysis:** The JuicerModal is already well-architected as a props-driven component. The props are simple, clear, and correctly threaded. Replacing some props with API calls while keeping others as props would create an inconsistent pattern. The real value of API migration is:

1. **FPS correction** — Use `context.frame?.getContext().fps` instead of hardcoded `?? 30`
2. **Media enrichment** — Use `context.media?.list()` to enrich AI prompts with richer metadata
3. **Duration accuracy** — Use `context.timelineApi?.getState()` for real timeline durations
4. **Fake clip synthesis removal** — Use real clip data from `context.timelineApi?.getClips()`

### 4.2 Specific Changes

#### A. FPS Hardcoding (Critical — Incorrect for non-30fps projects)

**`ai/provider.ts:324,332,346,347`** — `describeOperationDetail()` always divides by 30:

```typescript
// BEFORE
case 'add_clip': return `ścieżka ${...}, ${(dur / 30).toFixed(1)}s`;
case 'add_audio': return `głośność ${...}`;
case 'add_transition': return `${p.type ?? 'fade'}, ${(dur / 30).toFixed(1)}s`;
case 'create_text': return `"${...}", rozmiar ${size}px`;

// AFTER — pass fps as parameter
case 'add_clip': return `ścieżka ${...}, ${(dur / fps).toFixed(1)}s`;
```

This requires adding `fps` parameter to `describeOperationDetail()` and threading it from `AIPlanRequest.context.fps`.

#### B. Remove Fake Clip Synthesis (App.tsx:2478-2483)

When no clips exist, instead of synthesizing fake StoredClips from assets, use `context.media?.list()` to describe available assets to the AI:

```typescript
// BEFORE — synthetic clips sent to AI
clips.length > 0 ? clips : assets.map((a, i) => ({
  id: a.sourceId, sourceId: a.sourceId, type: 'video',
  trackIndex: 0, offsetInTimeline: assets.slice(0, i).reduce(...),
  startFrame: 0, durationInFrames: a.durationInFrames,
  scale: 1, posX: 0, posY: 0,
  transitionIn: 'none', transitionDurationInFrames: 0,
}))

// AFTER — use real media list + clip list from APIs
// In prompt construction, describe media via context.media.list()
// Describe timeline clips via context.timelineApi.getClips()
```

#### C. Enrich AI Prompt with Real Media Metadata

**`JuicerModal.tsx:330-342`** — Currently builds context string with basic clip info. Should use `context.media?.list()` to add:

```
Available media:
- video.mp4 (video, 150 frames, 5.0s)
- audio.wav (audio, 900 frames, 30.0s)
- photo.jpg (image, 1 frame)
```

#### D. Duration Calculation Corrections

**`JuicerModal.tsx:330`** — `c.durationInFrames / (projectConfig?.fps ?? 30)`:

```typescript
// BEFORE
const fps = projectConfig?.fps ?? 30;
const seconds = c.durationInFrames / fps;

// AFTER
const fps = context.frame?.getContext().fps ?? projectConfig?.fps ?? 30;
const seconds = c.durationInFrames / fps;
```

#### E. Use Timeline API for Duration Context

**`JuicerModal.tsx` prompt construction** — Currently sends raw clip list to AI. Should also include:

```
Timeline:
- Total duration: {timelineApi.getState().durationInFrames} frames ({durationInSeconds}s)
- Content duration: {timelineApi.getState().contentDurationInFrames} frames
- Tracks: {timelineApi.getTracks().length}
```

#### F. Remove DEMO_PROMPT Bypass

**`JuicerModal.tsx:278`** — `input.trim().toUpperCase() === 'DEMO_PROMPT'` triggers mock execution. This is dead code in production and should be removed or converted to a debug-only path.

#### G. `describeOperationDetail()` FPS Fix (Server-Side)

**`ai/provider.ts:315-364`** — The function is used both client-side (for step display) and conceptually server-side. The hardcoded `dur / 30` must receive `fps` from `AIPlanRequest.context.fps`.

---

## 5. Files to Modify

### 5.1 Client-Side

| File | Change |
|------|--------|
| `src/components/modals/JuicerModal.tsx` | Replace hardcoded FPS fallbacks with `context.frame?.getContext().fps`; use `context.media?.list()` for media enrichment in prompts; use `context.timelineApi?.getState()` for timeline context; remove `DEMO_PROMPT` bypass |
| `src/App.tsx` | Remove fake clip synthesis (lines 2478-2483); pass real clip data to JuicerModal; add `context` to JuicerModal props |
| `src/ai/provider.ts` | Fix `describeOperationDetail()` to accept `fps` parameter instead of hardcoded 30 |

### 5.2 Server-Side

| File | Change |
|------|--------|
| `server/modules/juicer.mjs` | No changes required — server already reads FPS from `context.fps ?? 30` |

### 5.3 Not Modified

| File | Why |
|------|-----|
| `src/juicer/stepExecutor.ts` | Already uses `ctx.fps` correctly |
| `src/juicer/validator.ts` | Already receives correct context |
| `server/ai/juicer_prompt.mjs` | Prompt is correct — references PROJECT STATE FPS |
| `server/ai/juicer_prompt_gemini.mjs` | Prompt has its own duration defaults — acceptable |
| `src/ai/types.ts` | Types are generic |
| `packages/core/` | No core changes needed |

---

## 6. Plugin-Specific Types (Already in Plugin Folder)

The Juicer already follows the architectural rule correctly:

| Type | Location | Status |
|------|----------|--------|
| `JuicerPhase` | `JuicerModal.tsx:23-31` | ✅ Inside component |
| `PlanChange` | `JuicerModal.tsx:33-35` | ✅ Inside component |
| `PromptHistoryEntry` | `JuicerModal.tsx:59-63` | ✅ Inside component |
| `ExecutionContext` | `stepExecutor.ts:14-22` | ✅ Inside plugin |
| `JuicerOperation` | `stepExecutor.ts:24-28` | ✅ Inside plugin |
| `OperationType` | `stepExecutor.ts:7-12` | ✅ Inside plugin |
| `StepResult` | `stepExecutor.ts:30-33` | ✅ Inside plugin |
| `ValidationResult` | `validator.ts:9-12` | ✅ Inside plugin |
| `ValidationError` | `validator.ts:14-18` | ✅ Inside plugin |
| `AIPlanRequest` | `ai/types.ts:26-38` | ⚠️ In shared `src/ai/` — acceptable, not core |
| `AIPlanResponse` | `ai/types.ts:49-67` | ⚠️ In shared `src/ai/` — acceptable, not core |

---

## 7. Migration Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| FPS fix changes AI prompt context | Medium | Test with 24fps and 60fps projects to verify AI generates correct frame counts |
| Removing fake clips changes AI behavior | Medium | AI must handle "no clips on timeline" gracefully — use media list instead |
| `describeOperationDetail()` signature change | Low | Only affects client-side display; server-side prompt text is separate |
| DEMO_PROMPT removal | Low | Debug feature only; no production impact |
| Props change in JuicerModal | Medium | App.tsx must pass updated props — test modal rendering |
| `context.frame`/`context.media` may be undefined | Low | Already guarded with `?.` operators |

---

## 8. Test Plan

### 8.1 FPS Correctness

| Test | Description |
|------|-------------|
| `describeOperationDetail` at 24fps | Duration displays correctly (not divided by 30) |
| `describeOperationDetail` at 60fps | Duration displays correctly |
| `describeOperationDetail` at 30fps | No regression |
| AI prompt FPS context | Prompt includes correct FPS for non-30fps projects |

### 8.2 Media Enrichment

| Test | Description |
|------|-------------|
| Media list in prompt | AI prompt includes media metadata from `context.media.list()` |
| No media available | Graceful handling when no assets exist |
| Mixed media types | Video, audio, image assets all listed correctly |

### 8.3 Timeline Context

| Test | Description |
|------|-------------|
| Duration in prompt | Total/content duration from `context.timelineApi.getState()` included |
| Empty timeline | No clips → zero duration, no errors |
| Multi-track timeline | Track count from `context.timelineApi.getTracks()` |

### 8.4 Fake Clip Removal

| Test | Description |
|------|-------------|
| No clips, has assets | AI receives media list, not synthetic clips |
| Has clips | AI receives real clip data |
| Mixed state | Real clips take priority over media list |

### 8.5 Regression

| Test | Description |
|------|-------------|
| Full Juicer flow | Prompt → AI → plan → validate → execute → apply |
| Undo after apply | Snapshot restore works correctly |
| Multiple applies | Each apply creates undoable snapshot |
| Attached files | File content read, duration detection, metadata sent to AI |
| Clarification flow | AI asks question → user answers → plan regenerated |

---

## 9. Minimal Implementation Path

### Step 1: Fix `describeOperationDetail()` FPS (1 file)

`src/ai/provider.ts` — Add `fps` parameter to `describeOperationDetail()`, replace hardcoded `30` with `fps`. Update callers to pass `request.context.fps`.

### Step 2: Enrich AI Prompt with Media/Timeline APIs (1 file)

`src/components/modals/JuicerModal.tsx` — In `handleExecute()` prompt construction:
- Add `context.media?.list()` media inventory
- Add `context.timelineApi?.getState()` timeline summary
- Use `context.frame?.getContext().fps` for FPS

### Step 3: Fix App.tsx Fake Clip Synthesis (1 file)

`src/App.tsx` — Remove `assets.map(...)` synthetic clip creation at line 2478-2483. Pass empty array when no clips exist; let JuicerModal handle "no clips" via media API.

### Step 4: Remove DEMO_PROMPT Bypass (1 file)

`src/components/modals/JuicerModal.tsx` — Remove `input.trim().toUpperCase() === 'DEMO_PROMPT'` check and associated mock execution path.

### Step 5: Add `context` Prop to JuicerModal (1 file)

`src/components/modals/JuicerModal.tsx` — Accept `context: PluginContext` as prop (already available from App.tsx). Use for API calls while keeping other props for backward compatibility.

**Total: 4 files modified, 0 new files, 0 core changes.**

---

*Awaiting approval before implementation.*
