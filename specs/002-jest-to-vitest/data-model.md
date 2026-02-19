# Data Model: Jest-to-Vitest Migration

**Date**: 2026-02-19
**Feature**: 002-jest-to-vitest

## Overview

This migration does not introduce new data entities or modify the application data model. The "entities" in this context are **configuration artifacts** and **infrastructure files** that define how the test runner is configured and invoked.

## Configuration Entities

### 1. Vitest Configuration (vitest.config.ts)

**Purpose**: Single source of truth for all test runner configuration (replaces 31 separate Jest config files).

**Structure**:

| Field | Type | Description |
|---|---|---|
| `plugins` | Plugin[] | Vite plugins — `vite-tsconfig-paths` for alias resolution |
| `test.environment` | string | `'node'` — server-side integration tests |
| `test.globals` | boolean | `true` — expose describe/it/expect globally |
| `test.testTimeout` | number | `1_800_000` (30 minutes) |
| `test.setupFiles` | string[] | Pre-framework setup (WebSocket polyfill) |
| `test.setupFiles` | string[] | Post-framework setup (logging, custom matchers) |
| `test.globalSetup` | string | User registration in Kratos/Alkemio |
| `test.reporters` | Reporter[] | `['default', 'html']` |
| `test.outputFile` | object | `{ html: './html-report/report.html' }` |
| `test.include` | string[] | Default: `['src/**/*.it-spec.ts']` |
| `test.projects` | ProjectConfig[] | 30+ named domain projects |

### 2. Project Definition (within projects array)

**Purpose**: Each domain-specific test suite is a named project.

| Field | Type | Description |
|---|---|---|
| `extends` | boolean | `true` — inherit root config |
| `test.name` | string | Domain identifier (e.g., `'account'`, `'nightly'`) |
| `test.include` | string[] | Glob patterns for test files in this domain |

**Relationships**:
- Each project inherits from the root config
- The `nightly` project aggregates patterns from multiple domains
- npm scripts reference projects by name: `vitest run --project <name>`

### 3. Package.json Script Mapping

**Purpose**: Maps npm script commands to Vitest CLI invocations.

**Transformation pattern**:

| Current (Jest) | Migrated (Vitest) |
|---|---|
| `jest --config ./config/jest.config.<domain>.mjs` | `vitest run --project <domain>` |
| `--forceExit` | `--forceExit` |
| `--runInBand` | `--fileParallelism=false` |
| `--maxWorkers=N` | `--maxWorkers=N` |
| `--verbose` | (default in Vitest) |

### 4. Setup File Chain

**Purpose**: Three-phase initialization before tests execute.

```
Phase 1: globalSetup (globalTestsSetup.ts)
  └── Runs once before all test files
  └── Registers test users in Kratos + Alkemio

Phase 2: setupFiles (setupTests.ts)
  └── Runs before each test file (pre-framework)
  └── Installs WebSocket polyfill

Phase 3: setupFiles (vitest.setup.ts, formerly jest.setup.ts)
  └── Runs before each test file (post-framework)
  └── Logs test suite name
  └── Registers custom matchers
```

## State Transitions

### Migration State Machine

```
[Jest Active] → [Vitest Config Created] → [Setup Files Migrated] → [Scripts Updated] → [Jest Deps Removed] → [Vitest Active]
```

Each state is independently verifiable:
1. **Jest Active**: Current state — `jest` command works
2. **Vitest Config Created**: `vitest.config.ts` exists with valid projects
3. **Setup Files Migrated**: ESM syntax, Vitest imports, globalSetup uses `export default`
4. **Scripts Updated**: `package.json` scripts invoke `vitest` instead of `jest`
5. **Jest Deps Removed**: `@types/jest`, `ts-jest`, `jest-html-reporters` no longer in `package.json`
6. **Vitest Active**: All tests pass, HTML reports generate, all npm scripts work
