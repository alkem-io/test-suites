# Tasks: Migrate server-api from Jest to Vitest

**Input**: Design documents from `/specs/002-jest-to-vitest/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not applicable — this migration does not add new functionality. The existing 92 `.it-spec.ts` integration test files serve as the validation suite.

**Organization**: Tasks are grouped by user story to enable incremental verification. Due to the sequential nature of a framework migration, user stories have implicit dependencies (setup must work before tests can run, tests must run before domain scripts can be verified).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths are relative to `server-api/` unless explicitly noted otherwise. The migration touches **only** the `server-api/` workspace package.

---

## Phase 1: Setup (Dependencies)

**Purpose**: Install Vitest and remove Jest dependencies

- [x] T001 Add Vitest devDependencies to `server-api/package.json`: add `vitest` (latest), `vite-tsconfig-paths` (latest), `@vitest/ui` (latest). Use `pnpm add -D vitest vite-tsconfig-paths @vitest/ui --filter @alkemio/test-suite-server-api`
- [x] T002 Remove Jest devDependencies from `server-api/package.json`: remove `@types/jest`, `ts-jest`, `jest-html-reporters`, `tsconfig-paths`. Use `pnpm remove @types/jest ts-jest jest-html-reporters tsconfig-paths --filter @alkemio/test-suite-server-api`
- [x] T003 Run `pnpm install` from repo root to update the lockfile and verify no resolution errors

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core configuration that MUST be complete before ANY user story can be verified

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Update `server-api/tsconfig.json`: change `"types": ["node", "jest"]` to `"types": ["node"]` and add `/// <reference types="vitest/globals" />` in `vitest-extend.d.ts` (custom typeRoots prevented direct types array resolution). This enables TypeScript to recognize Vitest global types (`describe`, `it`, `expect`, `beforeAll`, etc.)
- [x] T005 Create `server-api/vitest.config.ts` with the complete Vitest configuration. Must include: `vite-tsconfig-paths` plugin, `environment: 'node'`, `globals: true`, `testTimeout: 1_800_000`, `globalSetup: './src/globalTestsSetup.ts'`, `setupFiles: ['./src/setupTests.ts', './src/vitest.setup.ts']`, `reporters: ['default', 'html']`, `outputFile: { html: './html-report/report.html' }`, `include: ['src/**/*.it-spec.ts']`, and the complete `projects` array with all 30 named domain projects plus the nightly composite project. Refer to `specs/002-jest-to-vitest/contracts/vitest-config-contract.md` for the full project definitions table and nightly include patterns

**Checkpoint**: Vitest installed, configured, and TypeScript types aligned

---

## Phase 3: User Story 3 — Preserve Test Setup and Teardown Behavior (Priority: P1)

**Goal**: Migrate the three setup files and custom matcher from Jest/CJS patterns to Vitest/ESM so that global setup (user registration), WebSocket polyfill, logging, and custom matchers work identically under Vitest.

**Independent Test**: Run any test suite requiring authenticated users and verify global setup completes, WebSocket is available, and `toContainObject` matcher works.

**Why US3 before US1**: Setup files must be functional before any tests can execute. This is the foundation that US1 depends on.

### Implementation for User Story 3

- [x] T006 [US3] Migrate `server-api/src/globalTestsSetup.ts`: Remove line 4 `require('tsconfig-paths/register')` (no longer needed — `vite-tsconfig-paths` handles alias resolution). Convert `module.exports = async () => {` (line 16) to `export default async function setup() {`. Keep all user registration logic (lines 17-41) completely unchanged. Remove the `require` eslint-disable comment on line 1. Refer to `specs/002-jest-to-vitest/contracts/setup-files-contract.md` for the exact before/after contract
- [x] T007 [P] [US3] Migrate `server-api/src/setupTests.ts`: Replace `(global as any).WebSocket = require('ws')` (line 5) with ESM import: add `import WebSocket from 'ws'` at the top, then `(globalThis as any).WebSocket = WebSocket`. Remove the eslint-disable comments for `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-require-imports` (lines 1-2) since they're no longer needed
- [x] T008 [P] [US3] Rename `server-api/src/jest.setup.ts` to `server-api/src/vitest.setup.ts`. The file contents remain unchanged — `expect.getState().testPath` works in Vitest v3+ `beforeAll` hooks (confirmed in research.md section 2). The `vitest.config.ts` already references `./src/vitest.setup.ts` in `setupFiles`
- [x] T009 [P] [US3] Migrate `server-api/src/utils/array.matcher.ts`: Replace `import { expect } from '@jest/globals'` (line 4) with `import { expect } from 'vitest'`. Replace the Jest namespace declaration (lines 6-12) with Vitest module augmentation: change `declare global { namespace jest { interface Matchers<R> { toContainObject(argument: any): R; } } }` to `import 'vitest'; declare module 'vitest' { interface Matchers<T = any> { toContainObject(argument: any): T; } }`. The `expect.extend()` implementation (lines 14-39) and utility functions `sortArraysInObject` and `expectEqualIgnoringArrayOrder` (lines 46-85) remain completely unchanged
- [x] T010 [P] [US3] Rename `server-api/src/types/jest-extend.d.ts` to `server-api/src/types/vitest-extend.d.ts` and update contents: Replace `declare global { namespace jest { interface Matchers<R> { toContainObject(argument: any): R; } } }` with `import 'vitest'; declare module 'vitest' { interface Matchers<T = any> { toContainObject(argument: any): T; } }`. Keep the `export {}` at the end

**Checkpoint**: All setup files use ESM syntax, custom matcher uses Vitest imports. Ready for test execution.

---

## Phase 4: User Story 1 — Run All Existing Integration Tests with Vitest (Priority: P1) MVP

**Goal**: Verify that all existing integration tests execute and pass under Vitest with zero changes to test files.

**Independent Test**: Run `vitest run` from server-api/ and confirm all previously passing tests pass.

### Implementation for User Story 1

- [x] T011 [US1] Update the base `test` script in `server-api/package.json`: change `"test": "jest"` to `"test": "vitest run"`. Also update `"test:watch": "jest --watch"` to `"test:watch": "vitest"` (Vitest runs in watch mode by default without `run`)
- [x] T012 [US1] Verify TypeScript compilation succeeds: run `cd server-api && pnpm exec tsc --noEmit`. Fix any type errors caused by the Jest→Vitest type migration. Common issues: missing `vitest/globals` types, stale `.tsbuildinfo` cache (delete `server-api/.tsbuildinfo` if needed)
- [ ] T012a [US1] Run the full test suite to validate all tests pass: execute `cd server-api && pnpm exec vitest run` and confirm all 92 test files pass. Compare results against the pre-migration Jest baseline. This validates SC-001. If any tests fail, investigate setup file issues (Phase 3) or config issues (Phase 2) before proceeding

**Checkpoint**: `vitest run` executes tests successfully. TypeScript compiles without errors. This is the MVP — all tests run under Vitest.

---

## Phase 5: User Story 2 — Use Domain-Specific Test Commands (Priority: P1)

**Goal**: Migrate all 30+ npm test scripts to use Vitest CLI with `--project` flags, preserving domain targeting and concurrency controls.

**Independent Test**: Run 2-3 domain scripts (e.g., `test:account`, `test:search`, `test:nightly`) and verify they execute only their targeted test files with correct concurrency.

### Implementation for User Story 2

- [x] T013 [US2] Rewrite all test scripts in `server-api/package.json` to use Vitest CLI. Apply these transformations for each script: replace `jest --config ./config/jest.config.<x>.mjs` with `vitest run --project <name>`, replace `--forceExit` with `--forceExit`, replace `--runInBand` with `--fileParallelism=false`, keep `--maxWorkers=N` as-is (Vitest supports the same flag). Update `test:debug` to `node --inspect-brk node_modules/vitest/vitest.mjs run --fileParallelism=false`. Refer to `specs/002-jest-to-vitest/contracts/vitest-config-contract.md` Flag Mapping table for the complete mapping. The full script list (30+ entries) is in `server-api/package.json` lines 29-61
- [ ] T014 [US2] Verify domain script invocations by spot-checking: run `pnpm --filter @alkemio/test-suite-server-api run test:account` and confirm only account tests are selected. Run `pnpm --filter @alkemio/test-suite-server-api run test:nightly --dry-run` (or check Vitest output) and confirm it picks up the correct multi-domain file list
- [ ] T014a [US2] Run the complete nightly suite to validate SC-003: execute `pnpm --filter @alkemio/test-suite-server-api run test:nightly` and confirm all domain tests execute with a single worker and results match the pre-migration Jest nightly baseline

**Checkpoint**: All domain-specific npm scripts invoke Vitest with correct project targeting and concurrency flags.

---

## Phase 6: User Story 5 — HTML Test Reporting (Priority: P3)

**Goal**: Verify that HTML test reports are generated after test runs, using Vitest's built-in `html` reporter.

**Independent Test**: Run any test suite and check that `server-api/html-report/report.html` is generated.

### Implementation for User Story 5

- [ ] T015 [US5] Verify HTML report generation: run a small test suite (e.g., `test:configuration`) and confirm that `server-api/html-report/report.html` is created. Open the report and verify it displays test names, pass/fail status, and durations. The reporter is already configured in T005 (vitest.config.ts). If the report is not generated, verify `@vitest/ui` is installed and the `reporters` and `outputFile` config in vitest.config.ts matches the contract

**Checkpoint**: HTML reports generate successfully with test results.

---

## Phase 7: User Story 4 — Isolated Migration Scope (Priority: P2)

**Goal**: Confirm that no files outside `server-api/` were modified during the migration.

**Independent Test**: Verify `lib/` builds and no files in `lib/` or `client-web/` are in the git diff.

### Implementation for User Story 4

- [x] T016 [US4] Verify lib/ builds with no changes: run `pnpm --filter @alkemio/tests-lib run build` from repo root and confirm success. This validates that the `@alkemio/tests-lib` workspace dependency still resolves correctly after Jest removal
- [x] T017 [US4] Verify scope isolation: run `git diff --name-only` and confirm that no files under `lib/` or `client-web/` appear in the output. Only `server-api/` files should be modified

**Checkpoint**: Migration is fully isolated to server-api/. Other packages are unaffected.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Remove legacy Jest artifacts and clean up

- [x] T018 Delete all 31 Jest configuration files from `server-api/config/`: remove `jest.config.mjs`, `jest.config.account.mjs`, `jest.config.activity-logs.mjs`, `jest.config.callouts.mjs`, `jest.config.communication.mjs`, `jest.config.configuration.mjs`, `jest.config.contributor-management.mjs`, `jest.config.documents.mjs`, `jest.config.entitlements.mjs`, `jest.config.innovation-hub.mjs`, `jest.config.innovation-pack.mjs`, `jest.config.innovationPacks.mjs`, `jest.config.integration.mjs`, `jest.config.journey.mjs`, `jest.config.lifecycle.mjs`, `jest.config.lookup.mjs`, `jest.config.nightly.mjs`, `jest.config.notifications.mjs`, `jest.config.notifications-callouts.mjs`, `jest.config.notifications-community.mjs`, `jest.config.notifications-messaging.mjs`, `jest.config.organization.mjs`, `jest.config.pagination.mjs`, `jest.config.platform.mjs`, `jest.config.preferences.jms`, `jest.config.roleset.mjs`, `jest.config.roleset-parallel.mjs`, `jest.config.search.mjs`, `jest.config.storage.mjs`, `jest.config.subscriptions.mjs`, `jest.config.templates.mjs`. Use: `rm server-api/config/jest.config.*`
- [x] T019 Clean up ESLint config in `server-api/eslint.config.js`: remove the commented-out Jest rules on lines 12-13 (`// 'jest/no-focused-tests': 'warn'` and `// 'jest/no-identical-title': 'error'`)
- [x] T020 Final cleanup: run `pnpm install` from repo root to ensure lockfile is clean. Verify there are no remaining references to `jest` in `server-api/` source files by searching for `@jest/globals`, `ts-jest`, `jest-html-reporters` across `server-api/src/` and `server-api/package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T003 must complete before T004/T005)
- **US3 (Phase 3)**: Depends on Phase 2 — setup files need vitest.config.ts to reference them
- **US1 (Phase 4)**: Depends on Phase 3 — tests can't run without setup files working
- **US2 (Phase 5)**: Depends on Phase 4 — scripts can't be verified if tests don't run
- **US5 (Phase 6)**: Depends on Phase 4 — reporter needs test execution to generate output
- **US4 (Phase 7)**: Can run after Phase 2 — but most useful as final verification
- **Polish (Phase 8)**: Depends on all user stories being verified

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US3: Setup/Teardown)
                                               ↓
                                           Phase 4 (US1: Run Tests) ← MVP
                                               ↓           ↓
                                    Phase 5 (US2: Scripts)  Phase 6 (US5: Reports)
                                               ↓           ↓
                                           Phase 7 (US4: Scope Verification)
                                               ↓
                                           Phase 8 (Polish: Cleanup)
```

### Within Phase 3 (US3): Parallel Opportunities

- T006 (globalTestsSetup.ts) must complete first — it's the entry point
- T007, T008, T009, T010 are all [P] — they modify different files and can run in parallel

### Within Phase 5 (US2): No Parallelism

- T013 and T014 are sequential (T013 rewrites scripts, T014 verifies them)

---

## Parallel Example: Phase 3 (US3)

```bash
# First, complete T006 (globalSetup migration):
Task: "Migrate server-api/src/globalTestsSetup.ts from CJS to ESM"

# Then launch T007, T008, T009, T010 in parallel (different files):
Task: "Migrate server-api/src/setupTests.ts WebSocket polyfill"
Task: "Rename server-api/src/jest.setup.ts → vitest.setup.ts"
Task: "Migrate server-api/src/utils/array.matcher.ts imports"
Task: "Rename server-api/src/types/jest-extend.d.ts → vitest-extend.d.ts"
```

---

## Implementation Strategy

### MVP First (US3 + US1)

1. Complete Phase 1: Setup (install deps)
2. Complete Phase 2: Foundational (config + tsconfig)
3. Complete Phase 3: US3 (setup files)
4. Complete Phase 4: US1 (verify tests run)
5. **STOP and VALIDATE**: Run `vitest run` — all tests should pass
6. This is the MVP — the test runner works

### Incremental Delivery

1. Setup + Foundational → Vitest installed and configured
2. US3 (setup files) → Setup chain works under Vitest
3. US1 (run tests) → **MVP! All tests pass** → Can demo
4. US2 (domain scripts) → All 30+ domain commands work → CI-ready
5. US5 (HTML reports) → Reports generate → QA workflow complete
6. US4 (scope check) → Verified isolation → Merge-ready
7. Polish (cleanup) → Jest artifacts removed → Clean codebase

---

## Notes

- [P] tasks = different files, no dependencies — safe to parallelize
- [Story] label maps task to specific user story for traceability
- No test-writing tasks needed — existing 92 `.it-spec.ts` files ARE the validation suite
- The migration has zero changes to test file contents (FR-002)
- Commit after each phase for clean git history
- Phase 4 (US1) checkpoint is the key decision point: if tests pass, migration is viable
- If tests fail at Phase 4, investigate before proceeding (likely setup file or config issue)
