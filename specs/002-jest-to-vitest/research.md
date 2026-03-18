# Research: Jest-to-Vitest Migration for server-api

**Date**: 2026-02-19
**Updated**: 2026-02-20 (reflects actual implementation decisions)
**Feature**: 002-jest-to-vitest

## 1. globalSetup — CommonJS to ESM

**Decision**: Convert `module.exports = async () => {...}` to `export async function setup()`.

**Rationale**: Vitest processes globalSetup files through Vite's transform pipeline which expects ESM. The current file mixes CJS (`require('tsconfig-paths/register')`, `module.exports`) with ESM imports — a pattern ts-jest tolerates but Vitest will not.

**Migration**:
- Remove `require('tsconfig-paths/register')` — Vitest resolves aliases via `vite-tsconfig-paths` plugin
- Replace `module.exports = async () => {}` with `export default async function setup() {}`
- Keep all existing registration logic intact

**Alternatives considered**:
- Keeping CJS with `createRequire`: Rejected — unnecessary complexity when Vitest natively handles ESM

## 2. expect.getState().testPath

**Decision**: Keep the same `expect.getState().testPath` pattern — it works in Vitest v3+ `beforeAll` hooks.

**Rationale**: This was historically broken in early Vitest versions (tracked in issue #6367, fixed via PR #6472). In current Vitest, `testPath` is available in `beforeAll` hooks within setup files loaded via `setupFiles`.

**Fallback**: If `testPath` is undefined in `beforeAll`, Vitest's hook receives a `Suite` context: `beforeAll(({ task }) => { task?.file?.filepath })`.

## 3. Path Alias Resolution

**Decision**: Use `resolve.alias` in `vitest.config.ts` with explicit mappings. This replaces `pathsToModuleNameMapper` from ts-jest.

**Rationale**: Vitest does not automatically read tsconfig.json path aliases. Explicit `resolve.alias` entries in vitest.config.ts provide direct, predictable resolution with no additional dependencies. The `vite-tsconfig-paths` plugin was initially considered but removed in favor of explicit aliases to reduce the dependency footprint.

**Alternatives considered**:
- `vite-tsconfig-paths` plugin: Initially planned, but removed — adds a dependency for something easily configured with 6 alias entries
- `tsconfig-paths`: Rejected — only works for Node.js require/import at runtime, not in Vite's transform pipeline

## 4. HTML Test Reporting

**Decision**: Use Vitest's built-in `html` reporter (requires `@vitest/ui` as a dependency).

**Rationale**: First-party, mature, well-documented. Generates interactive HTML reports with test names, pass/fail status, and durations. Output path is configurable via `outputFile`.

**Installation**: `pnpm add -D @vitest/ui`

**Configuration**:
```typescript
reporters: ['default', 'html'],
outputFile: { html: './html-report/report.html' },
```

**Alternatives considered**:
- `vitest-html-reporters` (third-party port of jest-html-reporters): Rejected for initial migration — less mature, and the current codebase doesn't use `addAttach`/`addMsg` features unique to jest-html-reporters

## 5. WebSocket Polyfill

**Decision**: Replace `require('ws')` with ESM `import WebSocket from 'ws'`.

**Rationale**: In Vitest's native ESM environment, bare `require()` is not available. Direct ESM import is the simplest and cleanest approach. The `ws` package exports a default.

**Migration**:
```typescript
// Before (Jest):
(global as any).WebSocket = require('ws');

// After (Vitest):
import WebSocket from 'ws';
(globalThis as any).WebSocket = WebSocket;
```

**Note**: Node.js 22+ provides native `globalThis.WebSocket` (from undici), but the project targets Node 20.9.0, so the polyfill is still needed.

## 6. Domain-Specific Configuration Strategy

**Decision**: Use Vitest's `projects` array with inline configurations in a single `vitest.config.ts`. Each domain becomes a named project.

**Rationale**: This consolidates 31 separate Jest config files (1 base + 30 domain) into a single file. Each project inherits the base config via `extends: true` and only overrides `name` and `include` patterns. Scripts select projects via `vitest run --project <name>`.

**Pattern**:
```typescript
projects: [
  { extends: true, test: { name: 'account', include: ['src/functional-api/account/**/*.it-spec.ts'] } },
  // ... one entry per domain
]
```

**Alternatives considered**:
- Multiple `vitest.config.*.ts` files (1:1 mapping): Rejected — same maintenance burden as current 31 Jest configs
- CLI `--include` flags only: Rejected — no named projects, harder to maintain in package.json scripts

## 7. Global Test Functions

**Decision**: Use `globals: true` in Vitest config + `/// <reference types="vitest/globals" />` in `vitest-extend.d.ts` (resolved via `typeRoots`).

**Rationale**: All 92 test files use implicit global test functions (`describe`, `it`, `expect`, `beforeAll`, `afterAll`). With `globals: true`, Vitest makes these available without imports, matching Jest's default behavior. This means zero changes needed in test files.

**Implementation note**: The original plan specified `"types": ["node", "vitest/globals"]` in tsconfig.json, but the project uses a custom `typeRoots` configuration (`./node_modules/@types`, `../node_modules/@types`, `./src/types`). Adding `"vitest/globals"` to the `types` array would conflict with `typeRoots`. Instead, the `/// <reference types="vitest/globals" />` directive in `src/types/vitest-extend.d.ts` provides the same type resolution through the existing `typeRoots` mechanism.

## 8. Custom Matcher Migration

**Decision**: Replace `import { expect } from '@jest/globals'` with `import { expect } from 'vitest'` in `array.matcher.ts`. Update type declarations from `jest` namespace to `vitest` module augmentation.

**Rationale**: Vitest's `expect.extend()` API is fully compatible with Jest's. The `this` context provides the same utilities: `this.equals()`, `this.utils.printReceived()`, `this.utils.printExpected()`.

**Type declaration migration**:
```typescript
// Before (Jest):
declare global { namespace jest { interface Matchers<R> { toContainObject(argument: any): R; } } }

// After (Vitest):
import 'vitest';
declare module 'vitest' { interface Matchers<T = any> { toContainObject(argument: any): T; } }
```

## 9. Test File Include Patterns

**Decision**: Convert Jest `testRegex` (regex) to Vitest `include` (glob patterns).

**Rationale**: Straightforward translation. Jest regex `.*\\.it-spec\\.ts` becomes glob `**/*.it-spec.ts`.

**Translation table**:

| Jest testRegex | Vitest include |
|---|---|
| `/src/functional-api/account/.*\\.it-spec\\.ts` | `src/functional-api/account/**/*.it-spec.ts` |
| `/src/functional-api/roleset/.*\\.it-spec\\.ts` | `src/functional-api/roleset/**/*.it-spec.ts` |
| (same pattern for all 30 domains) | (same pattern for all 30 domains) |

## 10. Worker/Concurrency Control

**Decision**: Use `--maxWorkers=N` CLI flag or `maxWorkers` config option. For `--runInBand` equivalent, use `--fileParallelism=false`.

**Rationale**: Vitest's concurrency model maps directly to Jest's:

| Jest CLI | Vitest CLI |
|---|---|
| `--maxWorkers=1` | `--maxWorkers=1` |
| `--runInBand` | `--fileParallelism=false` (runs in main thread) |
| `--maxWorkers=6` | `--maxWorkers=6` |
| `--forceExit` | `--forceExit` (available since Vitest v1) |

Note: `--forceExit` is supported in Vitest and maps directly.

## 11. Test Timeout Strategy

**Decision**: Retain the 30-minute (1,800,000 ms) timeout from the Jest baseline for both `testTimeout` and `hookTimeout`.

**Rationale**: The server-api tests are integration tests that make sequential API calls against a live Alkemio server. Individual tests and `beforeAll` hooks both create and manipulate entities via HTTP, which can be slow under load or in CI environments. The original Jest config used a single 30-minute timeout. An earlier implementation attempted to split this into `testTimeout: 60_000` + `hookTimeout: 120_000` for finer granularity, but this deviated from FR-008 (configurable 1,800,000 ms timeout) and risked premature failures in CI. The conservative 30-minute timeout preserves the existing safety margin.

**Alternatives considered**:
- `testTimeout: 60_000` + `hookTimeout: 120_000`: Rejected — too tight for integration tests under CI load; violates FR-008 baseline requirement

## Dependency Changes Summary

### Remove from devDependencies:
- `@types/jest` (^29.5.14)
- `ts-jest` (^29.2.5)
- `jest-html-reporters` (^3.1.7)
- `tsconfig-paths` (^4.2.0) — no longer needed, replaced by vite-tsconfig-paths

### Add to devDependencies:
- `vitest` (^4.0.18)
- `@vitest/ui` (^4.0.18, for HTML reporter)

### Keep unchanged:
- All production dependencies
- `cross-env`, `eslint`, `prettier`, `rimraf`, `tsx`, `typescript`, `typescript-eslint`, `globals`
- `graphql-request`, `@graphql-codegen/*`

## Files Impact Summary

| Category | Files | Changes |
|---|---|---|
| **New files** | 1 | `vitest.config.ts` |
| **Delete** | 31 | All `config/jest.config.*.mjs` files |
| **Update (infrastructure)** | 3 | `setupTests.ts`, `jest.setup.ts` → `vitest.setup.ts`, `globalTestsSetup.ts` |
| **Update (types/matchers)** | 2 | `array.matcher.ts`, `jest-extend.d.ts` → `vitest-extend.d.ts` |
| **Update (config)** | 2 | `package.json`, `tsconfig.json` |
| **Test files** | 0 | No changes needed |
| **lib/ and client-web/** | 0 | No changes (FR-011, FR-012) |
