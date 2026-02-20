# Implementation Plan: Migrate server-api from Jest to Vitest

**Branch**: `002-jest-to-vitest` | **Date**: 2026-02-19 | **Implemented**: 2026-02-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-jest-to-vitest/spec.md`
**Status**: Implemented (pending validation — see §Implementation Status below)

## Summary

Replace Jest with Vitest as the test runner for the `server-api` package. The migration consolidates 31 separate Jest configuration files into a single `vitest.config.ts` using Vitest's `projects` array, migrates 3 setup files from CJS/mixed syntax to clean ESM, updates 1 custom matcher file, and rewrites 30+ npm scripts. All 92 integration test files remain untouched — they use implicit globals and contain no Jest-specific imports or mock APIs.

## Technical Context

**Language/Version**: TypeScript ~5.7.3, Node.js 20.9.0 (Volta)
**Primary Dependencies**: Vitest (new), vite-tsconfig-paths (new), @vitest/ui (new)
**Storage**: N/A
**Testing**: Vitest (replacing Jest + ts-jest)
**Target Platform**: Node.js server-side (test runner for integration tests against Alkemio API)
**Project Type**: Monorepo workspace package (`server-api/` within pnpm workspaces)
**Performance Goals**: Functional parity with Jest — no performance targets beyond matching current test outcomes
**Constraints**: Migration scoped to `server-api/` only; `lib/` and `client-web/` must not be modified
**Scale/Scope**: 92 test files, 31 config files, 30+ npm scripts, 3 setup files, 2 type/matcher files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is a template (not yet customized with project-specific gates). No violations to check. The migration adheres to general principles:
- **Simplicity**: Consolidating 31 config files into 1 reduces complexity
- **Test integrity**: Zero changes to test logic (FR-002)
- **Scope isolation**: No changes outside server-api (FR-011, FR-012)

**Post-Phase 1 re-check**: Design maintains all gates. Single config file with named projects is simpler than 31 separate files. No new abstractions introduced.

## Project Structure

### Documentation (this feature)

```text
specs/002-jest-to-vitest/
├── plan.md                                    # This file
├── spec.md                                    # Feature specification
├── research.md                                # Phase 0: Technical research
├── data-model.md                              # Phase 1: Configuration entity model
├── quickstart.md                              # Phase 1: Migration quickstart guide
├── contracts/
│   ├── vitest-config-contract.md              # Vitest config structure and project definitions
│   ├── setup-files-contract.md                # Setup file migration contracts
│   └── dependency-changes-contract.md         # Dependency additions/removals
└── checklists/
    └── requirements.md                        # Specification quality checklist
```

### Source Code (repository root)

```text
server-api/
├── vitest.config.ts              # NEW: Single Vitest config (replaces 31 Jest configs)
├── package.json                  # MODIFIED: Scripts, dependencies
├── tsconfig.json                 # MODIFIED: types array
├── src/
│   ├── globalTestsSetup.ts       # MODIFIED: CJS→ESM exports
│   ├── setupTests.ts             # MODIFIED: require→import for ws
│   ├── vitest.setup.ts           # RENAMED: from jest.setup.ts
│   ├── utils/
│   │   └── array.matcher.ts      # MODIFIED: @jest/globals→vitest import
│   └── types/
│       └── vitest-extend.d.ts    # RENAMED: from jest-extend.d.ts, updated types
├── config/                       # DELETE: All 31 jest.config.*.mjs files
└── src/functional-api/           # UNCHANGED: All 92 .it-spec.ts test files
```

**Structure Decision**: No new directories created. The migration replaces `config/jest.config.*.mjs` (31 files) with a single `vitest.config.ts` at the package root.

## Complexity Tracking

No constitution violations. The migration reduces complexity:

| Metric | Before (Jest) | After (Vitest) |
|---|---|---|
| Config files | 31 | 1 |
| Test runner dependencies | 3 (`jest`, `ts-jest`, `@types/jest`) | 1 (`vitest`) |
| Setup file CJS/ESM mix | Mixed (CJS require + ESM import) | Pure ESM |
| Path alias configuration | Duplicated in jest.config + tsconfig | Single source (tsconfig via plugin) |

## Implementation Phases

### Phase 1: Core Infrastructure (vitest.config.ts + dependencies)

**Files**: `vitest.config.ts` (new), `package.json` (modified), `tsconfig.json` (modified)

1. Create `server-api/vitest.config.ts` with:
   - `vite-tsconfig-paths` plugin
   - `globals: true`, `environment: 'node'`
   - `testTimeout: 60_000` (per-test, 60s — generous for individual API calls)
   - `hookTimeout: 120_000` (per-hook, 120s — `beforeAll` hooks create multiple entities)
   - `globalSetup`, `setupFiles` chain
   - `reporters: ['default', 'html']` with timestamped output path (`report_${timestamp}.html`)
   - `project()` helper function that sets `globalSetup: []` per-project to prevent duplicate user registration
   - `projects` array with all 27 named domain projects + nightly composite (orphan `roleset-parallel` excluded)
   - See `contracts/vitest-config-contract.md` for full project definitions

2. Update `package.json` dependencies:
   - Add: `vitest@^4.0.18`, `vite-tsconfig-paths@^6.1.1`, `@vitest/ui@^4.0.18`
   - Remove: `@types/jest`, `ts-jest`, `jest-html-reporters`, `tsconfig-paths`
   - See `contracts/dependency-changes-contract.md`

3. Update `tsconfig.json`:
   - Change `"types": ["node", "jest"]` to `"types": ["node"]`
   - Vitest globals are resolved via the existing `typeRoots` mechanism: `./src/types/vitest-extend.d.ts` contains `/// <reference types="vitest/globals" />`, and `typeRoots` includes `./src/types`

### Phase 2: Setup File Migration

**Files**: `globalTestsSetup.ts`, `setupTests.ts`, `jest.setup.ts` → `vitest.setup.ts`

1. Migrate `globalTestsSetup.ts`:
   - Remove `require('tsconfig-paths/register')`
   - Convert `module.exports = async () =>` to `export default async function setup()`
   - Keep all registration logic unchanged

2. Migrate `setupTests.ts`:
   - Replace `(global as any).WebSocket = require('ws')` with ESM import
   - Remove now-unnecessary eslint-disable comments

3. Rename `jest.setup.ts` → `vitest.setup.ts`:
   - Logic unchanged (`expect.getState().testPath` works in Vitest v3+)
   - Update vitest.config.ts reference to new filename

### Phase 3: Custom Matcher & Type Migration

**Files**: `src/utils/array.matcher.ts`, `src/types/jest-extend.d.ts` → `vitest-extend.d.ts`

1. Update `array.matcher.ts`:
   - Replace `import { expect } from '@jest/globals'` with `import { expect } from 'vitest'`
   - Replace `namespace jest { interface Matchers<R> }` with `declare module 'vitest' { interface Matchers<T = any> }`
   - Matcher implementation body unchanged

2. Rename and update `jest-extend.d.ts` → `vitest-extend.d.ts`:
   - Replace Jest namespace with Vitest module augmentation
   - See `contracts/setup-files-contract.md`

### Phase 4: npm Scripts Migration

**Files**: `package.json`

1. Replace all 30+ test scripts from `jest --config ./config/jest.config.<x>.mjs` to `vitest run --project <name>`
2. Map flags: `--forceExit` → `--forceExit`, `--runInBand` → `--fileParallelism=false`, `--maxWorkers=N` → `--maxWorkers=N`
3. Update `test` script: `jest` → `vitest run`
4. Update `test:watch`: `jest --watch` → `vitest`
5. Update `test:debug` to use Vitest's debug configuration

### Phase 5: Cleanup

**Files**: All `config/jest.config.*.mjs` files, ESLint config

1. Delete all 31 files in `server-api/config/jest.config.*.mjs` (including `jest.config.preferences.jms`)
2. Remove commented-out Jest rules in `eslint.config.js` (lines 12-13)
3. Run `pnpm install` to clean up the lockfile

### Phase 6: Validation

1. Run `pnpm exec tsc --noEmit` from `server-api/` — TypeScript compilation must succeed
2. Run a single domain suite (e.g., `test:account`) — verify tests execute and pass
3. Run nightly suite — verify full test parity
4. Verify HTML report generation in `./html-report/`
5. Verify `pnpm --filter @alkemio/tests-lib run build` still works (no lib/ changes)
6. Verify no files modified in `lib/` or `client-web/` via `git diff --stat`

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Outcome |
|---|---|---|---|---|
| `expect.getState().testPath` undefined in beforeAll | Low | Low | Fallback to `task?.file?.filepath` or 'Unknown' | No issues — works in Vitest v4+ |
| WebSocket polyfill timing differs | Low | Medium | setupFiles runs before each test file, same as Jest | No issues — `setupFiles` execution order identical |
| Some domain glob patterns don't match exactly | Medium | Medium | Validate each project individually before nightly run | Pending validation (T014) |
| `vite-tsconfig-paths` doesn't resolve `@alkemio/tests-lib` workspace alias | Low | High | Fallback to explicit `resolve.alias` for workspace paths | No issues — plugin resolves correctly |
| HTML reporter output format differs from jest-html-reporters | Low | Low | Functionally equivalent; visual differences acceptable | Pending validation (T015) |
| `globalSetup` re-runs per project | Medium | High | Set `globalSetup: []` in each project override | Resolved — `project()` helper handles this |

## Implementation Status (2026-02-20)

| Phase | Status | Notes |
|---|---|---|
| Phase 1: Core Infrastructure | Complete | Vitest v4.0.18 installed, config created |
| Phase 2: Setup File Migration | Complete | All 3 files migrated to ESM |
| Phase 3: Custom Matcher & Types | Complete | Vitest module augmentation working |
| Phase 4: npm Scripts Migration | Complete | 30+ scripts rewritten |
| Phase 5: Cleanup | Complete | All 31 Jest configs deleted |
| Phase 6: Validation | **Partially complete** | TypeScript compiles; full test run pending |

### Deviations from Plan

See `spec.md` §Implementation Notes for the complete list of deviations. Key changes:
- Timeout strategy changed from single 30-min to granular 60s test / 120s hook
- tsconfig types via `typeRoots` reference directive instead of direct `types` array
- HTML report filenames are timestamped to preserve history
- `project()` helper prevents `globalSetup` from re-running per project
