# Testing

> ReVideeo testing strategy and procedures

## Overview

ReVideeo uses a layered testing approach combining automated validation with manual runtime verification. Neither layer replaces the other.

**Automated tests** verify contracts, logic, and regressions.
**Manual smoke testing** verifies real runtime behavior in the browser.

## Testing Areas

| Area | Entry Point | Description |
|------|-------------|-------------|
| [Unit Testing](testing/unit.md) | Core packages, component tests |
| [Regression Testing](testing/regression.md) | v0.3.0+ regression coverage |
| [Manual Smoke Testing](testing/smoke.md) | Real browser runtime verification |
| [Release Gate](testing/release-gate.md) | Pre-release validation checklist |

## Test Suites

| Suite | Command | Location | Count |
|-------|---------|----------|-------|
| Core unit tests | `pnpm --filter @revideeo/core test` | `packages/core/tests/` | ~130 |
| Player tests | `pnpm --filter @revideeo/player test` | `packages/player/tests/` | ~184 |
| Root integration tests | `pnpm test` | `tests/` | ~338 |
| **Total** | | | **~652** |

## Quick Commands

```bash
# Full validation suite
pnpm lint && pnpm --filter @revideeo/core typecheck && pnpm --filter @revideeo/player typecheck && npx tsc --noEmit -p tsconfig.app.json && pnpm test && pnpm build

# Run all tests
pnpm test

# Run specific suite
pnpm --filter @revideeo/core test
```

## Key Principle

> Automated tests verify contracts, logic, and regressions.
> Manual smoke testing verifies real runtime behavior.
> Neither replaces the other.
