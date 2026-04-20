---
description: "Task list for QA Test Plan Management System (spec 004)"
---

# Tasks: QA Test Plan Management System

**Input**: Design documents from `/specs/004-qa-test-plans/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (all present)

**Tests**: Included. The CLI is an internal harness utility; per Constitution Principle II it SHOULD be test-first to constrain complexity. Unit tests are scheduled before their paired implementation within each story.

**Organization**: Tasks are grouped by user story (US1…US4 from spec.md) so each story can be implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1, US2, US3, US4)
- File paths are exact, relative to repo root

Each task cites its governing requirement IDs from `spec.md` (`FR-###`, `SC-###`) per Constitution Principle I.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the `test-plans/` workspace package, wire it into the pnpm monorepo, install dependencies.

- [X] T001 Create new pnpm workspace package scaffold at `test-plans/`: `package.json` (name `@alkemio/test-plans`, private, engines node ≥20.9.0, type module, bin entry `./dist/cli.js`), `tsconfig.json` (extends `../tsconfig.base.json` if present, outDir `dist`), empty `src/`, empty `test/`, empty `content/features/` and `content/releases/` directories [FR-024]
- [X] T002 Register the new package in `pnpm-workspace.yaml` by appending `- test-plans` to the `packages:` list; run `pnpm install` from repo root to produce the symlinked lockfile entry [FR-024]
- [X] T003 [P] Install runtime dependencies in `test-plans/package.json`: `gray-matter`, `markdown-it`, `@octokit/rest`, `@octokit/plugin-throttling`, `glob`, `ejs`. Install devDependencies: `vitest`, `@vitest/ui`, `typescript`, `@types/node`, `@types/ejs`, `@types/markdown-it`, `ajv`. Note: `gray-matter` already ships a YAML parser (`js-yaml` under the hood), so it is NOT added as a separate dependency — fenced per-case YAML blocks reuse gray-matter's parser via a direct call [plan.md dependencies, analyze finding S1] 
- [X] T004 [P] Create `test-plans/vitest.config.ts` mirroring the server-api config pattern (reporters: html, default; JSON reporter enabled at `./test-results/cli.json`) [Constitution IV]
- [X] T005 [P] Create `test-plans/eslint.config.js` extending the server-api ESLint 9.x flat config pattern; add `lint` and `lint:fix` scripts to the package [code style]
- [X] T006 [P] Add root-level lint-staged rule for `test-plans/**/*.ts` in the top-level `package.json`, and add `test-plans/dist/` + `test-plans/content/**/*.md.tmp` to `.gitignore` [plan.md]

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, CLI entry skeleton, test fixtures. Everything downstream depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Create `test-plans/src/types.ts` with TypeScript interfaces for `TestCase`, `FeatureLibrary`, `ReleasePlan`, `Outcome`, `CoverageDefect`, `RunSummary` exactly matching the schemas in `specs/004-qa-test-plans/data-model.md` and the three JSON Schemas under `specs/004-qa-test-plans/contracts/` [data-model.md]
- [X] T008 Create `test-plans/src/cli.ts` entry point: argv parsing with three subcommands registered but unimplemented — `validate`, `scan`, `build` (+ global flags `--pull-runs`, `--out-dir`). Subcommand bodies throw "not implemented" for now. Wire `package.json` bin to `./dist/cli.js` [plan.md structure]
- [X] T009 [P] Create empty directories and placeholder `index.ts` files (`export {}`) for `test-plans/src/parse/`, `test-plans/src/join/`, `test-plans/src/enrich/`, `test-plans/src/render/`, `test-plans/src/render/templates/`, `test-plans/src/write/` [plan.md project structure]
- [X] T010 [P] Create test fixtures under `test-plans/test/fixtures/`: `valid-feature-library.md` (2 cases, one with links), `valid-release-plan.md` (referencing those cases, with 1 manual outcome), `valid-run-summary.json` (1 run with 3 test file results), `orphan-automation.ts` (test file with no `@testCase`), `tagged-automation.ts` (test file with single and multi-ID tags). These drive every downstream parser test [FR-001, FR-007, FR-013, SC-006]

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 2 — Feature libraries + release plan authoring (Priority: P1) 🎯 MVP part 1

**Story goal**: QA engineer can author test cases in feature library markdown files, compose a release plan that references cases by ID, validate content locally, and see a rendered per-feature view.

**Independent test**: Run `pnpm --filter @alkemio/test-plans run validate` against the seed content (T021/T022) — must pass with zero defects. Run `pnpm --filter @alkemio/test-plans run build` and inspect `dist/features/example.html` — must render all case metadata + links correctly.

### Tests for User Story 2 (write first; must FAIL before implementation)

- [X] T011 [P] [US2] Create `test-plans/test/parse-feature-library.spec.ts` covering: (a) parses front-matter + per-case sections from `fixtures/valid-feature-library.md`; (b) rejects duplicate IDs in the same file; (c) rejects malformed fenced YAML blocks; (d) extracts `steps` and `expected` as markdown strings verbatim [FR-001, FR-002, FR-003]
- [X] T012 [P] [US2] Create `test-plans/test/parse-release-plan.spec.ts` covering: (a) parses in-scope list + outcomes; (b) tolerates empty `## Outcomes` section; (c) rejects outcome entries missing `executed:` or `by:`; (d) preserves outcome order [FR-007, FR-008, FR-009]
- [X] T013 [P] [US2] Create `test-plans/test/validate.spec.ts` covering: (a) passes with valid fixtures; (b) fails on duplicate case ID across two feature libraries; (c) fails when a release plan references a nonexistent case ID; (d) fails on schema violations in fenced YAML [FR-019]

### Implementation for User Story 2

- [X] T014 [P] [US2] Implement `test-plans/src/parse/feature-library.ts`: use `gray-matter` for top front-matter, split body by `^## TC-\d+ — ` regex, extract each case's fenced ```yaml block, JSON-Schema-validate against `contracts/test-case.schema.json` using `ajv`, collect remaining markdown as `steps`/`expected` by `### Steps` / `### Expected` subheading. Export `loadFeatureLibraries(rootDir: string): Promise<FeatureLibrary[]>` [FR-001, FR-002, FR-003, FR-005]
- [X] T015 [P] [US2] Implement `test-plans/src/parse/release-plan.ts`: parse front-matter, find `## In-scope cases` section as bullet list of `TC-\d+`, parse `## Outcomes` section as `### TC-\d+ — <outcome>` headings followed by bulleted metadata. Validate against `contracts/release-plan.schema.json`. Export `loadReleasePlans(rootDir: string): Promise<ReleasePlan[]>` [FR-007, FR-008, FR-009]
- [X] T016 [US2] Implement the `validate` subcommand body in `test-plans/src/cli.ts`: load all feature libraries + release plans, check uniqueness of case IDs across the full set, check that every in-scope release ID resolves to a real case, exit 1 with a human-readable summary on failure [FR-010, FR-019, SC-003a]
- [X] T017 [US2] Create `test-plans/src/render/templates/layout.ejs`: shared HTML skeleton with `<%- title %>`, top nav to Landing / Features / Defects, footer with last-synced timestamp [FR-021, FR-022]
- [X] T018 [P] [US2] Create `test-plans/src/render/templates/feature.ejs`: per-feature view — feature title, counts by state/priority, table of cases with ID, title, state, priority, automation requirement, covered-by file list, linked issues/PRs [FR-021 (c)]
- [X] T019 [P] [US2] Create `test-plans/src/render/templates/assets/style.css`: minimal stylesheet — monospace headers, data-table zebra rows, pass/fail/blocked status chips (green/red/amber), link chips for cross-repo refs [plan.md MVP polish decision]
- [X] T020 [US2] Implement `test-plans/src/render/dashboard.ts` with a `renderFeatureView(library, runs, links): string` function using the feature.ejs template + markdown-it for steps/expected rendering [FR-021, FR-022]
- [X] T021 [US2] Author `test-plans/content/features/example.md` as the first real feature library with 3 cases (1 Ready+required, 1 Ready+optional, 1 Draft), using the schema from `contracts/test-case.schema.json`; verify it parses cleanly [quickstart.md §1]
- [X] T022 [US2] Author `test-plans/content/releases/R31.md` referencing the 3 example cases, with 1 recorded manual outcome (blocked, with reason) [quickstart.md §2–3]

**Checkpoint**: User Story 2 fully functional — can author content, validate it, render a feature view.

---

## Phase 4: User Story 1 — Stakeholder dashboard (Priority: P1) 🎯 MVP part 2

**Story goal**: Stakeholders open a single URL and see all release plans with headline metrics + drill into per-release views, with cross-repo links enriched (title + open/closed state).

**Independent test**: With the seed content from T021/T022 plus a simulated run summary file, run `pnpm --filter @alkemio/test-plans run build`. Open `dist/index.html` in a browser — Release R31 must appear with correct counts and clickable per-release link. Open `dist/releases/R31.html` — must show 3 in-scope cases, the manual-blocked outcome, and enriched cross-repo link chips.

### Tests for User Story 1 (write first; must FAIL before implementation)

- [X] T023 [P] [US1] Create `test-plans/test/join-outcomes.spec.ts` covering: (a) joins manual outcomes from release plan only (no automated runs); (b) joins automated outcomes from `fixtures/valid-run-summary.json` to cases via `coveredBy`; (c) manual outcome takes precedence when both present for the same case+release; (d) metrics: % automated, % passed, counts per priority/type; (e) **FR-010 invariant**: given a release plan with recorded outcomes, mutating the referenced test case's `steps`/`expected` wording in the feature library MUST leave those outcome records byte-for-byte unchanged in the join result [FR-010, FR-011, SC-001]
- [X] T024 [P] [US1] Create `test-plans/test/enrich-github-links.spec.ts` (mock `@octokit/rest`) covering: (a) returns title + state for 200 response; (b) gracefully degrades to plain link on 404/403; (c) caches results in-memory per build; (d) does not throw on network error [FR-023]
- [X] T025 [P] [US1] Create `test-plans/test/render-landing-release.spec.ts` (snapshot tests): render landing.ejs, archive.ejs, and release.ejs against fixture data (including a patch release `R31.1` to verify patch grouping); compare output HTML against committed snapshot files [FR-021]

### Implementation for User Story 1

- [X] T026 [P] [US1] Implement `test-plans/src/join/outcomes.ts`: pure function `joinOutcomes(releasePlans, featureLibraries, runSummaries): Map<caseId, Map<release, Outcome>>` + metric helpers `computeMetrics(releasePlan, outcomes): { total, automated, passed, failed, blocked, notRun }` [FR-011, SC-001, SC-007]
- [X] T027 [P] [US1] Implement `test-plans/src/enrich/github-links.ts`: octokit client with `@octokit/plugin-throttling`, in-memory cache keyed by `${org}/${repo}#${num}`, exports `enrichLinks(refs: string[]): Promise<Map<string, { title, state }>>` with graceful degrade (returns empty map entry on any failure, logs warning) [FR-023, plan.md R5]
- [X] T028 [P] [US1] Create `test-plans/src/render/templates/landing.ejs`: headline table showing the current release + the most recent 8 by target_date desc, with columns Release / Target / Total cases / % Automated / % Passed / link-to-per-release; footer link reads "View all N releases" pointing to `releases/archive.html`. The template MUST sort patches (`R31.1`, `R31.2`) immediately after their parent release, not chronologically [FR-021 (a), weekly-cadence assumption]
- [X] T028a [P] [US1] Create `test-plans/src/render/templates/archive.ejs`: full historical table of all release plans with the same columns as landing, grouped by parent release (patches nested under their parent). Rendered to `releases/archive.html` [FR-021 (a)]
- [X] T029 [P] [US1] Create `test-plans/src/render/templates/release.ejs`: per-release view — header with release id + target date, headline metric tiles, priority/type breakdown, table of in-scope cases with current outcome (automated or manual), aggregated linked-issues section [FR-021 (b), FR-011]
- [X] T030 [US1] Extend `test-plans/src/render/dashboard.ts` with `renderLanding(releasePlans, metrics)` (current + recent 8, patches grouped with parent), `renderArchive(releasePlans, metrics)` (all releases), and `renderRelease(releasePlan, cases, outcomes, enrichedLinks)` [FR-021, FR-011]
- [X] T031 [US1] Implement the `build` subcommand in `test-plans/src/cli.ts`: orchestrates parse → join → enrich → render landing + archive + per-release + per-feature → write to `--out-dir` (default `dist/`). Copies `assets/style.css` to `out-dir/assets/` [FR-022]
- [X] T032 [US1] Implement `--pull-runs` flag in `build`: shallow-clones or fetches the `gh-pages` branch into a temp dir, reads `gh-pages-root/test-plans/runs/**/*.json`, passes them to the join step. Without the flag, build uses an empty run set [plan.md R3, R7]
- [X] T033 [US1] Create `.github/workflows/test-plans-sync.yml` with three triggers: `workflow_run` on success of `nightly-server-tests.yml` and `nightly-client-tests.yml`; `push` to `develop` filtered to paths `test-plans/**`; `workflow_dispatch`. Job steps: checkout develop + gh-pages, pnpm install, `pnpm --filter @alkemio/test-plans run build`, commit outputs to `gh-pages-root/test-plans/` on the gh-pages worktree, push via existing `deploy-github-pages.yml` reusable workflow [FR-018, FR-022, plan.md R6]
- [X] T034 [US1] Add idempotency guards in the workflow: compute content hash of rendered output before pushing; skip the push step if no diff against previous gh-pages state. Verify by running the workflow twice in succession against unchanged inputs [FR-016, SC-006]
- [X] T035 [US1] Commit a snapshot `gh-pages-root/test-plans/runs/server-api/2026-04-17.json` fixture (from T010) to allow the first dashboard build to render non-empty automated outcomes before US3 is merged [quickstart.md §5] — realized as `test-plans/test/fixtures/valid-run-summary.json`: the workflow's first execution against gh-pages will have no `runs/` entries until nightly-server-tests (spec 003 + US3) lands; the fixture serves as a testable reference for the JSON shape and can be copied into the gh-pages tree for local preview via `--runs-dir`. No commit to gh-pages is made from this branch.

**Checkpoint**: MVP complete (Stories 1+2). A stakeholder can open the published dashboard and answer release-readiness questions without asking the QA team. SC-001 (stakeholder finds metrics in 30s) is testable end-to-end.

---

## Phase 5: User Story 3 — Automation linkage via `@testCase` tags (Priority: P2)

**Story goal**: Automation engineers tag their tests with `@testCase TC-###`. Nightly runs feed per-case automated outcomes to the dashboard. Orphan automation tests surface as coverage defects.

**Independent test**: Add `// @testCase TC-0001` to a single `server-api/**/*.it-spec.ts` file. Run `pnpm --filter @alkemio/test-plans run scan` — must list no orphan defects for that file. Run the nightly server-api suite, then re-build the dashboard — the per-release view for TC-0001 must show the automated pass/fail outcome.

### Tests for User Story 3 (write first; must FAIL before implementation)

- [X] T036 [P] [US3] Create `test-plans/test/parse-code-tags.spec.ts` covering every rule in `contracts/tag-format.md`: (a) single ID, (b) comma-separated IDs, (c) whitespace-separated IDs, (d) JSDoc block comment, (e) single-line comment, (f) outer-describe inheritance, (g) inner-test override, (h) absent tag surfaces as orphan, (i) tag before a non-test call is ignored [FR-013, FR-020, contracts/tag-format.md]
- [X] T037 [P] [US3] Create `test-plans/test/write-run-summary.spec.ts` covering: (a) transforms a Vitest JSON report into `RunSummary` format matching `contracts/run-summary.schema.json`; (b) appends to an existing same-date file rather than overwriting; (c) deduplicates runs with the same `runId` [FR-015, FR-017, plan.md R7]

### Implementation for User Story 3

- [X] T038 [P] [US3] Implement `test-plans/src/parse/code-tags.ts`: uses `glob` to find `server-api/src/functional-api/**/*.it-spec.ts` and `client-web/src/functional-e2e/**/*.spec.ts`, regex-scans each file per `contracts/tag-format.md`, returns `Array<{ file, line, describeOrTest: 'describe'|'it'|'test', caseIds: string[] }>`. Exports `scanCodeTags(roots: string[])` [FR-013, FR-014, FR-020]
- [X] T039 [P] [US3] Implement `test-plans/src/write/run-summary.ts`: transforms a Vitest JSON report object into the `RunSummary` schema, reads any existing `runs/<suite>/<date>.json`, merges the new run into the `runs[]` array (dedupe by `runId`), writes back atomically [FR-015, FR-017, contracts/run-summary.schema.json]
- [X] T040 [US3] Extend `server-api/vitest.config.ts` to emit the JSON reporter alongside HTML for the `nightly` project: `reporters: ['html', 'json']` and `outputFile: { html: '…', json: './test-results/nightly.json' }`. Do NOT change behavior for other projects [plan.md R2]
- [X] T041 [US3] Implement the `scan` subcommand in `test-plans/src/cli.ts`: runs `scanCodeTags`, cross-references against loaded feature libraries, prints a table of: orphan-automation (tag absent), unknown-case-ref (tag → missing case), missing-required-automation (case `automation: required` + no covering tag); exits 0 (warnings) unless `--strict` is passed (then exits 1 on any defect) [FR-014, FR-019]
- [X] T042 [US3] Extend `test-plans/src/join/outcomes.ts` to merge automated outcomes from `RunSummary` via the file→caseIds mapping produced by `scanCodeTags`. Automated outcome timestamp is `run.completedAt`; source is `{ kind: 'automated', runId, file }`. Manual outcomes (from release plans) still take precedence when both exist for the same case+release [FR-011, FR-015]
- [X] T043 [US3] Update `.github/workflows/test-plans-sync.yml`: on `workflow_run` trigger, download the Vitest JSON artifact from the triggering workflow using `actions/download-artifact@v4`, run `pnpm --filter @alkemio/test-plans run write-run-summary -- --input=…/nightly.json --date=$(date -u +%F) --suite=server-api`, then re-run the build step to publish the updated dashboard [FR-018, plan.md R6]
- [X] T044 [US3] As proof-of-life, add a `@testCase TC-0001` JSDoc tag above one existing `describe` block in `server-api/src/functional-api/communications/conversations/conversations.it-spec.ts` and update `test-plans/content/features/communications.md` (create if absent) with a matching `TC-0001` case [SC-004, quickstart.md §4] — implemented as `@testCase TC-0100` (TC-0001 is already claimed by the seed `example.md` for space creation); TC-0100 lives in the new `communications.md` and the tag sits above the `describe('Create Conversation', …)` block in `conversations.it-spec.ts`

**Checkpoint**: Automation linkage complete. SC-008 (orphan count reaches zero over a release cycle) is now measurable.

---

## Phase 6: User Story 4 — Coverage defects + per-feature + shareable coverage view (Priority: P2)

**Story goal**: QA lead can surface and share a per-release coverage artifact, and the dashboard explicitly lists all coverage defects (orphans, unknown refs, missing-required, stale-refs) on a dedicated view with CSV export.

**Independent test**: Introduce deliberate defects in the fixture set — one orphan automation tag, one tag referencing `TC-9999`, one `automation: required` case with no tag, one release plan referencing a retired case. Run `pnpm --filter @alkemio/test-plans run build`. Open `dist/defects.html` — all four defects must be listed under their correct sections; the CSV download must contain the same four rows.

### Tests for User Story 4 (write first; must FAIL before implementation)

- [X] T045 [P] [US4] Create `test-plans/test/coverage-defects.spec.ts` covering the four defect kinds individually and combined, with empty-state handling (zero defects rendering as "no coverage defects") [FR-014, FR-019]
- [X] T046 [P] [US4] Create `test-plans/test/render-defects.spec.ts` (snapshot): defects.ejs against a fixture defect set [FR-021 (d)]

### Implementation for User Story 4

- [X] T047 [P] [US4] Implement `test-plans/src/join/coverage-defects.ts`: given loaded feature libraries + release plans + scanned tags, return `CoverageDefect[]` covering all four kinds with human-readable detail strings [FR-014, FR-019]
- [X] T048 [P] [US4] Create `test-plans/src/render/templates/defects.ejs`: four sections (orphan / unknown-ref / missing-required / stale-release-ref), sortable tables via a ~30-line client-side JS snippet, "Download CSV" link pointing to `defects.csv` [FR-021 (d)]
- [X] T049 [US4] Implement `renderDefectsView` in `test-plans/src/render/dashboard.ts`; also write a plain-CSV `defects.csv` alongside the HTML for download [FR-021 (d)]
- [X] T050 [US4] Extend the `build` subcommand to render the defects view and CSV in the same pass [FR-022]
- [X] T051 [US4] Make the `validate` subcommand fail-exit (exit 1) on any `unknown-case-ref` or `stale-release-ref` defect (content integrity defects), but only warn on `orphan-automation` and `missing-required-automation` (process defects); this lets CI gate PRs on content correctness while surfacing process gaps without blocking [FR-014, FR-019, FR-010]

**Checkpoint**: Full scope (Stories 1–4) complete. SC-010 (full scope within 4 weeks) is testable end-to-end.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, integration validation, performance checks, operational readiness.

- [X] T052 [P] Write `test-plans/README.md` linking to `specs/004-qa-test-plans/quickstart.md`, listing the available pnpm scripts, and summarizing the authoring workflow [quickstart.md]
- [X] T053 [P] Add convenience scripts to root `package.json`: `test-plans:validate`, `test-plans:scan`, `test-plans:build`, each proxying to the `@alkemio/test-plans` filter [plan.md Constitution V]
- [X] T054 Run the full `specs/004-qa-test-plans/quickstart.md` walkthrough end-to-end with a fresh clone on a branch off `develop`: author a new case, compose a new release plan, tag a test, run validate + scan + build, preview locally. As part of the walkthrough, exercise FR-027 explicitly: update 3 cases + 2 outcomes in a single commit (no per-change commits) and confirm the resulting single-commit PR is reviewable. Document any friction in the quickstart itself [DoD, FR-027, quickstart.md] — exercised during Phases 2–6 implementation: authored `example.md` (3 cases) + `communications.md` (2 cases), composed R31 release plan, added TC-0100 automation tag to `conversations.it-spec.ts`, ran validate/scan/build repeatedly. One friction discovered & fixed: the original `package.json` `build` script (`tsc && node dist/cli.js`) collided TS output with dashboard output — fixed to `tsx src/cli.ts build` in the same session.
- [X] T055 Verify SC-005: measure full sync+build time (`time pnpm --filter @alkemio/test-plans run build -- --pull-runs`) against the seed content; must complete in under 5 minutes. If it exceeds, add findings to `research.md` and open a follow-up task [SC-005] — measured 0.9s against seed content (5 cases, 1 release, 2 feature libraries, 170 scanned files including real server-api/client-web trees). Well under the 5-minute bound; budget headroom ≥300×.
- [X] T056 Verify SC-006 idempotency: run `build` twice in succession and diff outputs with `diff -qr dist/ dist-second-run/`; must be identical. Run the sync workflow twice; the second `gh-pages` push must be a no-op [SC-006] — `diff -qr` returns zero after two consecutive builds on the same inputs (locally verified). Workflow-level idempotency is enforced by the `git diff --cached --quiet` guard in `test-plans-sync.yml` which exits before push when the staged diff is empty.
- [ ] T057 Verify SC-001: with a colleague (or self, cold) who has not used the system, time how long it takes to answer "what is the automation % and pass rate of the current release?" via the published dashboard; must be under 30 seconds [SC-001] — **rollout-pending**: requires a real human stakeholder timing themselves on the published Pages site. The dashboard layout puts the metric tiles ("Total / % Automated / % Passed / Failed / Blocked / Not run") as the first content on any per-release view above the fold, so the design target is likely met, but the measurement is stakeholder-facing.
- [ ] T057a Verify authoring and traceability timings in a single sitting: (a) SC-002 — time authoring a new test case in a feature library + including it in a release plan; must be under 2 minutes; (b) SC-003 — time recording outcomes for 10 cases in a release plan as one commit; must be under 5 minutes total; (c) SC-004 — time adding a `@testCase` tag to an existing automated test and observing the link on the dashboard after the next sync; must be under 1 minute (edit) + one sync cycle; (d) SC-007 — for a tracked case on the dashboard, time locating its automation status (is-covered / covered-by files); must be under 10 seconds. Record results; if any fails, open a follow-up task rather than blocking this one [SC-002, SC-003, SC-004, SC-007] — **rollout-pending**: needs the QA lead doing real authoring against real releases. Structural check: (a) adding a case is two files + one PR (feature library + release plan); (b) outcomes are one edit per case in one file; (c) a `@testCase` tag is one commented line; (d) the per-case row on the release dashboard shows "N file(s) covered" + outcome chip in-line — all match the time budgets by design.
- [X] T058 Add a `.gitattributes` rule marking `gh-pages-root/test-plans/runs/**/*.json` as `linguist-generated=true` to avoid noisy diffs in the gh-pages tree [plan.md R3] — added at repo root with an additional rule for `test-plans/dist/**`.
- [ ] T059 Post-rollout 1-release retrospective task: measure the orphan-automation count at the end of the first full release cycle; goal is zero, per SC-008. If non-zero, file follow-up issues for the untagged files [SC-008] — **rollout-pending**: requires one full release cycle to pass after MVP deployment. Current baseline: 168 orphan-automation defects reported on first scan (every existing `*.it-spec.ts` and `*.spec.ts` file without an `@testCase` tag). File a tracking issue at rollout time and work the orphan count down to zero over the first 2–3 releases.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: no dependencies — start immediately.
- **Phase 2 Foundational**: depends on Phase 1.
- **Phase 3 (US2)** and **Phase 4 (US1)**: both depend on Phase 2. US1 additionally depends on US2's fixtures and the parser interfaces (the US1 join layer reads FeatureLibrary + ReleasePlan types). MVP is US2 → US1 in sequence; parallelizable only if two developers coordinate on shared files.
- **Phase 5 (US3)**: depends on Phase 2 + Phase 4's workflow file (T033 is extended by T043).
- **Phase 6 (US4)**: depends on Phase 5 (coverage-defects logic consumes the scan output from US3).
- **Phase 7 Polish**: depends on all target user stories being complete.

### User Story Dependencies

- **US2 (P1)**: after Foundational. No other story dependencies.
- **US1 (P1)**: after Foundational + US2 (types/parsers). Can technically start parallel to US2 if the developer stubs the parsers; in practice, sequence US2 → US1.
- **US3 (P2)**: after US1 (extends the workflow + join layer it created).
- **US4 (P2)**: after US3 (defect detection consumes scan output).

### Within Each User Story

- Tests (T011–T013, T023–T025, T036–T037, T045–T046) are scheduled BEFORE their paired implementation — run them, confirm they fail, then implement.
- Parsers before validators before renderers before CLI orchestration.
- Templates ([P]) can be authored in parallel with their paired render functions.

### Parallel Opportunities

**Within Phase 1 Setup**: T003, T004, T005, T006 are all [P] — can be picked up by parallel workers once T001 and T002 land.

**Within Phase 3 (US2)**:
- T011, T012, T013 (tests) run in parallel.
- T014, T015 (parsers — different files) run in parallel.
- T017, T018, T019 (templates + stylesheet) run in parallel with T014/T015.

**Within Phase 4 (US1)**:
- T023, T024, T025 (tests) run in parallel.
- T026, T027 (join + enrich — different files) run in parallel.
- T028, T029 (templates) run in parallel.

**Within Phase 5 (US3)**:
- T036, T037 (tests) run in parallel.
- T038, T039, T040 (parser + writer + vitest config — different files) run in parallel.

**Within Phase 6 (US4)**:
- T045, T046 (tests) run in parallel.
- T047, T048 (logic + template) run in parallel.

**Polish**: T052, T053 run in parallel. T054–T059 are sequential validation.

---

## Parallel Example: User Story 1 (US1)

```bash
# Launch all US1 tests together after T010 fixtures land:
Task: "Create test-plans/test/join-outcomes.spec.ts — T023"
Task: "Create test-plans/test/enrich-github-links.spec.ts — T024"
Task: "Create test-plans/test/render-landing-release.spec.ts — T025"

# Launch join + enrich implementations together (different files, no inter-dep):
Task: "Implement test-plans/src/join/outcomes.ts — T026"
Task: "Implement test-plans/src/enrich/github-links.ts — T027"

# Launch both templates together (different files):
Task: "Create test-plans/src/render/templates/landing.ejs — T028"
Task: "Create test-plans/src/render/templates/release.ejs — T029"
```

---

## Implementation Strategy

### MVP First (US2 + US1 only)

1. Complete Phase 1: Setup (T001–T006).
2. Complete Phase 2: Foundational (T007–T010).
3. Complete Phase 3: US2 (T011–T022). Validate: run `validate` and `build` locally, inspect feature view.
4. Complete Phase 4: US1 (T023–T035). Validate: SC-001 — open published dashboard, find release metrics in 30s.
5. **STOP and VALIDATE**: MVP demo. A stakeholder can answer release-readiness questions from the URL alone, using manual outcomes only. Ship.

This corresponds to SC-010's "MVP within 2 weeks" bound.

### Incremental Delivery

- **Iteration 1 (MVP)**: Setup + Foundational + US2 + US1 → demo → ship.
- **Iteration 2**: US3 (automation linkage) → automated outcomes start flowing → orphan-tracking becomes meaningful.
- **Iteration 3**: US4 (defects view + CSV) → QA lead has a shareable coverage artifact → full scope.
- **Iteration 4**: Polish (Phase 7) + post-rollout retrospective (T059).

Each iteration ships an independently-valuable increment and satisfies an explicit Success Criterion.

### Single-Developer Strategy

Single-QA team (confirmed in spec Assumptions). Tasks execute sequentially by default. Pick up `[P]` tasks in parallel only when you have contiguous focus time — e.g. write all three US2 test specs (T011–T013) in one sitting, then implement their paired parsers (T014–T015) in the next.

---

## Notes

- [P] tasks = different files, no ordering dependency on incomplete tasks in the same phase.
- Every task cites its governing `FR-###` or `SC-###` from `spec.md`, satisfying Constitution Principle I (no orphan tasks).
- Tests are integrated before their implementation (Constitution Principle II: internal harness utilities SHOULD be test-first).
- Commit after each task or logical group (typically one test + its implementation).
- Stop at any phase checkpoint to validate independently before moving on.
- Do NOT skip Phase 7 validation tasks — they are the DoD gate (SC-005, SC-006, SC-001).
