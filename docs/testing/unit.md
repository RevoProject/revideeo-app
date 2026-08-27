# Unit Testing

## Framework

ReVideeo uses **Vitest** as its test framework with three test environments:

- **Core** (`packages/core/tests/`): Node environment — pure function tests
- **Player** (`packages/player/tests/`): jsdom environment — DOM-related tests
- **Root** (`tests/`): jsdom environment — integration and API tests

## Test Patterns

### Pure Function Tests (Core)

Core tests validate isolated logic without DOM or React:

```typescript
import { createFrameContext } from '@revideeo/core/frame';

describe('FrameContext', () => {
  it('returns correct values at 24fps', () => {
    const api = createFrameContext(provider, state);
    expect(api.getContext().fps).toBe(24);
  });
});
```

### API Integration Tests (Root)

Integration tests validate the full API pipeline — provider → context → result:

```typescript
import { createTimelineContext } from '@revideeo/core/timeline';

describe('Timeline API', () => {
  it('getClips returns isolated snapshots', () => {
    const api = createTimelineContext(provider);
    const clip = api.getClips()[0];
    clip.id = 'MUTATED';
    expect(providerClips[0].id).toBe('original');
  });
});
```

### Plugin-Specific Tests

Plugins like Auto Captions have focused tests for their domain logic:

```typescript
import { segmentsToCaptions } from '../../plugins/auto-captions/utils';

describe('caption conversion', () => {
  it('applies clip timeline offset correctly', () => {
    const captions = segmentsToCaptions(segments, 150, 30);
    expect(captions[0].startFrame).toBe(180);
  });
});
```

## Conventions

- Tests use `describe`/`it` blocks with descriptive names
- No external mocking framework (no `jest.fn()` — use `vi.fn()` from Vitest)
- Fixture factories for common objects (`makeClip()`, `makeTrack()`)
- Each confirmed bug gets a regression test
