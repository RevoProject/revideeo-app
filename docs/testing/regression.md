# Regression Testing

## Purpose

Regression tests verify that confirmed bugs do not reappear. Each v0.3.0/v0.3.1 bug fix includes a corresponding regression test.

## Test Files

| File | Covers |
|------|--------|
| `tests/bugFixes.test.ts` | Historical bug fixes (ripple edit, transition overlap, etc.) |
| `tests/phase5Smoke.test.ts` | v0.3.0 Phase 5 smoke tests (all APIs, Auto Captions, permissions, stability) |
| `tests/v031Regression.test.ts` | v0.3.1 specific regressions (speed, duration overlap, localization, snapshot isolation) |
| `tests/renderStability.test.ts` | Rendering pipeline stability |
| `tests/transitionStyles.test.ts` | Transition computation correctness |
| `tests/frameApi.test.ts` | Frame API provider and context tests |
| `tests/mediaApi.test.ts` | Media API discovery and metadata tests |
| `tests/timelineApi.test.ts` | Timeline API state and query tests |

## Bug Categories Tested

### Speed / FPS
- Video/audio `playbackRate` propagation to HTMLMediaElement
- FPS-correct time calculation (not hardcoded `/30`)
- Seek threshold accuracy

### Timeline
- Duration increase ripple logic (following clips pushed)
- Duration decrease ripple logic (following clips pulled)
- Cross-track isolation during ripple
- Transition clip snapping during ripple

### API Snapshots
- `getClips()` returns isolated shallow copies
- `getTracks()` returns isolated shallow copies
- Mutating returned objects does not affect provider state
- Lazy context resolution (Proxy-based)

### Localization
- All translation keys exist in en/pl/de locale files
- No raw key display in affected UI areas
