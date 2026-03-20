# Feature Specification: Nightly Server-API Test Report with GitHub Pages

**Feature Branch**: `003-nightly-server-report`
**Created**: 2026-03-16
**Status**: Draft
**Input**: User description: "I want to make the nightly do a report and this report to be uploaded to the repo's GitHub Page, look at how the client-web nightly test is organized and do the same approach. The workflow is nightly-client-tests.yml"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Nightly Server-API Test Results on GitHub Pages (Priority: P1)

As a QA engineer or developer, I want to view the results of nightly server-API test runs in a browsable HTML report hosted on GitHub Pages, so that I can quickly assess the health of the API test suite without needing to dig through CI logs.

**Why this priority**: This is the core deliverable. Without the report being generated and published, the entire feature has no value.

**Independent Test**: Can be fully tested by triggering the workflow manually and verifying that a Vitest HTML report appears at the expected GitHub Pages URL under the `vitest/` path.

**Acceptance Scenarios**:

1. **Given** the nightly server-API workflow is triggered, **When** the test suite finishes (pass or fail), **Then** a Vitest HTML report is published to GitHub Pages under `vitest/<date>/<run_id>/`.
2. **Given** the tests have completed and the report is published, **When** a user navigates to the report URL, **Then** they see the full Vitest HTML report with test results, durations, and failure details.
3. **Given** the tests fail, **When** the workflow completes, **Then** the report is still published (test failures must not prevent report upload).

---

### User Story 2 - Browse Historical Test Run Index (Priority: P2)

As a QA engineer, I want to see an index page listing all historical nightly server-API test runs, so that I can compare results over time and identify trends or regressions.

**Why this priority**: Adds significant value on top of individual reports by providing a historical view, but the feature is still useful without it (individual reports are accessible by URL).

**Independent Test**: Can be tested by triggering the workflow multiple times and verifying that the index page at `vitest/index.html` lists all runs sorted newest-first with status indicators.

**Acceptance Scenarios**:

1. **Given** multiple nightly runs have been published, **When** a user visits the Vitest index page, **Then** they see all runs grouped by date (newest first), each with a status indicator, git commit SHA, and branch name.
2. **Given** a new nightly run completes, **When** the report is published, **Then** the index page is regenerated to include the new run while preserving all previous entries.

---

### User Story 3 - Workflow Mirrors Client-Web Pattern (Priority: P3)

As a DevOps maintainer, I want the server-API nightly workflow to follow the same structural pattern as the existing client-web nightly workflow (`nightly-client-tests.yml`), so that both workflows are consistent, easy to maintain, and reuse the same GitHub Pages deployment mechanism.

**Why this priority**: Consistency and maintainability matter, but the feature works regardless of how closely it mirrors the existing pattern.

**Independent Test**: Can be verified by comparing the workflow structure against `nightly-client-tests.yml` and confirming it reuses `deploy-github-pages.yml`.

**Acceptance Scenarios**:

1. **Given** the new workflow exists, **When** compared to `nightly-client-tests.yml` ("Nightly Playwright"), **Then** it follows the same two-job pattern: a `test` job (checkout gh-pages history, run tests, organize report, add metadata, generate index, commit to gh-pages) followed by a `deploy` job that calls `deploy-github-pages.yml` ("Deploy GitHub Pages (from branch)") with `ref: gh-pages` and `path: gh-pages-root`.
2. **Given** the workflow runs, **When** it deploys reports, **Then** the `deploy` job runs unconditionally and publishes alongside (not replacing) the Playwright reports.

---

### Edge Cases

- What happens when the `gh-pages` branch does not exist yet (first-ever run)? The workflow must handle initialization gracefully (same as client-web does with `continue-on-error` on gh-pages checkout).
- What happens when the server-API tests time out or crash entirely? The workflow must still attempt to publish whatever partial report exists.
- What happens when both the client-web and server-API workflows run concurrently and both try to push to `gh-pages`? The push may fail due to a conflict; the workflow should handle this gracefully.
- What happens when no tests match the nightly project (e.g., all test files removed)? The workflow should still complete and publish a report indicating zero tests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a GitHub Actions workflow file that runs the server-API nightly test suite and produces an HTML test report.
- **FR-002**: The system MUST publish the Vitest HTML report to GitHub Pages under the path `vitest/<date>/<run_id>/`, keeping it separate from existing Playwright reports under `playwright/`.
- **FR-003**: The system MUST preserve report history across runs by checking out the existing `gh-pages` branch content before adding new reports (incremental accumulation).
- **FR-004**: The system MUST generate a summary index page at `vitest/index.html` listing all historical runs grouped by date (newest first) with status indicators, commit SHA, and branch name.
- **FR-005**: The system MUST use a two-job workflow structure: a `test` job that runs tests and commits reports to `gh-pages`, followed by a separate `deploy` job that invokes the existing `deploy-github-pages.yml` ("Deploy GitHub Pages (from branch)") reusable workflow with `ref: gh-pages` and `path: gh-pages-root` — mirroring the exact pattern used in the "Nightly Playwright" workflow.
- **FR-006**: The `deploy` job MUST run unconditionally (regardless of test outcome) so that reports are published even when tests fail.
- **FR-007**: The system MUST store metadata for each run (run ID, date, branch, commit, test outcome) alongside the report.
- **FR-008**: The system MUST support manual triggering via `workflow_dispatch` (same as client-web workflow).
- **FR-009**: The system MUST generate or update a top-level `index.html` on the GitHub Pages site that links to both the Playwright and Vitest report index pages.

### Key Entities

- **Test Run Report**: An HTML report generated by Vitest for a single nightly run, identified by date and run ID.
- **Run Metadata**: Supplementary text files (run info, status, commit, branch) stored alongside each report for index generation.
- **Summary Index**: An auto-generated HTML page listing all historical test runs with navigation links and status.
- **GitHub Pages Site**: The `gh-pages` branch containing accumulated reports, served via GitHub Pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a workflow run, the nightly server-API test report is accessible via the GitHub Pages URL within 5 minutes of workflow completion.
- **SC-002**: The summary index page correctly lists 100% of historical runs with accurate status indicators (pass/fail).
- **SC-003**: Reports persist across workflow runs — previous reports remain accessible after new ones are added.
- **SC-004**: The workflow can be triggered manually and completes successfully, publishing a report regardless of test pass/fail outcome.
- **SC-005**: Both Playwright and Vitest reports coexist on the same GitHub Pages site without interfering with each other.

## Assumptions

- The existing `deploy-github-pages.yml` reusable workflow does not need modification — it already accepts `ref` and `path` inputs that work for this use case.
- The Vitest HTML reporter (already configured in `vitest.config.ts`) produces a self-contained HTML report directory that can be copied to GitHub Pages.
- The server-API nightly project in `vitest.config.ts` already defines the correct set of test files for the nightly run.
- The same GitHub org/repo variables and secrets used by the client-web workflow (ALKEMIO_SERVER, AUTH_TEST_HARNESS_PASSWORD, etc.) are available for the server-API workflow.
- The `gh-pages` branch and GitHub Pages are already configured for this repository (since client-web reports are already being published).
- The `arc-runner-set` GitHub Actions runner is available and has the necessary tooling (Node.js, pnpm) or the workflow will set them up.
