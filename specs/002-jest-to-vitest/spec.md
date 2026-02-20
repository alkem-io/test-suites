# Feature Specification: Migrate server-api from Jest to Vitest

**Feature Branch**: `002-jest-to-vitest`
**Created**: 2026-02-19
**Implemented**: 2026-02-20
**Status**: Implemented (pending validation)
**Input**: User description: "I would like to migrate the current test framework Jest to Vitest. The migration to be done only in the project server-api, and nowhere else."

## Implementation Notes (2026-02-20)

All implementation phases (1-8) are complete. The following deviations from the original spec were made during implementation — all improvements over the original design:

1. **Timeout preserved**: Both `testTimeout` and `hookTimeout` are set to `1_800_000` (30 min), matching the original Jest baseline per FR-008. Integration tests make sequential API calls against a live server and need this headroom, especially under CI load.
2. **TypeScript type resolution**: Instead of `"types": ["node", "vitest/globals"]` in tsconfig.json, the types are resolved via the existing `typeRoots` mechanism — `vitest-extend.d.ts` includes `/// <reference types="vitest/globals" />`. This works correctly with the custom `typeRoots` configuration.
3. **Timestamped HTML reports**: Output path uses `./html-report/report_${timestamp}.html` instead of the static `./html-report/report.html`, preventing previous reports from being overwritten.
4. **Project helper function**: A `project()` helper in `vitest.config.ts` sets `globalSetup: []` per-project to prevent user registration from re-running for each named project (only the root triggers `globalSetup`).
5. **roleset-parallel removed**: The orphan `roleset-parallel` project (identified in CHK007) was correctly excluded from the final config.
6. **Dependency versions resolved**: `vitest@^4.0.18`, `@vitest/ui@^4.0.18`. Path aliases resolved via `resolve.alias` (no `vite-tsconfig-paths` dependency needed).
7. **New script**: `test:nightly:ui` added — runs the nightly suite with Vitest's interactive UI (`vitest --project nightly --maxWorkers=1 --ui`).

Pending validation: T012a (full test suite run), T014/T014a (domain script spot-checks), T015 (HTML report generation).

## Clarifications

### Session 2026-02-19

- Q: What is the nature of the server-api tests — do they use Jest mocking APIs? → A: The server-api tests are integration tests only. They call an external Alkemio API and verify the results. No local mocking (`jest.fn()`, `jest.spyOn()`, `jest.mock()`) is used in any test file. The only Jest-specific import is `{ expect } from '@jest/globals'` in one utility file (`array.matcher.ts`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run All Existing Integration Tests with Vitest (Priority: P1)

As a QA engineer, I want all existing server-api integration tests to execute using Vitest so that I can validate the Alkemio platform with a faster, more modern test runner without losing any test coverage.

**Why this priority**: This is the core deliverable. If the 90+ existing `.it-spec.ts` integration test files do not pass under Vitest, the migration is incomplete.

**Independent Test**: Can be fully tested by running the full nightly test suite under Vitest and verifying that every test that previously passed with Jest also passes with Vitest.

**Acceptance Scenarios**:

1. **Given** the server-api package has been migrated to Vitest, **When** a developer runs the nightly test suite, **Then** all previously passing integration tests pass with identical outcomes.
2. **Given** a developer runs a single domain test suite (e.g., communications, account, search), **When** the suite completes, **Then** results match the pre-migration outcomes.
3. **Given** the migration is complete, **When** a developer inspects the test output, **Then** test names, suite groupings, and failure messages remain clear and actionable.

---

### User Story 2 - Use Domain-Specific Test Commands (Priority: P1)

As a QA engineer, I want to continue running domain-specific test suites (e.g., `test:communications`, `test:account`, `test:search`) through familiar npm script commands so that my existing workflows and CI pipelines remain functional.

**Why this priority**: The server-api project has 30+ domain-specific npm scripts. Developers and CI rely on these for targeted test runs. Breaking these commands would disrupt daily workflows.

**Independent Test**: Can be tested by running each domain-specific npm script and verifying it executes the correct subset of tests.

**Acceptance Scenarios**:

1. **Given** a domain-specific test script exists (e.g., `test:account`), **When** a developer runs `pnpm --filter @alkemio/test-suite-server-api run test:account`, **Then** only the tests matching that domain are executed.
2. **Given** the nightly suite is configured, **When** it runs with `test:nightly`, **Then** it executes all domain test files with a single worker, matching the previous behavior.
3. **Given** scripts that control parallelism (e.g., `--maxWorkers=6`), **When** migrated to Vitest, **Then** equivalent concurrency controls are in place.

---

### User Story 3 - Preserve Test Setup and Teardown Behavior (Priority: P1)

As a QA engineer, I want the global setup (user registration in Kratos/Alkemio), per-suite setup (WebSocket polyfill, logging), and custom matchers to work identically under Vitest so that integration tests interact correctly with the live Alkemio platform.

**Why this priority**: The server-api tests rely on a global setup phase that registers test users in Kratos and Alkemio. The WebSocket polyfill and custom `toContainObject` matcher are used across many tests. Any regression here would cause widespread test failures.

**Independent Test**: Can be tested by running any test suite that requires authenticated users and verifying that global setup completes successfully and custom matchers produce correct assertions.

**Acceptance Scenarios**:

1. **Given** the global setup is configured for Vitest, **When** the test runner starts, **Then** test users are registered in Kratos and Alkemio exactly as before.
2. **Given** a test uses the `toContainObject` custom matcher, **When** the test executes, **Then** the matcher behaves identically to its Jest implementation.
3. **Given** a test requires WebSocket support, **When** the test runs, **Then** the global WebSocket polyfill is active.

---

### User Story 4 - Isolated Migration Scope (Priority: P2)

As a project maintainer, I want the migration to affect only the `server-api` package so that `lib/` and `client-web/` continue to work exactly as they do today without any changes.

**Why this priority**: The monorepo has three packages. The `lib/` package is a shared dependency, and `client-web/` uses Playwright + Jest. Changing them is out of scope and could introduce unintended regressions.

**Independent Test**: Can be tested by verifying that `lib/` builds successfully and `client-web/` tests pass without any modifications to those packages.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** `pnpm --filter @alkemio/tests-lib run build` is executed, **Then** the lib package builds successfully without changes.
2. **Given** the migration is complete, **When** `client-web/` tests are run, **Then** they pass without any modifications to that package.
3. **Given** the workspace dependency graph, **When** a developer inspects `lib/` and `client-web/`, **Then** no files in those packages have been modified.

---

### User Story 5 - HTML Test Reporting (Priority: P3)

As a QA engineer, I want test results to continue generating HTML reports so that I can review test outcomes in a visual format after nightly runs.

**Why this priority**: The existing Jest configuration uses `jest-html-reporters` for generating visual test reports. While not critical for test execution, reports are part of the QA workflow.

**Independent Test**: Can be tested by running the nightly suite and verifying an HTML report file is generated in the expected output directory.

**Acceptance Scenarios**:

1. **Given** a test suite run completes, **When** the developer checks the output directory, **Then** an HTML report file is generated with test results.
2. **Given** the report is generated, **When** the developer opens it, **Then** it displays test names, pass/fail status, and durations.

---

### Edge Cases

- How does the migration handle the `require('ws')` polyfill in `setupTests.ts` given Vitest's native ESM support?
- What happens when a test relies on `expect.getState().testPath` (used in `jest.setup.ts`) — does Vitest provide an equivalent API?
- How are path aliases (e.g., `@generated/*`, `@utils/*`) resolved without `ts-jest` and `pathsToModuleNameMapper`?
- What happens to `globalSetup` using `module.exports` (CommonJS) in an ESM project under Vitest?
- How are the 30 domain-specific Jest config files (each with unique `testRegex` patterns) represented in the Vitest configuration?
- How is the single `@jest/globals` import in `array.matcher.ts` updated to use the Vitest equivalent?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The migration MUST replace Jest with Vitest as the test runner for the `server-api` package only
- **FR-002**: All existing `.it-spec.ts` integration test files MUST execute and pass under Vitest without changes to test logic or assertions. These tests call an external Alkemio API and verify responses — they contain no local mocking (`jest.fn()`, `jest.spyOn()`, `jest.mock()`)
- **FR-003**: The global setup phase (user registration in Kratos/Alkemio) MUST execute before any tests run, matching current behavior
- **FR-004**: The WebSocket polyfill (`global.WebSocket = require('ws')`) MUST remain functional under Vitest
- **FR-005**: The custom `toContainObject` matcher MUST work identically under Vitest's `expect.extend` API
- **FR-006**: All 30+ domain-specific npm scripts (e.g., `test:account`, `test:communications`) MUST continue to work, executing only their targeted test files
- **FR-007**: Test concurrency controls (single worker for nightly, parallel workers for specific suites) MUST be preserved
- **FR-008**: The test timeout of 30 minutes (1,800,000 ms) MUST be configurable and applied to all integration tests
- **FR-009**: Path aliases (`@generated/*`, `@utils/*`, `@common/*`, `@functional-api/*`, `@src/*`, `@alkemio/tests-lib`) MUST resolve correctly under Vitest
- **FR-010**: HTML test reporting MUST be available, either via an equivalent Vitest reporter or a compatible alternative
- **FR-011**: The `lib/` and `client-web/` packages MUST remain completely unmodified
- **FR-012**: The migration MUST NOT require changes to the shared `@alkemio/tests-lib` library
- **FR-013**: Jest-specific dependencies (`@types/jest`, `ts-jest`, `jest-html-reporters`) MUST be removed from `server-api` after migration
- **FR-014**: The `tsconfig.json` types array MUST be updated to reference Vitest types instead of Jest types
- **FR-015**: Pre-existing test utilities (`sortArraysInObject`, `expectEqualIgnoringArrayOrder`) MUST continue to function correctly
- **FR-016**: The single utility file importing from `@jest/globals` (`array.matcher.ts`) MUST be updated to use the Vitest equivalent

### Assumptions

- All server-api tests are pure integration tests that call an external Alkemio API — no local mocking is used anywhere in the test files
- Vitest's `expect` API is compatible with the Jest `expect` extensions used in the project (custom matchers via `expect.extend`)
- Vitest can run in Node environment mode, which is required for server-side integration tests
- The ESM module system (`"type": "module"`) in `server-api/package.json` is natively supported by Vitest without additional configuration
- Vitest's `globalSetup` feature supports async setup functions equivalent to Jest's `globalSetup`
- The `workspace:*` dependency on `@alkemio/tests-lib` will continue to resolve via pnpm workspaces without changes
- No Jest compatibility layer is needed since test files do not use Jest-specific mock APIs

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of previously passing integration test files pass under Vitest with no changes to test assertion logic
- **SC-002**: All 30+ domain-specific npm test scripts execute successfully, running only their targeted test subsets
- **SC-003**: The nightly test suite completes with results equivalent to the Jest baseline (same pass/fail outcomes)
- **SC-004**: No files in `lib/` or `client-web/` are modified as part of this migration
- **SC-005**: Jest-related dependencies are fully removed from `server-api/package.json` after migration
- **SC-006**: HTML test reports are generated after test suite runs, containing pass/fail status and test durations
- **SC-007**: The global setup phase (user registration) completes successfully before test execution begins
