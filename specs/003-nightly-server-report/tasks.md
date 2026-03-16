# Tasks: Nightly Server-API Test Report

**Input**: Design documents from `/specs/003-nightly-server-report/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Not explicitly requested — no test tasks included.

**Organization**: Tasks are grouped by user story. Since the deliverable is a single workflow file (`.github/workflows/nightly-server-tests.yml`), tasks build up the file incrementally. Each phase adds a testable layer.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Create the workflow file skeleton with trigger and job structure

- [ ] T001 Create workflow file `.github/workflows/nightly-server-tests.yml` with `name: Nightly Server API`, `on: workflow_dispatch` trigger, and two empty jobs: `test` (runs-on: `arc-runner-set`, permissions: `contents: write`) and `deploy` (with `if: ${{ always() }}`, `needs: test`, `uses: ./.github/workflows/deploy-github-pages.yml`, inputs `ref: gh-pages`, `path: gh-pages-root`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add environment setup steps to the `test` job that all subsequent steps depend on

- [ ] T002 Add source checkout step to `test` job using `actions/checkout@v5` in `.github/workflows/nightly-server-tests.yml`
- [ ] T003 Add gh-pages history checkout step with `continue-on-error: true` using `actions/checkout@v5` with `ref: gh-pages`, `path: out`, `fetch-depth: 1` in `.github/workflows/nightly-server-tests.yml`
- [ ] T004 Add pnpm setup (`pnpm/action-setup@v4`) and Node.js setup (`actions/setup-node@v6` with `node-version: 20.19.6`) steps in `.github/workflows/nightly-server-tests.yml`
- [ ] T005 Add `pnpm install --frozen-lockfile` step in `.github/workflows/nightly-server-tests.yml`
- [ ] T006 Add run folder variables step that sets `RUN_DATE` (from `date +'%Y-%m-%d'`) and `RUN_ID` (from `${{ github.run_id }}`) as `GITHUB_ENV` vars in `.github/workflows/nightly-server-tests.yml`

**Checkpoint**: Workflow skeleton with environment setup complete — can be triggered manually to verify steps pass

---

## Phase 3: User Story 1 - View Nightly Server-API Test Results on GitHub Pages (Priority: P1) MVP

**Goal**: Run nightly Vitest tests and publish the HTML report to GitHub Pages under `vitest/<date>/<run_id>/`

**Independent Test**: Trigger workflow via `gh workflow run nightly-server-tests.yml`, wait for completion, verify Vitest HTML report is accessible at `https://<org>.github.io/<repo>/vitest/<date>/<run_id>/`

### Implementation for User Story 1

- [ ] T007 [US1] Add test execution step with `id: vitest`, `continue-on-error: true`, env vars (`ALKEMIO_SERVER`, `ALKEMIO_SERVER_URL`, `ALKEMIO_BASE_URL`, `KRATOS_ENDPOINT`, `AUTH_TEST_HARNESS_PASSWORD`, `MAIL_SLURPER_ENDPOINT`, `ALKEMIO_SERVER_WS`, `ALKEMIO_SERVER_REST`) mapped from `${{ vars.* }}` / `${{ secrets.* }}`, running `pnpm --filter @alkemio/test-suite-server-api run test:nightly` in `.github/workflows/nightly-server-tests.yml`
- [ ] T008 [US1] Add outcome capture step (`if: ${{ always() }}`) that sets `VITEST_OUTCOME=${{ steps.vitest.outcome }}` in `GITHUB_ENV` in `.github/workflows/nightly-server-tests.yml`
- [ ] T009 [US1] Add report organization step that creates `out/gh-pages-root/vitest/$RUN_DATE/$RUN_ID/` and copies `server-api/html-report/*` into it in `.github/workflows/nightly-server-tests.yml`
- [ ] T010 [US1] Add metadata generation step that writes `runinfo.txt` (run ID, date, branch, commit, vitest outcome), `status.txt` ("passed"/"failed"), `commit.txt` (full SHA), and `branch.txt` (branch name) to the report directory in `.github/workflows/nightly-server-tests.yml`
- [ ] T011 [US1] Add gh-pages commit step (`if: ${{ always() }}`) that initializes git repo in `out/` if needed, configures `github-actions[bot]` user, adds all files, commits with message `"Update Vitest report: ${RUN_DATE}/${RUN_ID}"`, and pushes to `gh-pages` — mirroring the pattern from `nightly-client-tests.yml` lines 174-196 in `.github/workflows/nightly-server-tests.yml`
- [ ] T012 [US1] Add final step that fails the job if vitest tests failed (`if: ${{ steps.vitest.outcome == 'failure' }}`, `run: exit 1`) in `.github/workflows/nightly-server-tests.yml`

**Checkpoint**: Workflow publishes a Vitest HTML report to GitHub Pages. MVP is functional.

---

## Phase 4: User Story 2 - Browse Historical Test Run Index (Priority: P2)

**Goal**: Generate a summary index page listing all historical runs with status indicators

**Independent Test**: Trigger workflow multiple times, verify `vitest/index.html` lists all runs grouped by date (newest first) with correct status icons, commit SHA, and branch name

### Implementation for User Story 2

- [ ] T013 [US2] Add Vitest summary index generation step that creates `out/gh-pages-root/vitest/index.html` — iterating over all `vitest/<date>/<run_id>/` directories to build an HTML page with runs grouped by date (newest first), showing status icon, link to report, short commit SHA, and branch name. Include "Back to main index" link to `../`. Mirror the HTML/CSS structure from `nightly-client-tests.yml` lines 101-171 in `.github/workflows/nightly-server-tests.yml`
- [ ] T014 [US2] Add top-level index generation step that creates/updates `out/gh-pages-root/index.html` linking to both `playwright/index.html` ("Playwright nightly results") and `vitest/index.html` ("Vitest nightly results") with matching CSS styling in `.github/workflows/nightly-server-tests.yml`

**Checkpoint**: Historical index page works. Both Playwright and Vitest indexes are navigable from the top-level page.

---

## Phase 5: User Story 3 - Workflow Mirrors Client-Web Pattern (Priority: P3)

**Goal**: Ensure structural consistency with `nightly-client-tests.yml` for maintainability

**Independent Test**: Compare the new workflow against `nightly-client-tests.yml` and verify it follows the same two-job pattern with identical step ordering and deploy job configuration

### Implementation for User Story 3

- [ ] T015 [US3] Review and validate the complete workflow file `.github/workflows/nightly-server-tests.yml` against `nightly-client-tests.yml` for structural consistency: verify two-job pattern (test + deploy), step ordering (checkout → gh-pages checkout → pnpm → node → install → tests → capture outcome → organize report → metadata → index → commit → fail-on-error), deploy job with `if: always()` and `needs: test`, and `uses: ./.github/workflows/deploy-github-pages.yml` with correct inputs. Fix any deviations.

**Checkpoint**: Workflow is structurally consistent with the client-web pattern.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T016 Validate the complete workflow by dry-reading all steps in `.github/workflows/nightly-server-tests.yml` for YAML syntax correctness, proper indentation, correct env var references, and no hardcoded secrets
- [ ] T017 Verify the workflow coexists with Playwright reports by confirming all Vitest paths use `vitest/` prefix (not `playwright/`) and that the gh-pages commit does not remove existing `playwright/` content in `.github/workflows/nightly-server-tests.yml`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — creates the file skeleton
- **Foundational (Phase 2)**: Depends on Phase 1 — adds environment setup steps
- **US1 (Phase 3)**: Depends on Phase 2 — adds test execution and report publishing
- **US2 (Phase 4)**: Depends on Phase 3 — adds index generation (needs report directory structure to exist)
- **US3 (Phase 5)**: Depends on Phases 3+4 — validates final structure
- **Polish (Phase 6)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 being complete (needs the report directory structure and metadata files to generate the index)
- **User Story 3 (P3)**: Depends on US1 and US2 being complete (validates the full workflow structure)

### Within Each Phase

Since all tasks modify the same file (`.github/workflows/nightly-server-tests.yml`), tasks within each phase are **sequential** — no parallel opportunities within phases. However, T013 and T014 (US2) add independent workflow steps and could theoretically be written in parallel.

### Parallel Opportunities

- T013 and T014 are [P]-eligible (different workflow steps, independent HTML generation)
- All other tasks are sequential (same file, dependent on prior steps)

---

## Parallel Example: User Story 2

```bash
# These two steps are independent and can be implemented in parallel:
Task T013: "Generate vitest/index.html summary page"
Task T014: "Generate top-level index.html"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001) — workflow skeleton
2. Complete Phase 2: Foundational (T002-T006) — environment setup
3. Complete Phase 3: User Story 1 (T007-T012) — test execution + report publishing
4. **STOP and VALIDATE**: Trigger workflow, verify report appears on GitHub Pages
5. This is a fully functional, deployable MVP

### Incremental Delivery

1. Setup + Foundational → Workflow skeleton with env setup
2. Add US1 (T007-T012) → Test + publish reports → **MVP deployed**
3. Add US2 (T013-T014) → Historical index pages → Enhanced navigation
4. Add US3 (T015) → Structural validation → Consistency confirmed
5. Polish (T016-T017) → Final validation

---

## Notes

- All tasks modify a single file: `.github/workflows/nightly-server-tests.yml`
- Reference `nightly-client-tests.yml` as the structural template throughout
- The Vitest HTML report is copied from `server-api/html-report/*` (dynamic timestamp path)
- User registration is automatic via Vitest `globalSetup` — no separate workflow step needed
- Env vars map from GitHub org/repo variables and secrets (same as client-web workflow)
- Commit after each phase for incremental progress
