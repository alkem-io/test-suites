# Implementation Plan: QA Test Plan Management System

**Branch**: `004-qa-test-plans` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-qa-test-plans/spec.md`

## Summary

Add a new pnpm workspace package `test-plans/` that holds QA-owned markdown content (feature libraries and release plans) alongside a TypeScript CLI that scans the test codebase for `@testCase` tags, joins their latest automated outcomes with the content, and renders a static dashboard to GitHub Pages under `gh-pages-root/test-plans/`. A new GitHub Actions workflow runs the CLI post-nightly and on pushes to `develop`, publishing the dashboard and appending per-run automated outcomes to `gh-pages` (never committing to main). Cross-repo links in case front-matter are rendered as enriched GitHub links via `@octokit/rest` at build time. No new infrastructure; reuses `deploy-github-pages.yml`.

## Technical Context

**Language/Version**: TypeScript ~5.7.3, Node.js 20.9.0 (Volta) — consistent with the rest of the repo.
**Primary Dependencies**:
- `gray-matter` — YAML front-matter parser for markdown case and release plan files.
- `markdown-it` — markdown → HTML rendering for dashboard body content.
- `@octokit/rest` (+ `@octokit/plugin-throttling`) — fetch title/state for cross-repo issue/PR links.
- `glob` — recursive file discovery for feature libraries, release plans, and test source scanning.
- `ejs` — minimal HTML templating for dashboard views.
- Vitest (already present) — unit tests for the sync/build CLI itself.
**Storage**:
- Human-owned content: markdown under `test-plans/content/features/**.md` and `test-plans/content/releases/*.md` on the repo's working branch (typically `develop`).
- Bot-owned automated outcomes: JSON appended to the `gh-pages` branch under `gh-pages-root/test-plans/runs/server-api/<date>.json` — **never** committed back to a working branch.
- Rendered dashboard: static HTML/CSS under `gh-pages-root/test-plans/` on `gh-pages`.
**Testing**: Vitest unit tests for tag parsing, front-matter validation, outcome-join logic, and dashboard fragment rendering. Manual validation of the published Pages site during initial rollout.
**Target Platform**: GitHub Actions (`arc-runner-set`) for sync/build; GitHub Pages (static site) for consumption.
**Project Type**: New workspace package (single project) layered on top of existing `lib/`, `server-api/`, `client-web/` monorepo structure.
**Performance Goals**: Full sync + build pass in under 5 minutes against the current test suite size (SC-005). Dashboard page load well under 3 seconds (static HTML, cached assets). GitHub API rate-limit headroom: stay under 5000 req/hour by paging and caching issue metadata per build.
**Constraints**:
- MUST be idempotent — two consecutive runs produce zero net change (SC-006).
- MUST NOT commit to human-owned markdown files under `test-plans/content/`.
- MUST tolerate missing nightly run output (dashboard renders with "no result yet" states).
- MUST tolerate unreachable cross-repo links (render as plain link, do not fail the build).
- MUST coexist with existing `playwright/` and `vitest/` subtrees on `gh-pages`.
**Scale/Scope**:
- ~20–50 feature library files, ~5–20 release plan files, hundreds to low thousands of test cases in total.
- CLI codebase: ~1500–2500 LOC TypeScript + templates.
- One new workflow file (~150 lines YAML).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Specification & Traceability | PASS | Spec at `specs/004-qa-test-plans/spec.md` with numbered FR-001…FR-029 and SC-001…SC-010. Tasks (`T-###`) will be generated in `/speckit.tasks` referencing those IDs. |
| II. GraphQL Schema Contract | N/A | Feature adds QA process tooling; does not modify or add GraphQL operation tests. |
| III. Stable Environments & Controlled Determinism | PASS | CLI operates on static files (markdown + JSON). No live server dependency for its own execution. Deterministic given the same inputs. |
| IV. Observability & Structured Reporting | STRONGLY ALIGNED | This feature *is* the observability layer for the QA process — structured per-case outcomes, versioned test plans, a dashboard as the feedback artifact. |
| V. Semantic Versioning & Simplicity | PASS | Four small, well-chosen dependencies, each justified. No custom build/SSG framework — plain EJS + markdown-it. Reuses existing `deploy-github-pages.yml`. |
| Quality Gates — Performance | PASS | SC-005 bounds full sync + build under 5 minutes; static dashboard has trivial runtime. |
| Quality Gates — Security | PASS | No new secrets committed. GitHub API reads use a workflow-scoped token (`GITHUB_TOKEN`) with read-only access to the `alkem-io` org. Cross-repo link enrichment gracefully degrades if the token lacks access. No Phase 2 back-reference writes in MVP. |
| Quality Gates — Data Management | PASS | Human and bot content strictly partitioned by branch: working-branch markdown is human-owned and PR-reviewed; `gh-pages` holds run JSON and rendered artifacts written only by the workflow. No cross-contamination. |

All gates pass. No violations to justify.

### Post-Phase 1 Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Specification & Traceability | PASS | plan, research, data-model, contracts, quickstart all produced under `specs/004-qa-test-plans/`. |
| IV. Observability & Structured Reporting | PASS | Data model defines structured per-run JSON schema (`contracts/run-summary.schema.json`) and case schema (`contracts/test-case.schema.json`); dashboard views specified in data-model. |
| V. Semantic Versioning & Simplicity | PASS | Design confirms a single workspace package with 6 narrowly-scoped runtime dependencies (`gray-matter`, `markdown-it`, `@octokit/rest`, `@octokit/plugin-throttling`, `glob`, `ejs`). Each is load-bearing and single-purpose; the plan deliberately rejected heavier options (Astro, 11ty, React, custom SSG) in favor of plain EJS + markdown-it. No redundant deps. |

All gates still pass after design phase.

## Project Structure

### Documentation (this feature)

```text
specs/004-qa-test-plans/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technical research / resolved unknowns
├── data-model.md        # Phase 1: content schemas, directory layout, dashboard views
├── quickstart.md        # Phase 1: how a QA engineer authors, tags, runs locally
├── contracts/
│   ├── test-case.schema.json       # JSON Schema for feature library front-matter
│   ├── release-plan.schema.json    # JSON Schema for release plan front-matter + outcomes
│   ├── run-summary.schema.json     # JSON Schema for bot-owned runs/<date>.json
│   └── tag-format.md               # Normative grammar for the @testCase in-code tag
├── checklists/
│   └── requirements.md             # Spec quality checklist (already passing)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
.github/workflows/
├── test-plans-sync.yml               # NEW — runs CLI, publishes dashboard + runs to gh-pages
├── nightly-server-tests.yml          # EXISTING (from spec 003) — triggers test-plans-sync after success
├── nightly-client-tests.yml          # EXISTING — unchanged
└── deploy-github-pages.yml           # EXISTING — reused for publishing (unchanged)

test-plans/                           # NEW workspace package
├── package.json                      # @alkemio/test-plans (private)
├── tsconfig.json
├── vitest.config.ts
├── README.md                         # QA-authoring guide (links to quickstart)
├── content/                          # HUMAN-OWNED
│   ├── features/
│   │   ├── communications.md         # example: TC-001…TC-040 for communications
│   │   ├── journey/
│   │   │   └── conversion.md         # example: TC-100…TC-150 for space conversion
│   │   └── ...                       # one file per feature domain
│   └── releases/
│       ├── R31.md                    # example release test plan (weekly release)
│       └── R31.1.md                  # example patch release plan
├── src/
│   ├── cli.ts                        # entry: `pnpm --filter @alkemio/test-plans run build`
│   ├── parse/
│   │   ├── feature-library.ts        # parse content/features/**.md → TestCase[]
│   │   ├── release-plan.ts           # parse content/releases/*.md → ReleasePlan[]
│   │   └── code-tags.ts              # scan server-api/**/*.it-spec.ts + client-web/**/*.spec.ts for @testCase
│   ├── join/
│   │   ├── outcomes.ts               # merge bot-owned runs JSON → per-case latest outcome
│   │   └── coverage-defects.ts       # compute orphans, missing-required, stale refs
│   ├── enrich/
│   │   └── github-links.ts           # octokit calls for title/state of alkem-io/*#N links
│   ├── render/
│   │   ├── dashboard.ts              # EJS templates → static HTML
│   │   └── templates/
│   │       ├── layout.ejs
│   │       ├── landing.ejs           # all release plans overview
│   │       ├── release.ejs           # per-release view
│   │       ├── feature.ejs           # per-feature library view
│   │       └── defects.ejs           # coverage-defects view
│   ├── write/
│   │   └── run-summary.ts            # append runs/server-api/<date>.json to gh-pages checkout
│   └── types.ts                      # shared interfaces (TestCase, ReleasePlan, Outcome, ...)
├── test/                             # vitest unit tests for the CLI
│   ├── parse.spec.ts
│   ├── join.spec.ts
│   └── render.spec.ts
└── dist/                             # build output (gitignored)

# EXISTING — referenced, not modified
lib/                                  # @alkemio/tests-lib (unchanged)
server-api/                           # test suites that will grow @testCase tags over time
client-web/                           # test suites that will grow @testCase tags over time
pnpm-workspace.yaml                   # CHANGED — add "test-plans" to packages list
```

**Structure Decision**: This feature adds exactly one new workspace package, `test-plans/`, and one new workflow file, `.github/workflows/test-plans-sync.yml`. Existing packages (`lib/`, `server-api/`, `client-web/`) are untouched at the structural level. The only cross-cutting change to existing source is the gradual introduction of `@testCase TC-###` JSDoc tags above relevant `describe`/`test` blocks in `server-api/src/functional-api/**` and `client-web/src/functional-e2e/**` — added incrementally, not as a single mass edit.

## Complexity Tracking

No constitution gates violated. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)*  | *(n/a)*    | *(n/a)*                              |
