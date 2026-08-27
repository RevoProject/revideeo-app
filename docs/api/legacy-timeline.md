# Legacy Timeline API

> `context.timeline` — always available, no permission required

## Purpose

The original timeline API providing basic frame access and marker management. Preserved for backwards compatibility.

## API Surface

```typescript
interface PluginTimelineAPI {
  getCurrentFrame(): number;
  seekTo(frame: number): void;
  getTotalFrames(): number;
  addMarker(frame: number): void;
  removeMarker(id: string): void;
  getMarkers(): { id: string; frame: number }[];
}
```

## Relationship to Timeline API

The newer `context.timelineApi` (requires `timeline:read`) provides a superset of functionality including atomic state snapshots, playback control, and clip/track queries. The legacy API remains unchanged and always available.

See [Timeline API](timeline.md) for the comparison table.
