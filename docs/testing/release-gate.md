# Release Gate

## Purpose

The release gate defines a repeatable, mandatory validation process before any version release.

## Stages

### 1. Repository Review
- `git status` — no uncommitted changes except intended release files
- `git diff --stat` — review all changes in scope
- Verify commit history is clean and intentional

### 2. Lint
- `pnpm lint` — zero warnings, zero errors

### 3. Typecheck
- `pnpm --filter @revideeo/core typecheck`
- `pnpm --filter @revideeo/player typecheck`
- `npx tsc --noEmit -p tsconfig.app.json`

### 4. Full Test Suite
- `pnpm test` — all tests pass, no skips, no failures
- Report exact test count

### 5. Production Build
- `pnpm build` — successful compilation and bundling

### 6. API Regression
- Verify all public APIs compile and pass tests
- Verify no type signature changes
- Verify permission boundaries
- Verify no internal state leakage

### 7. Manual Browser Smoke Test
- Run the [smoke test checklist](smoke.md) in a real browser
- Verify at both 30 FPS and 60 FPS
- Check browser console for errors

### 8. Final Diff Review
- No debug code
- No mock/demo/fake production paths
- No build artifacts staged
- No temporary files
- No unrelated changes

### 9. Version Bump
- Update `package.json`
- Update `public/version.json`
- Update `src/pwa.ts`
- Update `src/App.tsx` release modal
- Update i18n translation keys for release notes

### 10. Release Notes
- Concise, accurate description of changes
- No invented features
- No unverified claims

### 11. Release Commit
- Single atomic commit with clear message

### 12. Final Verification
- Re-run lint, typecheck, tests, build
- Verify clean `git status`

### 13. Push/Deploy
- Only when explicitly approved
- Do not push during release gate validation

## Server Repository

If server changes are part of the release, perform equivalent validation:
- Syntax check all `.mjs` files
- Verify server starts and responds to health check
- Verify affected endpoints work
- Create separate server commit if needed
