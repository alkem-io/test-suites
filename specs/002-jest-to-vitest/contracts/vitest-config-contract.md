# Configuration Contract: vitest.config.ts

**Date**: 2026-02-19
**Updated**: 2026-02-20 (reflects actual implementation)
**Feature**: 002-jest-to-vitest

## Purpose

This contract defines the structure and expected behavior of the Vitest configuration file that replaces all 31 Jest config files.

## Contract: Root Configuration

```typescript
// server-api/vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Helper to define a named project. Each project:
 * - Inherits root config (plugins, environment, globals, timeout, setupFiles, reporters)
 * - Overrides globalSetup to [] so it only runs once from the root project
 */
const project = (name: string, include: string[]) => ({
  extends: true as const,
  test: {
    name,
    include,
    globalSetup: [] as string[],
  },
});

// Timestamped HTML report filename (prevents overwriting previous runs)
const timestamp = /* YYYY-MM-DD-HH-MM-SS format */;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Environment
    environment: 'node',
    globals: true,

    // Timeouts (granular: per-test vs per-hook)
    testTimeout: 60_000,   // 60s per individual test (generous for API calls)
    hookTimeout: 120_000,  // 120s per hook (beforeAll creates multiple entities)

    // Setup chain
    setupFiles: ['./src/setupTests.ts', './src/vitest.setup.ts'],
    globalSetup: './src/globalTestsSetup.ts',

    // Reporting
    reporters: ['default', 'html'],
    outputFile: {
      html: `./html-report/report_${timestamp}.html`,
    },

    // Domain-specific projects (no root include — projects define their own)
    projects: [
      // See Project Definitions below
    ],
  },
});
```

### Design Decision: Timeout Granularity

The original spec called for `testTimeout: 1_800_000` (30 minutes). The implementation uses a more granular approach:
- `testTimeout: 60_000` — each individual `it()` block gets 60s, generous for single API calls
- `hookTimeout: 120_000` — `beforeAll` hooks that create multiple test entities via API get 120s

This prevents a single stuck API call from blocking for 30 minutes while still giving hooks enough headroom.

### Design Decision: globalSetup Deduplication

The `project()` helper function sets `globalSetup: []` for each named project. Without this, Vitest would re-run `globalTestsSetup.ts` (user registration) for every project in the `projects` array. Only the root config triggers global setup.

## Contract: Project Definitions

Each domain project follows this structure:

```typescript
{
  extends: true,  // Inherit root config (plugins, environment, globals, timeout, setup, reporters)
  test: {
    name: '<domain-name>',
    include: ['src/functional-api/<domain-path>/**/*.it-spec.ts'],
  },
}
```

### Required Projects (mapped from Jest configs)

| Project Name | Include Pattern | Jest Source |
|---|---|---|
| `account` | `src/functional-api/account/**/*.it-spec.ts` | jest.config.account.mjs |
| `activity-logs` | `src/functional-api/activity-logs/**/*.it-spec.ts` | jest.config.activity-logs.mjs |
| `callouts` | `src/functional-api/callout/**/*.it-spec.ts` | jest.config.callouts.mjs |
| `communication` | `src/functional-api/communications/**/*.it-spec.ts` | jest.config.communication.mjs |
| `configuration` | `src/functional-api/configuration/**/*.it-spec.ts` | jest.config.configuration.mjs |
| `contributor-management` | `src/functional-api/contributor-management/**/*.it-spec.ts` | jest.config.contributor-management.mjs |
| `documents` | `src/functional-api/integration/documents/**/*.it-spec.ts` | jest.config.documents.mjs |
| `entitlements` | `src/functional-api/entitlements/**/*.it-spec.ts` | jest.config.entitlements.mjs |
| `innovation-hub` | `src/functional-api/innovation-hub/**/*.it-spec.ts` | jest.config.innovation-hub.mjs |
| `innovation` | `src/functional-api/innovation-pack/**/*.it-spec.ts` | jest.config.innovationPacks.mjs (note: jest.config.innovation-pack.mjs was an unused orphan) |
| `integration` | `src/functional-api/integration/**/*.it-spec.ts` | jest.config.integration.mjs |
| `journey` | `src/functional-api/journey/**/*.it-spec.ts` | jest.config.journey.mjs |
| `lifecycle` | `src/functional-api/templates/innovation-flow/**/*.it-spec.ts` | jest.config.lifecycle.mjs |
| `lookup` | `src/functional-api/lookup/**/*.it-spec.ts` | jest.config.lookup.mjs |
| `notifications` | `src/functional-api/notifications/**/*.it-spec.ts` | jest.config.notifications.mjs |
| `notifications-callouts` | `src/functional-api/notifications/callouts/**/*.it-spec.ts` | jest.config.notifications-callouts.mjs |
| `notifications-community` | `src/functional-api/notifications/community/**/*.it-spec.ts` | jest.config.notifications-community.mjs |
| `notifications-messaging` | `src/functional-api/notifications/messaging/**/*.it-spec.ts` | jest.config.notifications-messaging.mjs |
| `organization` | `src/functional-api/contributor-management/organization/**/*.it-spec.ts` | jest.config.organization.mjs |
| `pagination` | `src/functional-api/pagination/**/*.it-spec.ts` | jest.config.pagination.mjs |
| `platform` | `src/functional-api/platform/**/*.it-spec.ts` | jest.config.platform.mjs |
| `preferences` | `src/functional-api/preferences/**/*.it-spec.ts` | jest.config.preferences.jms |
| `roleset` | `src/functional-api/roleset/**/*.it-spec.ts` | jest.config.roleset.mjs |
| ~~`roleset-parallel`~~ | ~~`src/functional-api/roleset/**/*.it-spec.ts`~~ | ~~jest.config.roleset-parallel.mjs~~ (orphan — removed, see CHK007) |
| `search` | `src/functional-api/search/**/*.it-spec.ts` | jest.config.search.mjs |
| `storage` | `src/functional-api/storage/**/*.it-spec.ts` | jest.config.storage.mjs |
| `subscriptions` | `src/functional-api/subscriptions/**/*.it-spec.ts` | jest.config.subscriptions.mjs |
| `templates` | `src/functional-api/templates/**/*.it-spec.ts` | jest.config.templates.mjs |

### Nightly Project (composite)

```typescript
{
  extends: true,
  test: {
    name: 'nightly',
    include: [
      'src/functional-api/account/**/*.it-spec.ts',
      'src/functional-api/roleset/**/*.it-spec.ts',
      'src/functional-api/contributor-management/**/*.it-spec.ts',
      'src/functional-api/callout/**/*.it-spec.ts',
      'src/functional-api/communications/**/*.it-spec.ts',
      'src/functional-api/activity-logs/**/*.it-spec.ts',
      'src/functional-api/journey/**/*.it-spec.ts',
      'src/functional-api/storage/**/*.it-spec.ts',
      'src/functional-api/entitlements/**/*.it-spec.ts',
      'src/functional-api/templates/**/*.it-spec.ts',
    ],
  },
}
```

## Contract: npm Script Invocations

Each script in `package.json` invokes Vitest with the project name and appropriate concurrency flags:

```
vitest run --project <name> [--maxWorkers=N] [--fileParallelism=false] [--forceExit]
```

### Flag Mapping

| Jest Flag | Vitest Flag |
|---|---|
| `--config ./config/jest.config.<x>.mjs` | `--project <name>` |
| `--forceExit` | `--forceExit` |
| `--runInBand` | `--fileParallelism=false` |
| `--maxWorkers=N` | `--maxWorkers=N` |
| `--verbose` | (default behavior) |
| `--watch` | `vitest` (watch is default, `vitest run` for single run) |

### Additional Script: test:nightly:ui

```json
"test:nightly:ui": "vitest --project nightly --maxWorkers=1 --ui"
```

This script was added during implementation to enable interactive debugging of the nightly suite via Vitest's built-in UI. It runs in watch mode (no `run` flag) with the UI dashboard.

## Validation Criteria

1. `vitest run --project account` executes only `src/functional-api/account/**/*.it-spec.ts`
2. `vitest run --project nightly --maxWorkers=1` runs the nightly suite serially
3. HTML report is generated at `./html-report/report_<timestamp>.html`
4. Path aliases (`@generated/*`, `@utils/*`, etc.) resolve correctly
5. Global setup registers test users before any tests execute (once, not per-project)
6. WebSocket polyfill is active during all test files
7. Custom `toContainObject` matcher works in all test files
