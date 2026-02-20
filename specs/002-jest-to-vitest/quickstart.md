# Quickstart: Jest-to-Vitest Migration for server-api

**Date**: 2026-02-19
**Updated**: 2026-02-20 (reflects actual implementation)
**Feature**: 002-jest-to-vitest

## Prerequisites

- Node.js 20.9.0+ (Volta-managed)
- pnpm (workspace-level)
- Running Alkemio platform instance (for integration test execution)

## Migration Steps (High-Level)

### Step 1: Install Vitest dependencies

```bash
cd server-api
pnpm add -D vitest vite-tsconfig-paths @vitest/ui
pnpm remove @types/jest ts-jest jest-html-reporters tsconfig-paths
```

### Step 2: Create vitest.config.ts

Create `server-api/vitest.config.ts` with:
- `vite-tsconfig-paths` plugin for path alias resolution
- `globals: true` for implicit test globals
- `environment: 'node'`
- `testTimeout: 60_000` + `hookTimeout: 120_000` (granular timeouts)
- Setup file chain: `globalSetup`, `setupFiles`
- `project()` helper with `globalSetup: []` override per project
- `projects` array with 27 named domain projects + nightly composite
- HTML reporter with timestamped output

### Step 3: Migrate setup files

1. **globalTestsSetup.ts**: Remove `require('tsconfig-paths/register')`, convert `module.exports` to `export default`
2. **setupTests.ts**: Replace `require('ws')` with ESM `import`
3. **jest.setup.ts** → **vitest.setup.ts**: Rename file (logic unchanged)

### Step 4: Update custom matcher

In `src/utils/array.matcher.ts`:
- Replace `import { expect } from '@jest/globals'` with `import { expect } from 'vitest'`
- Update type declarations from Jest namespace to Vitest module augmentation

### Step 5: Update type declarations

Rename `src/types/jest-extend.d.ts` → `src/types/vitest-extend.d.ts`:
- Replace `namespace jest` with `declare module 'vitest'`

### Step 6: Update tsconfig.json

```json
"types": ["node"]
```

Vitest global types are provided via `/// <reference types="vitest/globals" />` in `src/types/vitest-extend.d.ts`, resolved through the existing `typeRoots` configuration.

### Step 7: Update package.json scripts

Replace all `jest` invocations with `vitest run --project <name>` equivalents. Add concurrency flags as needed.

### Step 8: Delete Jest config files

Remove all 31 files in `server-api/config/jest.config.*.mjs` (and `jest.config.preferences.jms`).

## Validation

```bash
# Run a single domain to verify basic setup
pnpm --filter @alkemio/test-suite-server-api run test:account

# Run nightly suite to verify full migration
pnpm --filter @alkemio/test-suite-server-api run test:nightly

# Verify lib/ still builds
pnpm --filter @alkemio/tests-lib run build

# Verify TypeScript compilation
cd server-api && pnpm exec tsc --noEmit
```

## Rollback

This migration is on branch `002-jest-to-vitest`. If issues arise:
```bash
git checkout develop
```
No changes to `lib/` or `client-web/` means rollback has zero blast radius.
