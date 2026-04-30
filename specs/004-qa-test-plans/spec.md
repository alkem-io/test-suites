# Feature Specification: QA Test Plan Management System

**Feature Branch**: `004-qa-test-plans`
**Created**: 2026-04-17
**Status**: Draft
**Input**: Test plan management system for QA traceability and stakeholder visibility. Tracks test cases as version-controlled markdown documents in this repository (one per feature), composes per-release test plans by reference (`R<N>` weekly, `R<N>.<patch>` for hotfixes), links automation back to cases via an in-code `@testCase` tag, joins automated run outcomes into a static dashboard published to the existing GitHub Pages site, and surfaces coverage defects explicitly. No new SaaS, no external tracker, no custom backend — the repository is the source of truth. MVP ships in 2 weeks. *(This Input field captures the final design after /specify clarification; the original prompt proposed GitHub Issues + Milestones + Projects and was superseded during clarification on 2026-04-17.)*

**Requirement numbering convention**: This spec uses `FR-###` for functional requirements and `SC-###` for success criteria, consistent with specs 001 and 003 in this repo. The project constitution's Principle I literally mandates `R-###`; the FR-### / SC-### split is a pre-existing convention across all specs, not a 004-specific deviation. A separate constitution amendment PR should reconcile the literal wording; this spec does not redefine the principle.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stakeholder views release test plan at a glance (Priority: P1)

A Product Manager or engineering lead opens a single dashboard for an upcoming or in-progress release and immediately sees: how many test cases are planned, how many are automated, how many have passed in the most recent run, how many are blocked, and which are still manual-only. They do this without asking the QA team for a status update.

**Why this priority**: This is the core value of the feature. Every other capability exists to feed this dashboard. Without P1, the project has no payoff for non-QA stakeholders.

**Independent Test**: With a single release plan containing a handful of manually-created test cases (some marked automated, some not, some with pass/fail outcomes from a prior run), a stakeholder who has never used the tool can reach the release dashboard, read off automation percentage and pass rate within 30 seconds, and identify which test cases are blocking sign-off.

**Acceptance Scenarios**:

1. **Given** a release plan "Release R31" with 40 test cases (25 automated, 15 manual; last nightly run: 22 passed, 3 failed, 15 untested), **When** a stakeholder opens the release dashboard, **Then** they see the counts broken down by status and automation within a single screen.
2. **Given** a release plan with no associated test cases, **When** a stakeholder opens the dashboard, **Then** they see an explicit "no test cases yet" state rather than an empty or confusing view.
3. **Given** a test case marked Blocked, **When** the dashboard is opened, **Then** the test case is visually distinct from Passing/Failing/Untested cases.

---

### User Story 2 - QA engineer authors test cases in a feature library and composes a release test plan (Priority: P1)

A QA engineer maintains, per feature, a single markdown document containing that feature's test cases (each with a stable ID, title, steps, expected outcome, priority, type, optional owner, and links to related issues/PRs in other repositories within the same GitHub organization). When planning a release, the engineer creates a release test plan document that **references** a curated subset of cases by ID — e.g. "for Release R31, include TC-2, TC-5 from Communications and TC-7, TC-9 from Space Conversion" — and records per-case execution outcomes for that release alongside the references. Editing the definition of a case happens in exactly one place (the feature library); all release plans that reference it automatically reflect the update.

**Why this priority**: Without the ability to author cases and compose release plans, the dashboard has nothing to display. P1 alongside Story 1. The edit-once-reference-everywhere model directly addresses the QA team's concern about maintaining duplicate copies across releases.

**Independent Test**: A QA engineer with no prior setup can author a feature test library with 10 cases, compose a release test plan referencing 5 of those by ID, record outcomes on 3 of them, edit the wording of one case in the library, and confirm both that the change propagates to the rendered release plan view and that the outcomes previously recorded are not disturbed.

**Acceptance Scenarios**:

1. **Given** an existing feature library file, **When** the QA engineer adds a new test case to it with a stable ID, **Then** the case is discoverable across the system, is eligible for inclusion in any release plan, and appears on the dashboard's "all cases" view.
2. **Given** a case TC-5 referenced by the Release R31 plan and also by Release R32 plan (regression), **When** the QA engineer edits the case's steps in the feature library, **Then** both release plan views render the updated steps without any further action, and no previously-recorded execution outcomes for either release are lost or altered.
3. **Given** a release plan referencing TC-5 with no outcome yet recorded, **When** the QA engineer manually executes the test and records the result (pass / fail / blocked) with a date, **Then** that outcome appears in the Release R31 plan view and is never leaked into other release plans.
4. **Given** a test case the QA engineer wants to retire, **When** they mark it retired in the feature library, **Then** existing historical release plan entries continue to render with the case's final wording and outcomes, but the case no longer appears as eligible for inclusion in new release plans.
5. **Given** a test case with links to bug issues `alkem-io/server#4567` and a feature story `alkem-io/product#1234` in its front-matter, **When** the dashboard renders the case, **Then** each link is shown as a clickable reference with (where feasible) the target issue's title and open/closed state.

---

### User Story 3 - Automation engineer links a test file to test cases (Priority: P2)

An engineer who has just written or updated an automated test adds a lightweight, in-code tag that references one or more test case IDs (e.g. `TC-123`, `TC-124`). On the next nightly run (or on merge to the main integration branch), the referenced test case(s) automatically reflect "automated" status, the file path, and the latest pass/fail outcome — without any manual linking step.

**Why this priority**: This is the traceability backbone. It can be deferred past the P1 MVP because stakeholders can still get value from manually-maintained "automated: yes/no" flags in the short term, but without this the tool quickly falls out of date.

**Independent Test**: Starting from a test file with no tag, an engineer adds the tag referencing an existing test case ID, commits, and merges. The automated sync job runs, and the referenced test case reflects "Automated", the correct file path, and the outcome from the latest run — with no manual step.

**Acceptance Scenarios**:

1. **Given** a test file tagged with `TC-123`, **When** the sync job runs, **Then** test case TC-123 records the file path and the latest outcome.
2. **Given** a test file tagged with `TC-123, TC-124` (multiple cases), **When** the sync job runs, **Then** both cases are updated with the same file path and outcome.
3. **Given** the sync job runs twice in succession without source changes, **When** the second run completes, **Then** no duplicate entries are produced for the test case and no human-owned content is modified (idempotent).
4. **Given** a tag references a nonexistent test case ID, **When** the sync job runs, **Then** the job surfaces a coverage defect on the dashboard (an `unknown-case-ref` entry) but does not fail the sync.
5. **Given** a previously-tagged test file has its tag removed or is deleted, **When** the sync job runs, **Then** the affected test case is marked as no longer automated and the stale reference is cleaned up.

---

### User Story 4 - QA lead surfaces coverage defects and exports shareable coverage data (Priority: P2)

The QA lead opens a dedicated "coverage defects" view listing every orphan automation test, every tag pointing at a nonexistent case, every `automation: required` case with no covering test, and every release plan referencing a retired case — all sortable, each row linking back to the source file or case. From that same view, they download a CSV snapshot to attach to release-readiness emails or share with stakeholders who prefer a flat table over a live page. The per-release headline metrics (total cases, % automated, % passed, priority breakdown, failing list, blocked list) are already covered by User Story 1's per-release dashboard view — US4 does not duplicate them.

**Why this priority**: A live defects view converts "coverage gaps" from tribal knowledge into visible, actionable rows. CSV export lets the QA lead hand off a static artifact without screenshotting. P2 because Story 1 already delivers the primary per-release visibility; US4 is the gap-hunting + hand-off layer.

**Independent Test**: Introduce deliberate coverage defects (one of each kind) in the content and code. Run the build. The defects view must list all four rows under the correct sections, and the downloaded CSV must contain the same four rows. No false positives; empty state renders an explicit "no coverage defects" message.

**Acceptance Scenarios**:

1. **Given** a content set with one orphan automation test, one tag referencing `TC-9999`, one `automation: required` case with no covering tag, and one release plan referencing a retired case, **When** the build runs, **Then** the defects view lists exactly those four rows under their respective sections with correct file paths and case IDs.
2. **Given** a content set with zero coverage defects, **When** the build runs, **Then** the defects view renders an explicit "No coverage defects — all tracked cases are covered by automation and all references resolve" state.
3. **Given** a defects view with N rows, **When** the QA lead clicks "Download CSV", **Then** they receive a `defects.csv` file with N rows plus a header, suitable for attaching to emails, opening in spreadsheets, or feeding into downstream tooling.

---

### Edge Cases

- A test case ID is referenced in code but never defined in any feature library (typo, premature reference). Surfaces as a coverage defect.
- A test case ID is referenced in a release test plan but the case has since been retired or deleted from the feature library. The release plan view must surface the stale reference and allow the QA engineer to repair it.
- Two different test files reference the same test case ID (one case covered by multiple tests — tolerated and surfaced).
- The nightly run itself fails before producing results — previous-known-good outcomes vs. missing outcomes must be distinguishable on the dashboard.
- A test case's wording is edited in the feature library after outcomes have been recorded against it in a prior release plan. Prior outcomes must remain intact; the dashboard must render the current wording alongside those outcomes without retroactive confusion.
- A test case appears in both an in-progress release plan (R31) and a future one (R32). Outcomes recorded for R31 must not leak into R32's view, and vice versa.
- A cross-repo link (`alkem-io/server#4567`) targets a repo the dashboard builder cannot read (private repo, missing token). The dashboard must render the link as a plain clickable reference rather than failing the build.
- A test file is moved or renamed between the tag being written and the sync running — the case should reflect the new path on the next sync, and no duplicate stale entry should remain.
- A test case is retired while still referenced by automation. The orphan check must clarify that the case is retired (not missing) and flag the stale tag for cleanup.

## Requirements *(mandatory)*

### Functional Requirements

**Test case authoring and lifecycle (feature library)**

- **FR-001**: System MUST support authoring test cases in per-feature library documents. Each feature MUST have at most one library document, in which one or more test cases are defined.
- **FR-002**: Each test case MUST have, at minimum: a stable ID, title, description / steps, expected outcome, priority, type (functional / integration / e2e / other), optional owner, and a lifecycle state.
- **FR-003**: System MUST assign every test case a stable, human-readable identifier (e.g., `TC-###`) that never changes for the life of the case, even if the case is re-worded, re-grouped, retired, or its feature library is reorganized.
- **FR-004**: System MUST support the following lifecycle states for a test case: Draft, Ready, Retired. (Automated/manual and execution outcomes are NOT lifecycle states — they are derived from automation links and release plans respectively.)
- **FR-005**: A test case MUST be editable in exactly one place (the feature library). Edits to a case MUST propagate automatically to every release plan that references it, with zero duplication required.
- **FR-006**: Test cases MUST support structured links to issues, stories, and pull requests in **other repositories within the same GitHub organization**, grouped by link type (namely `bugs`, `stories`, and `prs` — the authoritative enumeration lives in `contracts/test-case.schema.json`). The stored form MUST use the standard `org/repo#number` shorthand so that links render natively on GitHub and can be enriched at dashboard-render time.

**Release test plans**

- **FR-007**: System MUST support authoring a release test plan per release. A release test plan MUST consist of (a) an identifier following the convention `R<N>` for main weekly releases (e.g. `R31`) and `R<N>.<patch>` for patches and hotfixes (e.g. `R31.1`), (b) an optional target date, (c) an in-scope set of test cases **selected by reference** (by case ID) from any feature library, and (d) per-case execution outcomes scoped to this release.
- **FR-008**: A single test case MUST be allowed to appear in multiple release test plans over its lifetime (e.g., regression testing across releases), with each release plan tracking its own execution outcomes for that case.
- **FR-009**: Release test plans MUST reference test cases, never copy their definitions. The canonical case definition lives only in the feature library.
- **FR-010**: Editing a test case in the feature library MUST NOT alter execution outcomes previously recorded in any release plan.
- **FR-011**: System MUST present, per release plan, an aggregated view of: total cases in-scope, counts by priority and type, counts by automation status (automated vs. manual-only), and counts by latest execution outcome (passed, failed, blocked, no result), and the list of linked issues/PRs from other org repos associated with the in-scope cases.
- **FR-012**: System MUST allow stakeholders without write permissions to view any release plan's dashboard and feature library in a read-only mode.

**Automation linkage**

- **FR-013**: System MUST provide a lightweight, documented in-code tagging convention that lets an automated test declare one or more test case IDs it covers (one-line tag above the relevant `describe` or `test` block).
- **FR-014**: System MUST require every automated test to reference at least one existing test case. A test on the main integration branch without a resolvable tag reference MUST be surfaced as a **coverage defect** (an "orphan automation test") on the coverage dashboard, not as a warning.
- **FR-015**: System MUST provide an automated synchronization process that reads the tagging data from the codebase and, for each referenced test case, records (a) the file path(s) of the linked automated tests and (b) the most recent automated execution outcome from the canonical nightly run.
- **FR-016**: The synchronization process MUST be idempotent: running it repeatedly against the same codebase and run results MUST NOT produce duplicate entries or drift any human-owned content.
- **FR-017**: The synchronization process MUST NOT commit changes to human-owned feature library files or release plan files. Automated execution outcomes MUST be written to a separate, bot-owned store so that human authoring and automated status updates never contend for the same file.
- **FR-018**: The synchronization process MUST run at least nightly and MUST also run when changes land on the main integration branch.
- **FR-019**: System MUST surface (as coverage defects on the dashboard) both (a) any tag that references a test case ID that does not exist in any feature library, and (b) any test case whose feature library entry marks it `automation: required` but which has zero tagged test files covering it.
- **FR-020**: System MUST support a single test case being covered by multiple test files, and a single test file covering multiple test cases.

**Dashboard and coverage reporting**

- **FR-021**: System MUST produce, on demand and at least once per nightly run, a dashboard that provides: (a) a landing view listing the current release plus the most recent 8 release plans with headline metrics (cases in-scope, % automated, % passed this release), and a link to a full archive view covering all release plans regardless of age; (b) per-release-plan views with full outcome breakdowns; (c) per-feature views across all cases regardless of release; and (d) a dedicated coverage-defects view listing orphan automation tests and cases with unmet automation requirements. The "recent 8" default exists because releases are cut weekly, so a year-over-year unbounded list would dominate the landing page without this pagination.
- **FR-022**: The dashboard MUST be published on the project's existing GitHub Pages site (the same site used for nightly test reports), without requiring stakeholders to run scripts or install tools.
- **FR-023**: The dashboard MUST render structured cross-repo issue/PR links attached to each test case as navigable links; where feasible, it MUST enrich each link with the target's title and open/closed state fetched at render time.

**Scope and storage**

- **FR-024**: Feature libraries, release test plans, and automation linkage MUST live in the `qa/test-suites` repository, stored as plain-text markdown files that are version-controlled, PR-reviewable, and diffable. No external system or new repository is introduced.
- **FR-025**: Feature libraries MUST be organized in a folder hierarchy that mirrors the existing test code's domain layout under `test-plans/content/features/` (e.g., `test-plans/content/features/communications.md`, `test-plans/content/features/journey/conversion.md`). The `content/` segment separates human-authored markdown from the CLI's source code in the same workspace package.
- **FR-026**: Release test plans MUST be stored as one file per release under `test-plans/content/releases/` (e.g., `test-plans/content/releases/R31.md`, `test-plans/content/releases/R31.1.md` for a patch), referencing cases by stable ID.
- **FR-027**: Users editing test cases or release plans MUST be able to update multiple cases/plans in a single commit (batch edits). The system MUST NOT require a separate commit per state or outcome change.
- **FR-028**: Users without write permissions to the repository MUST be able to consume the dashboard (read-only Pages site) but are not expected to edit test content directly; feedback from non-writers is expected via existing review channels (PR comments, Discussions).
- **FR-029**: Historical fidelity of test case wording at the time a release was executed is NOT stored as a dedicated snapshot. If auditing the historical wording is ever required, it is recovered via standard git history on the feature library file.

**Non-goals (explicitly out of scope for this feature)**

- Replacing or integrating with an existing bug-tracking workflow.
- Migrating historical test execution results from before the system is introduced.
- Custom web UI or bespoke backend service.
- Triggering execution of manual test cases (the system records outcomes, it does not orchestrate manual runs).
- **Automated back-references on linked issues/stories in other `alkem-io/*` repositories.** MVP is forward-only: test cases reference stories/bugs/PRs via front-matter, and those links are rendered on the dashboard. The reverse direction (a bot comment on `alkem-io/client-web#1234` showing which test cases verify the story and their latest outcomes) is deferred to a potential Phase 2 and MUST NOT be implemented as part of MVP.

### Key Entities

- **Feature Library**: A single markdown document per feature, containing the canonical definitions of all test cases for that feature. Human-owned, version-controlled, organized in a folder hierarchy mirroring the existing test code's domain layout. The single source of truth for what a test case "is".
- **Test Case**: A single business scenario to verify (e.g. "user can create a space"). Lives inside its feature library. Attributes: stable ID, title, description/steps/expected outcome, priority, type, optional owner, lifecycle state (Draft / Ready / Retired), automation-requirement flag (`required` | `optional`), structured cross-repo links grouped by type (bugs / stories / PRs). Does NOT store release assignment or execution outcomes directly — both are recorded on release plans.
- **Release Test Plan**: A single markdown document per release. Selects an in-scope subset of test cases **by ID reference** from any feature library, and records per-case execution outcomes for this release only. Attributes: release identifier, optional target date, list of referenced case IDs, per-case outcomes. A single test case can be referenced by many release plans over its lifetime.
- **Automation Link**: A live, computed association between one test case and one automated test file, declared in code via the tagging convention and discovered fresh on each sync. Not persisted as a standalone record.
- **Execution Outcome**: The result of running a test (automated or manual) against a test case, scoped to a specific release. Manual outcomes live on the release test plan document (human-owned). Automated outcomes live in a separate bot-owned store and are joined in at dashboard-render time. Attributes: test case ID, release, outcome (pass / fail / blocked / not-run), timestamp, source (run ID or user), link to evidence.
- **Coverage Defect**: A surfaced discrepancy between test cases and the automation that claims to cover them: an automation test with no tag, a tag referencing a nonexistent case, or a case marked `automation: required` with no tagged tests. Defects appear on the dashboard and are never silently tolerated.
- **Dashboard**: A live-rendered collection of views (landing page with all release plans, per-release views, per-feature views, coverage-defects view) published on the existing GitHub Pages site. Re-renders on each nightly run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A stakeholder who has never used the system can determine a release's automation percentage and pass rate within 30 seconds of opening the dashboard, without assistance.
- **SC-002**: A QA engineer can add a new test case to a feature library AND include it in a release plan in under 2 minutes (editing two files).
- **SC-003**: A QA engineer can batch-record outcomes for 10 test cases in a release plan in a single commit/PR, in under 5 minutes total.
- **SC-003a**: Editing the wording of a test case in a feature library requires touching exactly one file, regardless of how many release plans reference that case.
- **SC-004**: An automation engineer can link a newly-written automated test to an existing test case in under 1 minute (one-line tag) and see the link reflected on the dashboard by the end of the next scheduled sync.
- **SC-005**: The synchronization process completes a full repository scan and outcome-join pass in under 5 minutes against the current test suite size.
- **SC-006**: Running the synchronization process twice in succession produces zero net changes on the second run (idempotency check).
- **SC-007**: For any test case on the dashboard, the QA team can answer "is this covered by automation — can I skip manual retesting?" in under 10 seconds by looking at the test case view.
- **SC-008**: By the end of the first full release cycle after rollout, the "orphan automation tests" count on the coverage report reaches zero, i.e. 100% of automated tests are mapped to a business scenario.
- **SC-009**: QA team reports (qualitative, post-cycle survey) that they spend less time preparing release-readiness status updates than before rollout.
- **SC-010**: MVP (Stories 1 and 2) is shippable within 2 weeks of implementation start; full scope (Stories 1–4) within 4 weeks.

## Assumptions

- The team already uses GitHub for source control and is willing to use the repository itself as the authoritative store of test plan content — no external test management SaaS and no new repository.
- All content (feature libraries, release plans) is stored as plain-text markdown so that all standard source-control benefits (diffs, PR review, blame, branch isolation, git history) apply automatically.
- Test case definitions are written **once per case** in a feature library and **referenced by ID** from any release plan that wants to include them. There is no duplication of case definitions across releases.
- Historical fidelity of case wording at the time of a past release is recovered via `git log` / `git show` on the feature library file, not via embedded snapshots on the release plan. This is acceptable because the QA team is audit-light and the git record is sufficient.
- Updates happen in batches as part of normal QA workflow. Real-time state is provided by the re-rendered dashboard, not by live editing.
- Test cases represent business scenarios (what a stakeholder cares about), not individual automation tests. One case typically maps to several automation tests covering variants. Expected total case count across Alkemio is in the hundreds to low thousands.
- Every automation test is expected to map to at least one test case. An untagged automation test is a coverage defect.
- Cross-repo links use the standard `org/repo#N` shorthand. All repositories being linked are within the same GitHub organization (`alkem-io/*`) and readable to the token used by the dashboard builder.
- Nightly test runs already produce published reports at a stable, linkable URL (existing `003-nightly-server-report` capability). The dashboard extends that same GitHub Pages site rather than standing up a new one.
- The authoritative source of automated execution outcomes is the canonical nightly run, not ad-hoc local runs or PR-triggered partial runs.
- Test case identifiers are assigned monotonically at creation time and never reused, even after retirement.
- There is a single QA engineer maintaining the feature libraries and release plans at this time, so multi-editor merge conflicts are not a relevant concern for the initial design.
- Alkemio ships on a **weekly release cadence**. Release plan files accumulate at ~52 per year; the landing view is therefore paginated to the current + most recent 8 releases by default, with a full archive accessible via a secondary link.
- Release identifiers follow the convention `R<N>` for main weekly releases and `R<N>.<patch>` for patches/hotfixes (e.g. `R31`, `R31.1`, `R31.2`). These strings are used verbatim as file names and URL segments — no translation between a display name and a filesystem name.
- Test case content will typically be **drafted using an AI assistant and then reviewed and adjusted by the QA engineer**, not hand-typed from scratch. The schemas and file shapes MUST therefore be simple enough that an AI can produce a valid feature library or release plan on first draft. The `validate` command is the primary feedback loop for review; it MUST produce human-readable errors that pinpoint the exact line and reason for rejection.
- Permissions reuse GitHub's existing repo-level permissions. No custom role model is introduced.
- The phrase **"main integration branch"** in FR-014 and FR-018 refers to `develop` — the repo's primary working branch into which feature PRs are merged. Tasks and the workflow in `plan.md` hard-code `develop`; the spec uses the generic phrase only to avoid coupling requirements to a branch name that could theoretically be renamed.
