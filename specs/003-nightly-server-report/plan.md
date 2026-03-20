# Implementation Plan: Nightly Server-API Test Report

**Branch**: `003-nightly-server-report` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-nightly-server-report/spec.md`

## Summary

Create a GitHub Actions workflow (`nightly-server-tests.yml`) that runs the server-API Vitest nightly suite, collects the HTML report, and publishes it to GitHub Pages — mirroring the existing "Nightly Playwright" workflow pattern. The workflow uses a two-job structure (test + deploy) with incremental report accumulation on the `gh-pages` branch and a summary index page.

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow), Bash (shell steps)
**Primary Dependencies**: Vitest HTML reporter (already configured), `deploy-github-pages.yml` reusable workflow, `pnpm/action-setup@v4`, `actions/setup-node@v6`, `actions/checkout@v5`
**Storage**: `gh-pages` branch under `gh-pages-root/vitest/` directory
**Testing**: Manual `workflow_dispatch` trigger; validation by inspecting published GitHub Pages
**Target Platform**: GitHub Actions (`arc-runner-set` runner)
**Project Type**: CI/CD workflow — single YAML file plus index generation shell scripts
**Performance Goals**: N/A (CI workflow, not user-facing application)
**Constraints**: Must coexist with existing Playwright reports on `gh-pages`; must not modify `deploy-github-pages.yml`
**Scale/Scope**: Single workflow file; ~200 lines of YAML mirroring existing pattern

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Specification & Traceability | PASS | Spec exists at `specs/003-nightly-server-report/spec.md` with numbered FR/SC requirements |
| II. GraphQL Schema Contract | N/A | This feature does not modify or add GraphQL tests — it adds reporting infrastructure |
| III. Stable Environments | PASS | Workflow uses same env vars and runner as existing client-web workflow; user registration handled by Vitest globalSetup |
| IV. Observability & Structured Reporting | PASS | This feature directly implements structured reporting (HTML reports with metadata, historical index) per this principle |
| V. Semantic Versioning & Simplicity | PASS | No new dependencies added; reuses existing `deploy-github-pages.yml`; lean implementation mirroring proven pattern |
| Quality Gates - Security | PASS | No secrets committed; env vars passed via GitHub secrets/variables |
| Quality Gates - Data Management | PASS | Reports namespaced by date/run_id; no cross-run data leakage |

All gates pass. No violations to justify.

### Post-Phase 1 Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Specification & Traceability | PASS | Plan, research, data-model, quickstart all produced |
| IV. Observability & Structured Reporting | PASS | Data model defines structured report layout with metadata files; index page enables trend analysis |
| V. Semantic Versioning & Simplicity | PASS | Single new file, no new dependencies, no config changes |

All gates still pass after design phase.

## Project Structure

### Documentation (this feature)

```text
specs/003-nightly-server-report/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technical research
├── data-model.md        # Phase 1: gh-pages directory structure
├── quickstart.md        # Phase 1: how to use the workflow
├── contracts/           # Phase 1: N/A (no API contracts)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
.github/workflows/
├── nightly-server-tests.yml    # NEW — the primary deliverable
├── nightly-client-tests.yml    # EXISTING — reference pattern (unchanged)
├── deploy-github-pages.yml     # EXISTING — reusable deploy workflow (unchanged)
└── nightly-build-trigger.yml   # EXISTING — cron trigger (unchanged)
```

**Structure Decision**: This feature adds a single workflow file (`.github/workflows/nightly-server-tests.yml`) to the repository. No changes to existing files. The workflow produces artifacts on the `gh-pages` branch under `gh-pages-root/vitest/`.
